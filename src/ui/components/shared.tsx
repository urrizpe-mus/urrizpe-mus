import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import type { RoundPlan } from '../../domain/types';
import { parsePairLines, pairInputErrors, type PairInput } from '../../domain/pairs';
import { roundName, useT } from '../../i18n';
import { Button, Field, Input, Modal, Notice, Textarea, cn } from './ui';

/** Resumen de rondas: entrantes, partidos y pases directos. */
export function PlanSummary({ rounds, compact = false }: { rounds: RoundPlan[]; compact?: boolean }) {
  const m = useT();
  const total = rounds.reduce((s, r) => s + r.matches, 0);
  return (
    <div>
      <ol className={cn('grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3')}>
        {rounds.map((r) => (
          <li
            key={r.index}
            className={cn('flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5', r.kind === 'prelim' ? 'border-gold-500/40 bg-gold-100/40' : 'border-bottle-900/10 bg-white/70')}
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-bottle-900">{roundName(m, r, rounds)}</p>
              <p className="text-xs text-ink-500">
                {m.plan.entrants(r.entrants)} → {r.target === 1 ? '1' : r.target}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-ink-800">{m.plan.matches(r.matches)}</p>
              {r.byes > 0 && <p className="text-xs font-semibold text-gold-700">{m.plan.byes(r.byes)}</p>}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-right text-xs font-semibold text-ink-500">{m.plan.totalMatches(total)}</p>
    </div>
  );
}

/** Formulario de una pareja (añadir o editar). */
export function PairDialog({
  open,
  title,
  initial,
  note,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial?: PairInput;
  note?: string;
  onClose: () => void;
  onSubmit: (input: PairInput) => Promise<boolean> | boolean;
}) {
  const m = useT();
  const [form, setForm] = useState<PairInput>(initial ?? { name: '', player1: '', player2: '' });
  const [touched, setTouched] = useState(false);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm(initial ?? { name: '', player1: '', player2: '' });
      setTouched(false);
    }
  }
  const errors = pairInputErrors(form);
  const submit = async () => {
    setTouched(true);
    if (errors.length) return;
    if (await onSubmit(form)) onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {m.common.cancel}
          </Button>
          <Button onClick={submit}>{m.common.save}</Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label={m.create.player1} htmlFor="pd-p1" error={touched && !form.player1.trim() ? errors[0] : undefined}>
          <Input id="pd-p1" autoComplete="off" value={form.player1} onChange={(e) => setForm({ ...form, player1: e.target.value })} maxLength={60} />
        </Field>
        <Field label={m.create.player2} htmlFor="pd-p2" error={touched && !form.player2.trim() ? errors[errors.length - 1] : undefined}>
          <Input id="pd-p2" autoComplete="off" value={form.player2} onChange={(e) => setForm({ ...form, player2: e.target.value })} maxLength={60} />
        </Field>
        <Field label={m.create.pairName} htmlFor="pd-name">
          <Input id="pd-name" autoComplete="off" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} />
        </Field>
        {note && <Notice tone="green">{note}</Notice>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/** Pegar una lista de parejas (una por línea). */
export function PasteDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (pairs: PairInput[]) => Promise<boolean> | boolean }) {
  const m = useT();
  const [text, setText] = useState('');
  const parsed = parsePairLines(text);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={m.create.pasteTitle}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {m.common.cancel}
          </Button>
          <Button
            disabled={!parsed.pairs.length}
            icon={<ClipboardList size={18} />}
            onClick={async () => {
              if (await onAdd(parsed.pairs)) {
                setText('');
                onClose();
              }
            }}
          >
            {m.create.pasteAdd(parsed.pairs.length)}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-600">{m.create.pasteHelp}</p>
        <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Lloyd y HB\nAratz y Egoitz'} aria-label={m.create.pasteTitle} />
        {parsed.invalid.length > 0 && (
          <Notice tone="wine">
            <p className="font-semibold">{m.create.pasteInvalid(parsed.invalid.length)}</p>
            <p className="mt-1 truncate">{parsed.invalid.slice(0, 3).join(' · ')}</p>
          </Notice>
        )}
      </div>
    </Modal>
  );
}

/** Confirmación que obliga a escribir una palabra (operaciones destructivas). */
export function TypedConfirm({
  open,
  title,
  text,
  word,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  text: string;
  word: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const m = useT();
  const [value, setValue] = useState('');
  const close = () => {
    setValue('');
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {m.common.cancel}
          </Button>
          <Button
            variant="danger"
            disabled={value.trim().toUpperCase() !== word}
            onClick={() => {
              setValue('');
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Notice tone="wine">{text}</Notice>
        <Field label={m.drawPage.typeToConfirm(word)} htmlFor="typed-confirm">
          <Input id="typed-confirm" autoComplete="off" autoCapitalize="characters" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const m = useT();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {m.common.cancel}
          </Button>
          <Button data-autofocus variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[15px] leading-relaxed text-ink-700">{children}</div>
    </Modal>
  );
}
