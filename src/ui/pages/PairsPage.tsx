import { useMemo, useState } from 'react';
import { ClipboardList, Lock, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { addPairs, isLocked, removePair, updatePair } from '../../domain/championship';
import { matchesSearch } from '../../domain/pairs';
import type { Pair } from '../../domain/types';
import type { PairStatus } from '../../domain/standings';
import { useT } from '../../i18n';
import { useChampionship } from '../../state/championship';
import { PairLine, StatusBadge, useProgress } from '../components/pair';
import { ConfirmDialog, PairDialog, PasteDialog } from '../components/shared';
import { Button, Card, EmptyState, Input, Notice, PageHeader, cn } from '../components/ui';

export function PairsPage() {
  const m = useT();
  const { championship: ch, apply } = useChampionship();
  const progress = useProgress(ch);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | PairStatus>('all');
  const [editing, setEditing] = useState<Pair | null>(null);
  const [adding, setAdding] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [removing, setRemoving] = useState<Pair | null>(null);
  const locked = isLocked(ch);

  const statuses = useMemo(() => {
    const set = new Set<PairStatus>();
    progress.forEach((p) => set.add(p.status));
    return [...set];
  }, [progress]);

  const list = ch.pairs
    .filter((p) => matchesSearch(p, q))
    .filter((p) => filter === 'all' || progress.get(p.id)?.status === filter)
    .sort((a, b) => a.number - b.number);

  return (
    <div>
      <PageHeader
        title={m.pairsPage.title}
        subtitle={m.pairsPage.subtitle(ch.pairs.length)}
        actions={
          !locked && (
            <>
              <Button variant="outline" icon={<ClipboardList size={18} />} onClick={() => setPasting(true)}>
                {m.pairsPage.addMany}
              </Button>
              <Button icon={<Plus size={18} />} onClick={() => setAdding(true)}>
                {m.pairsPage.add}
              </Button>
            </>
          )
        }
      />
      <div className="mb-4 flex flex-col gap-3">
        {locked && (
          <Notice tone="gold" icon={<Lock size={17} />}>
            {m.pairsPage.locked}
          </Notice>
        )}
        {ch.drawStatus === 'preview' && <Notice tone="gold">{m.pairsPage.previewWarning}</Notice>}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-400" />
            <Input className="pl-10" placeholder={m.pairsPage.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} aria-label={m.common.search} />
          </div>
          {statuses.length > 1 && (
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {(['all', ...statuses] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={cn('h-9 shrink-0 rounded-full px-3.5 text-sm font-bold', filter === s ? 'bg-bottle-800 text-cream-50' : 'bg-cream-50 text-bottle-900 ring-1 ring-bottle-900/12')}
                >
                  {s === 'all' ? m.pairsPage.filterAll : m.status[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!ch.pairs.length ? (
        <EmptyState
          icon={<Users size={40} />}
          title={m.pairsPage.empty}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button icon={<Plus size={18} />} onClick={() => setAdding(true)}>
                {m.pairsPage.add}
              </Button>
              <Button variant="outline" icon={<ClipboardList size={18} />} onClick={() => setPasting(true)}>
                {m.pairsPage.addMany}
              </Button>
            </div>
          }
        />
      ) : !list.length ? (
        <EmptyState title={m.pairsPage.noResults} />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((p) => (
            <Card as="li" key={p.id} className="flex items-center gap-2 py-2.5 pr-2 pl-3">
              <PairLine pair={p} className="flex-1" />
              <StatusBadge status={progress.get(p.id)?.status ?? 'registered'} />
              <Button size="sm" variant="ghost" aria-label={`${m.common.edit} ${p.number}`} onClick={() => setEditing(p)} icon={<Pencil size={16} />} />
              {!locked && <Button size="sm" variant="ghost" className="text-wine-600" aria-label={`${m.common.delete} ${p.number}`} onClick={() => setRemoving(p)} icon={<Trash2 size={16} />} />}
            </Card>
          ))}
        </ul>
      )}

      <PairDialog
        open={!!editing}
        title={editing ? m.pairsPage.editTitle(editing.number) : ''}
        initial={editing ? { name: editing.name, player1: editing.player1, player2: editing.player2 } : undefined}
        note={ch.drawStatus !== 'none' ? m.pairsPage.editAfterDraw : undefined}
        onClose={() => setEditing(null)}
        onSubmit={async (input) => !!(await apply((c) => updatePair(c, editing!.id, input), m.pairsPage.saved))}
      />
      <PairDialog
        open={adding}
        title={m.pairsPage.addTitle}
        note={ch.drawStatus === 'preview' ? m.pairsPage.previewWarning : undefined}
        onClose={() => setAdding(false)}
        onSubmit={async (input) => !!(await apply((c) => addPairs(c, [input]), m.pairsPage.added(1)))}
      />
      <PasteDialog open={pasting} onClose={() => setPasting(false)} onAdd={async (pairs) => !!(await apply((c) => addPairs(c, pairs), m.pairsPage.added(pairs.length)))} />
      <ConfirmDialog
        open={!!removing}
        title={removing ? m.pairsPage.deleteTitle(removing.number) : ''}
        danger
        confirmLabel={m.common.delete}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (removing && (await apply((c) => removePair(c, removing.id), m.pairsPage.removed))) setRemoving(null);
        }}
      >
        <p>{m.pairsPage.deleteText}</p>
        {ch.drawStatus === 'preview' && <p className="mt-2 font-semibold text-wine-700">{m.pairsPage.deletePreview}</p>}
      </ConfirmDialog>
    </div>
  );
}
