import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Shuffle, Upload, Users, MousePointerClick } from 'lucide-react';
import type { Championship } from '../../domain/types';
import { useT } from '../../i18n';
import { useApp } from '../../state/app';
import { Emblem, LogoFull } from '../brand/Logo';
import { Button, Card, EmptyState } from '../components/ui';
import { ChampionshipCard } from './ChampionshipsPage';
import { ImportDialog } from './SettingsPage';

export function HomePage() {
  const m = useT();
  const { repo } = useApp();
  const navigate = useNavigate();
  const [items, setItems] = useState<Championship[] | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const load = () => repo.list().then(setItems, () => setItems([]));
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);

  return (
    <div className="flex flex-col gap-8">
      <section className="felt relative overflow-hidden rounded-3xl border border-gold-500/30 px-5 py-8 text-cream-50 shadow-[var(--shadow-lift)] sm:px-10 sm:py-12">
        <div className="relative grid items-center gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:gap-10">
        <div className="pointer-events-none order-1 flex justify-center xl:order-2" aria-hidden>
          <LogoFull className="w-[270px] drop-shadow-[0_14px_24px_rgba(0,0,0,0.35)] sm:w-[360px] xl:w-[400px]" />
        </div>
        <div className="order-2 max-w-2xl min-w-0 xl:order-1">
          <p className="mb-3 text-xs font-bold tracking-[0.22em] text-gold-300 uppercase">{m.app.tagline}</p>
          <h1 className="text-[32px] leading-[1.08] font-semibold text-cream-50 sm:text-5xl">{m.home.heroTitle}</h1>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-cream-100/85">{m.home.heroText}</p>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Button size="lg" variant="gold" icon={<Plus size={20} />} onClick={() => navigate('/nuevo')}>
              {m.home.create}
            </Button>
            <Button size="lg" variant="ghost" className="text-cream-50 ring-1 ring-cream-50/30 hover:bg-white/10" icon={<Upload size={19} />} onClick={() => setImportOpen(true)}>
              {m.home.import}
            </Button>
          </div>
        </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: <Shuffle size={22} />, t: m.home.feature1, d: m.home.feature1Text },
          { icon: <MousePointerClick size={22} />, t: m.home.feature2, d: m.home.feature2Text },
          { icon: <Users size={22} />, t: m.home.feature3, d: m.home.feature3Text },
        ].map((f) => (
          <Card key={f.t} className="flex gap-3 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bottle-800 text-gold-300">{f.icon}</span>
            <div>
              <p className="font-display text-[17px] font-semibold text-bottle-900">{f.t}</p>
              <p className="mt-0.5 text-sm text-ink-500">{f.d}</p>
            </div>
          </Card>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">{m.home.recent}</h2>
          {!!items?.length && (
            <Link to="/campeonatos" className="flex items-center gap-1 text-sm font-bold text-bottle-700 hover:text-bottle-900">
              {m.home.seeAll} <ArrowRight size={16} />
            </Link>
          )}
        </div>
        {items === null ? (
          <p className="text-ink-500">{m.app.loading}</p>
        ) : items.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.slice(0, 6).map((c) => (
              <ChampionshipCard key={c.id} ch={c} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Emblem size={56} />}
            title={m.home.empty}
            action={
              <Button icon={<Plus size={18} />} onClick={() => navigate('/nuevo')}>
                {m.home.create}
              </Button>
            }
          />
        )}
      </section>
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onDone={load} />
    </div>
  );
}
