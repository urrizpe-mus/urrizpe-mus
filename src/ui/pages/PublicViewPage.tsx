import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Crown, Eye, Maximize } from 'lucide-react';
import { championOf } from '../../domain/bracket';
import { formatDate, useT } from '../../i18n';
import { useLoadChampionship } from '../../state/championship';
import { BracketRounds, BracketTree } from '../bracket/Bracket';
import { Logo } from '../brand/Logo';
import { pairTexts, usePairIndex, PairLine } from '../components/pair';
import { Button, Card, EmptyState } from '../components/ui';
import { StandingsList } from './StandingsPage';
import { useIsDesktop } from './BracketPage';
import type { Championship } from '../../domain/types';

/**
 * Vista de solo consulta para proyectar en una pantalla durante el
 * campeonato. No ofrece ninguna acción de gestión y se actualiza sola
 * cuando se registran ganadoras desde otra pestaña del mismo dispositivo.
 */
export function PublicViewPage() {
  const { id } = useParams();
  const m = useT();
  const { state } = useLoadChampionship(id);
  if (state.status !== 'ready') {
    return <div className="p-8 text-ink-500">{state.status === 'loading' ? m.app.loading : m.errors.notFound}</div>;
  }
  return <PublicView ch={state.championship} />;
}

function PublicView({ ch }: { ch: Championship }) {
  const m = useT();
  const desktop = useIsDesktop();
  const pairs = usePairIndex(ch);
  const b = ch.drawStatus === 'confirmed' ? ch.bracket : null;
  const champ = b ? championOf(b) : null;
  const champion = champ ? pairs.get(champ) : undefined;
  return (
    <div className="min-h-dvh">
      <header className="felt sticky top-0 z-20 border-b border-gold-500/30 px-4 pt-[env(safe-area-inset-top)] sm:px-8">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4">
          <span className="hidden sm:block">
            <Logo size={36} light />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-semibold text-cream-50">{ch.name}</p>
            <p className="text-xs text-cream-100/70">{formatDate(ch.date)}</p>
          </div>
          <span className="no-print hidden sm:block">
            <Button size="sm" variant="ghost" className="text-cream-50 hover:bg-white/10" icon={<Maximize size={16} />} onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}>
              {m.publicView.fullscreen}
            </Button>
          </span>
          <Link to={`/c/${ch.id}`} className="no-print">
            <Button size="sm" variant="ghost" className="text-cream-50 hover:bg-white/10" icon={<ArrowLeft size={16} />} aria-label={m.publicView.exit}>
              <span className="hidden sm:inline">{m.publicView.exit}</span>
            </Button>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-8">
        <p className="flex items-center gap-2 text-sm text-ink-500">
          <Eye size={16} /> {m.publicView.readonly}
        </p>
        {champion && (
          <section className="felt rounded-3xl border-2 border-gold-500 p-6 text-center text-cream-50">
            <Crown size={40} className="mx-auto text-gold-300" />
            <p className="mt-1 text-xs font-extrabold tracking-[0.25em] text-gold-300 uppercase">{m.dashboard.champion}</p>
            <p className="mt-2 font-display text-3xl font-semibold">
              {champion.number} · {pairTexts(champion).title}
            </p>
            {pairTexts(champion).subtitle && <p className="text-cream-100/80">{pairTexts(champion).subtitle}</p>}
          </section>
        )}
        {b ? (
          <>
            <section>
              <h2 className="mb-3 text-2xl font-semibold">{m.bracketPage.title}</h2>
              {desktop ? (
                <div className="overflow-x-auto rounded-2xl border border-bottle-900/10 bg-cream-50/60 p-5 scrollbar-thin">
                  <BracketTree ch={ch} />
                </div>
              ) : (
                <BracketRounds ch={ch} />
              )}
            </section>
            <section>
              <h2 className="mb-3 text-2xl font-semibold">{m.standingsPage.title}</h2>
              <StandingsList ch={ch} />
            </section>
          </>
        ) : (
          <EmptyState title={m.bracketPage.noDraw} />
        )}
        <section>
          <h2 className="mb-3 text-2xl font-semibold">{m.pairsPage.title}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ch.pairs
              .slice()
              .sort((a, c) => a.number - c.number)
              .map((p) => (
                <Card key={p.id} className="px-3 py-2">
                  <PairLine pair={p} />
                </Card>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
