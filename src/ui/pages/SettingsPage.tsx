import { useEffect, useRef, useState } from 'react';
import { Database, Download, Info, Lock, Smartphone, Trash2, Upload, WifiOff, FileUp } from 'lucide-react';
import { cloneAsNew } from '../../domain/championship';
import type { Championship } from '../../domain/types';
import { useT } from '../../i18n';
import { backupToJson, createBackup, downloadText, ImportError, parseBackup, MAX_IMPORT_BYTES } from '../../io/backup';
import { requestPersistentStorage } from '../../storage/indexeddb';
import { useApp } from '../../state/app';
import { isIos, useInstallPrompt } from '../../state/pwa';
import { Badge, Button, Card, Modal, Notice, PageHeader, Switch, cn } from '../components/ui';
import { TypedConfirm } from '../components/shared';
import { Logo } from '../brand/Logo';

declare const __APP_VERSION__: string;
const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

/** Diálogo de importación: valida el archivo y pide confirmación antes de sobrescribir. */
export function ImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: () => void }) {
  const m = useT();
  const { repo, toast } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<{ list: Championship[]; existing: Set<string> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'overwrite' | 'copy'>('copy');

  const reset = () => {
    setParsed(null);
    setError(null);
    setMode('copy');
    if (input.current) input.current.value = '';
  };
  const close = () => {
    reset();
    onClose();
  };

  const onFile = async (file: File | undefined) => {
    setError(null);
    setParsed(null);
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) return setError('El archivo es demasiado grande.');
    try {
      const list = parseBackup(await file.text());
      const existing = new Set<string>();
      for (const c of list) if (await repo.get(c.id)) existing.add(c.id);
      setParsed({ list, existing });
    } catch (e) {
      setError(e instanceof ImportError ? e.message : m.errors.generic);
    }
  };

  const doImport = async () => {
    if (!parsed) return;
    try {
      for (const c of parsed.list) {
        if (!parsed.existing.has(c.id)) await repo.overwrite({ ...c, revision: 0 });
        else if (mode === 'overwrite') await repo.overwrite(c);
        else await repo.save(cloneAsNew(c), null);
      }
      toast(m.settings.importDone(parsed.list.length));
      onDone?.();
      close();
    } catch {
      toast(m.errors.storage, 'error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={m.settings.importTitle}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {m.common.cancel}
          </Button>
          <Button disabled={!parsed} variant={parsed && parsed.existing.size && mode === 'overwrite' ? 'danger' : 'primary'} onClick={doImport}>
            {m.settings.importDo}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-bottle-900/20 bg-white/60 px-4 py-8 text-center hover:border-bottle-600/50">
          <FileUp size={30} className="text-gold-600" />
          <span className="font-semibold text-bottle-900">{m.settings.importBackup}</span>
          <span className="text-xs text-ink-500">.json</span>
          <input ref={input} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} data-testid="import-file" />
        </label>
        {error && <Notice tone="wine">{error}</Notice>}
        {parsed && (
          <>
            <p className="text-sm font-semibold text-ink-700">{m.settings.importFound(parsed.list.length)}</p>
            <ul className="flex flex-col gap-1.5">
              {parsed.list.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm">
                  <span className="truncate font-semibold">{c.name}</span>
                  <Badge tone={parsed.existing.has(c.id) ? 'gold' : 'green'}>{parsed.existing.has(c.id) ? m.settings.importExists : m.settings.importNew}</Badge>
                </li>
              ))}
            </ul>
            {parsed.existing.size > 0 && (
              <div className="flex flex-col gap-2">
                {(['copy', 'overwrite'] as const).map((o) => (
                  <label key={o} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2.5', mode === o ? 'border-bottle-700 bg-bottle-50' : 'border-bottle-900/10')}>
                    <input type="radio" name="import-mode" checked={mode === o} onChange={() => setMode(o)} className="accent-bottle-700" />
                    <span className="text-[15px] font-semibold">{o === 'copy' ? m.settings.importCopy : m.settings.importOverwrite}</span>
                  </label>
                ))}
                {mode === 'overwrite' && <Notice tone="wine">{m.settings.importOverwriteWarn}</Notice>}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card as="section" className="p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <span className="text-gold-600">{icon}</span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

export function SettingsPage() {
  const m = useT();
  const { settings, updateSettings, repo, toast } = useApp();
  const install = useInstallPrompt();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);

  useEffect(() => {
    void requestPersistentStorage().then(setPersisted);
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader title={m.settings.title} />

      <Section icon={<Info size={20} />} title={m.settings.preferences}>
        <div className="mb-2 flex items-center justify-between gap-4 py-2">
          <span className="text-[15px]">{m.settings.language}</span>
          <select
            className="h-11 rounded-xl border border-bottle-900/15 bg-white px-3 text-[16px]"
            value={settings.language}
            onChange={(e) => updateSettings({ language: e.target.value as 'es' })}
            aria-label={m.settings.language}
          >
            <option value="es">{m.settings.languageEs}</option>
            <option value="eu" disabled>
              {m.settings.languageEu}
            </option>
          </select>
        </div>
        <Switch checked={settings.confirmWinner} onChange={(v) => updateSettings({ confirmWinner: v })} label={m.settings.confirmWinner} />
        <Switch checked={settings.drawAnimation} onChange={(v) => updateSettings({ drawAnimation: v })} label={m.settings.drawAnimation} />
      </Section>

      <Section icon={<Database size={20} />} title={m.settings.data}>
        <p className="text-sm leading-relaxed text-ink-600">{m.settings.dataText}</p>
        {persisted !== null && (
          <div className="mt-3">
            <Notice tone={persisted ? 'green' : 'gold'}>{persisted ? m.settings.persisted : m.settings.notPersisted}</Notice>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            icon={<Download size={18} />}
            onClick={async () => {
              const all = await repo.list();
              downloadText(backupToJson(createBackup(all)), `urrizpe-mus_copia_${new Date().toISOString().slice(0, 10)}.json`);
            }}
          >
            {m.settings.exportAll}
          </Button>
          <Button variant="outline" icon={<Upload size={18} />} onClick={() => setImportOpen(true)}>
            {m.settings.importBackup}
          </Button>
        </div>
      </Section>

      <Section icon={<Smartphone size={20} />} title={m.settings.install}>
        <p className="text-sm text-ink-600">{m.settings.installText}</p>
        <div className="mt-3">
          {install.installed ? (
            <Notice tone="green">{m.settings.installed}</Notice>
          ) : install.canInstall ? (
            <Button icon={<Smartphone size={18} />} onClick={() => install.install()}>
              {m.settings.installButton}
            </Button>
          ) : (
            <Notice tone="gold">{isIos() ? m.settings.installIos : m.settings.installOther}</Notice>
          )}
        </div>
      </Section>

      <Section icon={<WifiOff size={20} />} title={m.settings.offline}>
        <p className="text-sm leading-relaxed text-ink-600">{m.settings.offlineText}</p>
      </Section>

      <Section icon={<Lock size={20} />} title={m.settings.security}>
        <p className="text-sm leading-relaxed text-ink-600">{m.settings.securityText}</p>
      </Section>

      <Section icon={<Info size={20} />} title={m.settings.about}>
        <div className="flex items-center justify-between gap-3">
          <Logo size={44} />
          <span className="text-sm text-ink-500">{m.settings.version(VERSION)}</span>
        </div>
      </Section>

      <Card as="section" className="border-wine-600/30 p-4 sm:p-5">
        <h2 className="mb-2 text-lg font-semibold text-wine-700">{m.settings.danger}</h2>
        <Button variant="danger" icon={<Trash2 size={18} />} onClick={() => setWipeOpen(true)}>
          {m.settings.deleteAll}
        </Button>
      </Card>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <TypedConfirm
        open={wipeOpen}
        title={m.settings.deleteAllTitle}
        text={m.settings.deleteAllText}
        word={m.settings.deleteAllWord}
        confirmLabel={m.settings.deleteAll}
        onClose={() => setWipeOpen(false)}
        onConfirm={async () => {
          for (const c of await repo.list()) await repo.remove(c.id);
          setWipeOpen(false);
          toast(m.settings.deletedAll);
        }}
      />
    </div>
  );
}
