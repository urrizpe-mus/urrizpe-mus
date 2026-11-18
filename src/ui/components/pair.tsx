import { useMemo } from 'react';
import type { Championship, Pair } from '../../domain/types';
import { pairProgressMap, type PairStatus } from '../../domain/standings';
import { playersLabel } from '../../domain/pairs';
import { useT } from '../../i18n';
import { Badge, cn } from './ui';

export function usePairIndex(ch: Championship) {
  return useMemo(() => new Map(ch.pairs.map((p) => [p.id, p])), [ch.pairs]);
}

export function useProgress(ch: Championship) {
  return useMemo(() => pairProgressMap(ch.drawStatus === 'none' ? null : ch.bracket, ch.pairs), [ch.bracket, ch.pairs, ch.drawStatus]);
}

export function PairNumber({ number, tone = 'green', size = 'md' }: { number: number; tone?: 'green' | 'gold' | 'muted' | 'wine'; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-display font-semibold tabular-nums',
        size === 'sm' && 'h-7 min-w-7 px-1.5 text-sm',
        size === 'md' && 'h-9 min-w-9 px-2 text-base',
        size === 'lg' && 'h-12 min-w-12 px-2.5 text-xl',
        tone === 'green' && 'bg-bottle-800 text-gold-300',
        tone === 'gold' && 'bg-gold-500 text-bottle-950',
        tone === 'muted' && 'bg-ink-800/10 text-ink-500',
        tone === 'wine' && 'bg-wine-600/12 text-wine-700',
      )}
      aria-label={`Pareja ${number}`}
    >
      {number}
    </span>
  );
}

/** Nombre principal y secundario de una pareja. */
export function pairTexts(pair: Pair): { title: string; subtitle: string | null } {
  return pair.name ? { title: pair.name, subtitle: playersLabel(pair) } : { title: playersLabel(pair), subtitle: null };
}

export function PairLine({ pair, tone, size = 'md', className }: { pair: Pair; tone?: 'green' | 'gold' | 'muted' | 'wine'; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const { title, subtitle } = pairTexts(pair);
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <PairNumber number={pair.number} tone={tone} size={size} />
      <div className="min-w-0">
        <p className={cn('truncate font-semibold text-ink-900', size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-[15px]')}>{title}</p>
        {subtitle && <p className="truncate text-xs text-ink-500">{subtitle}</p>}
      </div>
    </div>
  );
}

const statusTone: Record<PairStatus, 'neutral' | 'green' | 'gold' | 'wine' | 'dark'> = {
  registered: 'neutral',
  pending: 'neutral',
  bye: 'gold',
  qualified: 'green',
  eliminated: 'wine',
  champion: 'dark',
};

export function StatusBadge({ status }: { status: PairStatus }) {
  const m = useT();
  return <Badge tone={statusTone[status]}>{m.status[status]}</Badge>;
}
