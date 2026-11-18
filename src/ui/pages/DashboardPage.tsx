import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Crown, Download, GitFork, History, Medal, Pencil, Shuffle, Swords, Users } from 'lucide-react';
import { championshipStats } from '../../domain/standings';
import { updateDetails, isLocked } from '../../domain/championship';
import { formatDate, roundName, useT } from '../../i18n';
import { useChampionship } from '../../state/championship';
import { pairTexts, usePairIndex } from '../components/pair';
import { Badge, Button, Card, Field, Input, Modal, Notice, Textarea, cn } from '../components/ui';
import { MainDrawPicker } from './NewChampionshipPage';
import { matchState } from '../../domain/bracket';

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={cn('rounded-2xl border p-3.5 sm:p-4', accent ? 'felt border-gold-500/40 text-cream-50' : 'border-bottle-900/10 bg-cream-50 shadow-[var(--shadow-card)]')}>
      <p className={cn('font-display text-3xl font-semibold tabular-nums sm:text-4xl', accent ? 'text-gold-300' : 'text-bottle-900')}>{value}</p>
      <p className={cn('mt-0.5 text-xs font-bold tracking-wide uppercase', accent ? 'text-cream-100/80' : 'text-ink-500')}>{label}</p>
    </div>
  );
}

export function DashboardPage() {
  const m = useT();
  const navigate = useNavigate();
  const { championship: ch, apply } = useChampionship();
  const pairs = usePairIndex(ch);
  const active = ch.drawStatus === 'confirmed' ? ch.bracket : null;
  const stats = useMemo(() => championshipStats(active, ch.pairs), [active, ch.pairs]);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: ch.name, date: ch.date, description: ch.description, mainDrawSize: ch.mainDrawSize });
  const base = `/c/${ch.id}`;
  const champion = stats.champion ? pairs.get(stats.champion) : undefined;

  let step: { text: string; label: string; to: string; icon: React.ReactNode };
  if (champion) step = { text: m.dashboard.stepDone, label: m.dashboard.goStandings, to: `${base}/clasificacion`, icon: <Medal size={18} /> };
  else if (ch.drawStatus === 'confirmed') step = { text: m.dashboard.stepPlay, label: m.dashboard.goMatches, to: `${base}/partidos`, icon: <Swords size={18} /> };
  else if (ch.drawStatus === 'preview') step = { text: m.dashboard.stepConfirm, label: m.dashboard.goDraw, to: `${base}/sorteo`, icon: <Shuffle size={18} /> };
  else if (ch.pairs.length >= 2) step = { text: m.dashboard.stepDraw, label: m.dashboard.goDraw, to: `${base}/sorteo`, icon: <Shuffle size={18} /> };
  else step = { text: m.dashboard.stepAddPairs, label: m.dashboard.goPairs, to: `${base}/parejas`, icon: <Users size={18} /> };

  const shortcuts = [
    { to: `${base}/parejas`, label: m.nav.pairs, icon: <Users size={22} /> },
    { to: `${base}/sorteo`, label: m.nav.draw, icon: <Shuffle size={22} /> },
    { to: `${base}/cuadro`, label: m.nav.bracket, icon: <GitFork size={22} className="rotate-90" /> },
    { to: `${base}/partidos`, label: m.dashboard.goMatches, icon: <Swords size={22} /> },
    { to: `${base}/clasificacion`, label: m.nav.standings, icon: <Medal size={22} /> },
    { to: `${base}/exportar`, label: m.nav.export, icon: <Download size={22} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-500">
            <CalendarDays size={16} /> {formatDate(ch.date)}
            <Badge tone={ch.drawStatus === 'confirmed' ? 'green' : ch.drawStatus === 'preview' ? 'gold' : 'neutral'}>{m.status.draw[ch.drawStatus]}</Badge>
          </p>
          <h1 className="text-[28px] leading-tight font-semibold sm:text-4xl">{ch.name}</h1>
          {ch.description && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-500">{ch.description}</p>}
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<Pencil size={15} />}
          onClick={() => {
            setForm({ name: ch.name, date: ch.date, description: ch.description, mainDrawSize: ch.mainDrawSize });
            setEditOpen(true);
          }}
        >
          {m.dashboard.edit}
        </Button>
      </header>

      {champion && (
        <section className="felt relative overflow-hidden rounded-3xl border-2 border-gold-500 p-5 text-center text-cream-50 shadow-[var(--shadow-lift)] sm:p-8">
          <Crown size={44} className="mx-auto text-gold-300" />
          <p className="mt-2 text-xs font-extrabold tracking-[0.25em] text-gold-300 uppercase">{m.dashboard.champion}</p>
          <p className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
            {m.common.pair} {champion.number}
          </p>
          <p className="mt-1 text-lg text-cream-100">{pairTexts(champion).title}</p>
          {pairTexts(champion).subtitle && <p className="text-sm text-cream-100/75">{pairTexts(champion).subtitle}</p>}
        </section>
      )}

      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={m.dashboard.registered} value={stats.pairs} accent />
        <Stat label={m.dashboard.total} value={stats.totalMatches} />
        <Stat label={m.dashboard.played} value={stats.played} />
        <Stat label={m.dashboard.pending} value={stats.pending} />
        <Stat label={m.dashboard.alive} value={stats.alive} />
        <Stat label={m.dashboard.eliminated} value={stats.eliminated} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card as="section" className="flex flex-col gap-3 p-4 sm:p-5">
          <p className="text-xs font-bold tracking-[0.14em] text-gold-600 uppercase">{m.dashboard.nextStep}</p>
          <p className="font-display text-xl font-semibold text-bottle-900">{step.text}</p>
          {stats.currentRound && active && (
            <p className="text-sm text-ink-600">
              {m.dashboard.currentRound}: <strong>{roundName(m, stats.currentRound, active.rounds)}</strong> · {m.dashboard.readyNow(stats.ready)}
            </p>
          )}
          <Button size="lg" className="mt-1 sm:self-start" icon={step.icon} onClick={() => navigate(step.to)}>
            {step.label}
          </Button>
        </Card>

        <Card as="section" className="p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold">{m.dashboard.progress}</h2>
          {active ? (
            <ul className="flex flex-col gap-2.5">
              {active.rounds.map((r, i) => {
                const ms = active.matches.filter((x) => x.round === i);
                const done = ms.filter((x) => x.winner).length;
                const ready = ms.filter((x) => matchState(active, x) === 'ready').length;
                return (
                  <li key={i}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-ink-800">{roundName(m, r, active.rounds)}</span>
                      <span className="text-ink-500 tabular-nums">
                        {done}/{ms.length}
                        {ready > 0 && <span className="ml-2 font-semibold text-gold-700">· {ready} ▸</span>}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-800/8">
                      <div className="h-full rounded-full bg-gradient-to-r from-bottle-600 to-gold-500 transition-all" style={{ width: `${(done / ms.length) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">{m.dashboard.noDraw}</p>
          )}
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{m.dashboard.shortcuts}</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {shortcuts.map((s) => (
            <Link key={s.to} to={s.to} className="group flex min-h-24 flex-col justify-between rounded-2xl border border-bottle-900/10 bg-cream-50 p-3.5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-gold-500/60">
              <span className="text-gold-600">{s.icon}</span>
              <span className="flex items-center justify-between text-[15px] font-bold text-bottle-900">
                {s.label} <ArrowRight size={16} className="opacity-0 transition group-hover:opacity-100" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Card as="section" className="p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <History size={18} className="text-gold-600" /> {m.dashboard.history}
        </h2>
        <ol className="flex flex-col divide-y divide-bottle-900/8">
          {ch.history.slice(0, 8).map((h, i) => (
            <li key={i} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
              <span className="w-36 shrink-0 text-xs text-ink-400 tabular-nums">{formatDate(h.at, true)}</span>
              <span className="text-sm text-ink-700">{h.message}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={m.dashboard.editTitle}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {m.common.cancel}
            </Button>
            <Button
              onClick={async () => {
                const saved = await apply((c) => updateDetails(c, form));
                if (saved) setEditOpen(false);
              }}
            >
              {m.common.save}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label={m.common.name} htmlFor="e-name">
            <Input id="e-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} />
          </Field>
          <Field label={m.common.date} htmlFor="e-date">
            <Input id="e-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label={`${m.common.description} (${m.common.optional})`} htmlFor="e-desc">
            <Textarea id="e-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} />
          </Field>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-700">{m.dashboard.mainDraw}</p>
            <MainDrawPicker value={form.mainDrawSize} onChange={(n) => setForm({ ...form, mainDrawSize: n })} pairCount={ch.pairs.length} disabled={isLocked(ch)} />
            {isLocked(ch) && <p className="mt-2 text-xs text-ink-500">{m.dashboard.lockedDraw}</p>}
            {!isLocked(ch) && ch.pairs.length > 0 && ch.pairs.length < form.mainDrawSize && (
              <div className="mt-2">
                <Notice tone="wine">{m.create.notEnough(ch.pairs.length, form.mainDrawSize)}</Notice>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
