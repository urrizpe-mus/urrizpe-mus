import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Crown, Download, Plus, Search, Trash2, Users } from 'lucide-react';
import type { Championship } from '../../domain/types';
import { championOf } from '../../domain/bracket';
import { normalize, pairLabel } from '../../domain/pairs';
import { formatDate, useT } from '../../i18n';
import { backupToJson, createBackup, downloadText } from '../../io/backup';
import { useApp } from '../../state/app';
import { Badge, Button, Card, EmptyState, Input, PageHeader } from '../components/ui';
import { ConfirmDialog } from '../components/shared';

export function championshipPhase(c: Championship): 'registration' | 'preview' | 'inProgress' | 'finished' {
  if (c.drawStatus === 'none') return 'registration';
  if (c.drawStatus === 'preview') return 'preview';
  return c.bracket && championOf(c.bracket) ? 'finished' : 'inProgress';
}

export function ChampionshipCard({ ch, onDelete }: { ch: Championship; onDelete?: () => void }) {
  const m = useT();
  const phase = championshipPhase(ch);
  const champ = ch.bracket && ch.drawStatus === 'confirmed' ? championOf(ch.bracket) : null;
  const champPair = champ ? ch.pairs.find((p) => p.id === champ) : undefined;
  const played = ch.bracket?.matches.filter((x) => x.winner).length ?? 0;
  const total = ch.bracket?.matches.length ?? 0;
  return (
    <Card as="article" className="group relative flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/c/${ch.id}`} className="min-w-0 after:absolute after:inset-0 after:rounded-2xl">
          <h3 className="truncate text-xl font-semibold">{ch.name}</h3>
        </Link>
        <Badge tone={phase === 'finished' ? 'dark' : phase === 'inProgress' ? 'green' : phase === 'preview' ? 'gold' : 'neutral'}>
          {phase === 'finished' ? m.status.finished : phase === 'inProgress' ? m.status.inProgress : phase === 'preview' ? m.status.draw.preview : m.status.registration}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={15} /> {formatDate(ch.date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={15} /> {m.list.pairsCount(ch.pairs.length)}
        </span>
      </div>
      {total > 0 && ch.drawStatus === 'confirmed' && (
        <div className="h-1.5 overflow-hidden rounded-full bg-ink-800/8" aria-label={`${played}/${total}`}>
          <div className="h-full rounded-full bg-gradient-to-r from-bottle-600 to-gold-500" style={{ width: `${(played / total) * 100}%` }} />
        </div>
      )}
      {champPair && (
        <p className="flex items-center gap-2 text-sm font-semibold text-gold-700">
          <Crown size={16} /> {champPair.number} · {pairLabel(champPair)}
        </p>
      )}
      {onDelete && (
        <div className="relative z-10 flex justify-end">
          <Button size="sm" variant="ghost" className="text-wine-600" icon={<Trash2 size={15} />} onClick={onDelete}>
            {m.common.delete}
          </Button>
        </div>
      )}
    </Card>
  );
}

export function ChampionshipsPage() {
  const m = useT();
  const { repo, toast } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState<Championship[] | null>(null);
  const [q, setQ] = useState('');
  const [toDelete, setToDelete] = useState<Championship | null>(null);
  const load = () => repo.list().then(setItems, () => setItems([]));
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);
  const filtered = useMemo(() => (items ?? []).filter((c) => normalize(c.name).includes(normalize(q))), [items, q]);

  return (
    <div>
      <PageHeader
        title={m.list.title}
        subtitle={m.list.subtitle}
        actions={
          <>
            {!!items?.length && (
              <Button variant="outline" icon={<Download size={18} />} onClick={() => downloadText(backupToJson(createBackup(items)), `urrizpe-mus_copia_${new Date().toISOString().slice(0, 10)}.json`)}>
                {m.list.exportAll}
              </Button>
            )}
            <Button icon={<Plus size={18} />} onClick={() => navigate('/nuevo')}>
              {m.nav.newChampionship}
            </Button>
          </>
        }
      />
      {!!items?.length && (
        <div className="relative mb-4 max-w-md">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
          <Input className="pl-10" placeholder={m.list.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} aria-label={m.common.search} />
        </div>
      )}
      {items === null ? (
        <p className="text-ink-500">{m.app.loading}</p>
      ) : !items.length ? (
        <EmptyState title={m.home.empty} action={<Button onClick={() => navigate('/nuevo')}>{m.home.create}</Button>} />
      ) : !filtered.length ? (
        <EmptyState title={m.list.none} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <ChampionshipCard key={c.id} ch={c} onDelete={() => setToDelete(c)} />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!toDelete}
        title={m.list.deleteTitle}
        danger
        confirmLabel={m.list.deleteConfirm}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await repo.remove(toDelete.id);
          setToDelete(null);
          toast(m.list.deleted);
          void load();
        }}
      >
        {toDelete && m.list.deleteText(toDelete.name)}
      </ConfirmDialog>
    </div>
  );
}
