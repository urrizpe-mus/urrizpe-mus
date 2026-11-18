import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CircleAlert, GitFork, RotateCcw, ShieldCheck, Shuffle, Trash2, XCircle } from 'lucide-react';
import { confirmDraw, discardDraft, generateDraw } from '../../domain/championship';
import { pairListErrors } from '../../domain/pairs';
import { planRounds } from '../../domain/rounds';
import { formatDate, roundName, useT } from '../../i18n';
import { useApp } from '../../state/app';
import { useChampionship } from '../../state/championship';
import { BracketMatchCard, ByeCard } from '../bracket/Bracket';
import { usePairIndex } from '../components/pair';
import { ConfirmDialog, PlanSummary, TypedConfirm } from '../components/shared';
import { Badge, Button, Card, Notice, PageHeader, cn } from '../components/ui';
import { Emblem } from '../brand/Logo';

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-[15px]">
      {ok ? <CheckCircle2 size={20} className="shrink-0 text-bottle-600" /> : <XCircle size={20} className="shrink-0 text-wine-600" />}
      <span className={ok ? 'text-ink-800' : 'font-semibold text-wine-700'}>{children}</span>
    </li>
  );
}

function Shuffling() {
  const m = useT();
  return (
    <div className="flex flex-col items-center gap-4 py-14" role="status">
      <div className="relative h-24 w-24">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-0 animate-pulse"
            style={{ transform: `rotate(${(i - 1) * 14}deg) translateX(${(i - 1) * 10}px)`, animationDelay: `${i * 120}ms` }}
          >
            <Emblem size={96} tilt={0} />
          </div>
        ))}
      </div>
      <p className="font-display text-xl text-bottle-900">{m.drawPage.shuffling}</p>
    </div>
  );
}

export function DrawPage() {
  const m = useT();
  const { settings } = useApp();
  const { championship: ch, apply, saving } = useChampionship();
  const pairs = usePairIndex(ch);
  const [shuffling, setShuffling] = useState(false);
  const [reveal, setReveal] = useState(0); // fuerza la animación de reparto
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [redrawOpen, setRedrawOpen] = useState(false);

  const listErrors = pairListErrors(ch.pairs);
  const complete = ch.pairs.every((p) => p.player1 && p.player2);
  const unique = new Set(ch.pairs.map((p) => p.number)).size === ch.pairs.length;
  const enough = ch.pairs.length >= ch.mainDrawSize;
  const canDraw = ch.pairs.length >= 2 && !listErrors.length && enough;
  const plan = useMemo(() => {
    try {
      return planRounds(ch.pairs.length, ch.mainDrawSize);
    } catch {
      return null;
    }
  }, [ch.pairs.length, ch.mainDrawSize]);

  const run = async (replaceConfirmed = false) => {
    if (settings.drawAnimation) {
      setShuffling(true);
      // La animación es solo visual: el sorteo se calcula una única vez, al final.
      await new Promise((r) => setTimeout(r, 750));
    }
    const saved = await apply((c) => generateDraw(c, { replaceConfirmed }), m.drawPage.done);
    setShuffling(false);
    if (saved) setReveal((n) => n + 1);
  };

  const bracket = ch.bracket;
  const draw = ch.draw;

  const header = <PageHeader title={m.drawPage.title} subtitle={<Badge tone={ch.drawStatus === 'confirmed' ? 'green' : ch.drawStatus === 'preview' ? 'gold' : 'neutral'}>{m.status.draw[ch.drawStatus]}</Badge>} />;

  if (shuffling) {
    return (
      <div>
        {header}
        <Shuffling />
      </div>
    );
  }

  if (ch.drawStatus === 'none' || !bracket || !draw) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card as="section" className="p-4 sm:p-5">
            <h2 className="mb-3 text-lg font-semibold">{m.drawPage.checklist}</h2>
            <ul className="flex flex-col gap-2.5">
              <Check ok={ch.pairs.length >= 2}>{m.drawPage.checkCount(ch.pairs.length)}</Check>
              <Check ok={complete}>{m.drawPage.checkComplete}</Check>
              <Check ok={unique}>{m.drawPage.checkUnique}</Check>
              <Check ok={enough}>{m.drawPage.checkSize(ch.mainDrawSize)}</Check>
            </ul>
            {!enough && ch.pairs.length >= 2 && (
              <div className="mt-3">
                <Notice tone="wine" icon={<CircleAlert size={18} />}>
                  {m.create.notEnough(ch.pairs.length, ch.mainDrawSize)}
                </Notice>
              </div>
            )}
            <Button size="lg" className="mt-5 w-full" icon={<Shuffle size={20} />} disabled={!canDraw || saving} onClick={() => run()}>
              {m.drawPage.run}
            </Button>
            <p className="mt-3 flex gap-2 text-xs leading-relaxed text-ink-500">
              <ShieldCheck size={16} className="shrink-0 text-bottle-600" />
              {m.drawPage.fairness}
            </p>
          </Card>
          {plan && (
            <Card as="section" className="p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-semibold">{m.plan.title}</h2>
              <PlanSummary rounds={plan} compact />
            </Card>
          )}
        </div>
        {ch.previousDraws.length > 0 && <p className="text-sm text-ink-500">{m.drawPage.previous(ch.previousDraws.length)}</p>}
      </div>
    );
  }

  const first = bracket.rounds[0];
  const firstMatches = bracket.matches.filter((x) => x.round === 0).sort((a, b) => a.position - b.position);
  const next = bracket.rounds[1];
  const nextMatches = next ? bracket.matches.filter((x) => x.round === 1).sort((a, b) => a.position - b.position) : [];
  const isPreview = ch.drawStatus === 'preview';

  return (
    <div className="flex flex-col gap-5">
      {header}

      {isPreview ? (
        <Card as="section" className="sticky top-16 z-20 flex flex-col gap-3 border-gold-500/50 p-4 sm:flex-row sm:items-center sm:justify-between lg:top-4">
          <div>
            <p className="font-display text-lg font-semibold text-bottle-900">{m.drawPage.preview}</p>
            <p className="text-sm text-ink-500">{m.drawPage.previewText}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="ghost" icon={<Trash2 size={17} />} onClick={() => apply((c) => discardDraft(c))}>
              {m.drawPage.discard}
            </Button>
            <Button variant="outline" icon={<RotateCcw size={17} />} disabled={saving} onClick={() => run()}>
              {m.drawPage.redo}
            </Button>
            <Button variant="gold" size="lg" icon={<CheckCircle2 size={19} />} onClick={() => setConfirmOpen(true)}>
              {m.drawPage.confirm}
            </Button>
          </div>
        </Card>
      ) : (
        <Notice tone="green" icon={<CheckCircle2 size={18} />}>
          <span className="font-semibold">{m.drawPage.confirmed}</span> · {draw.confirmedAt && formatDate(draw.confirmedAt, true)}
        </Notice>
      )}

      <section key={reveal}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">
            {first.kind === 'prelim' ? m.drawPage.prelimMatches : `${m.drawPage.firstRoundMatches} · ${roundName(m, first, bracket.rounds)}`}
          </h2>
          <span className="text-sm text-ink-500">{m.plan.matches(first.matches)}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {firstMatches.map((mt, i) => (
            <div key={mt.id} className={cn(settings.drawAnimation && 'animate-deal')} style={{ animationDelay: `${Math.min(i, 24) * 35}ms` }}>
              <BracketMatchCard ch={ch} match={mt} />
            </div>
          ))}
        </div>
      </section>

      {bracket.byes.length > 0 && (
        <section key={`b${reveal}`}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">{m.drawPage.byesTitle}</h2>
            <span className="text-sm text-ink-500">{m.plan.byes(bracket.byes.length)}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {bracket.byes
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((b, i) => (
                <div key={b.pairId} className={cn(settings.drawAnimation && 'animate-deal')} style={{ animationDelay: `${Math.min(i + firstMatches.length, 30) * 35}ms` }}>
                  <ByeCard pair={pairs.get(b.pairId)!} />
                </div>
              ))}
          </div>
        </section>
      )}

      {next && first.kind === 'prelim' && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">
              {next.kind === 'main' ? `${m.drawPage.mainDrawTitle} · ${roundName(m, next, bracket.rounds)}` : roundName(m, next, bracket.rounds)}
            </h2>
            <Link to={`/c/${ch.id}/cuadro`} className="flex items-center gap-1 text-sm font-bold text-bottle-700">
              <GitFork size={16} className="rotate-90" /> {m.nav.bracket}
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {nextMatches.map((mt) => (
              <BracketMatchCard key={mt.id} ch={ch} match={mt} />
            ))}
          </div>
        </section>
      )}

      <Card as="section" className="p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold">{m.drawPage.record}</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="font-semibold text-ink-500">{m.drawPage.recordId}</dt>
          <dd className="font-mono text-xs break-all text-ink-800">{draw.id}</dd>
          <dt className="font-semibold text-ink-500">{m.drawPage.recordDate}</dt>
          <dd>{formatDate(draw.createdAt, true)}</dd>
          <dt className="font-semibold text-ink-500">{m.drawPage.recordMethod}</dt>
          <dd>{m.drawPage.recordMethodValue}</dd>
          <dt className="font-semibold text-ink-500">{m.drawPage.recordConfig}</dt>
          <dd>{m.drawPage.recordConfigValue(draw.config.pairCount, draw.config.mainDrawSize)}</dd>
          {draw.confirmedAt && (
            <>
              <dt className="font-semibold text-ink-500">{m.drawPage.recordConfirmed}</dt>
              <dd>{formatDate(draw.confirmedAt, true)}</dd>
            </>
          )}
        </dl>
        <div className="mt-4">
          <PlanSummary rounds={draw.rounds} />
        </div>
        {ch.previousDraws.length > 0 && <p className="mt-3 text-xs text-ink-500">{m.drawPage.previous(ch.previousDraws.length)}</p>}
      </Card>

      {!isPreview && (
        <div className="flex justify-end">
          <Button variant="outline" className="text-wine-700" icon={<Shuffle size={17} />} onClick={() => setRedrawOpen(true)}>
            {m.drawPage.newDraw}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={m.drawPage.confirmTitle}
        confirmLabel={m.drawPage.confirm}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          if (await apply((c) => confirmDraw(c), m.drawPage.confirmedToast)) setConfirmOpen(false);
        }}
      >
        {m.drawPage.confirmText}
      </ConfirmDialog>
      <TypedConfirm
        open={redrawOpen}
        title={m.drawPage.newDrawTitle}
        text={m.drawPage.newDrawText}
        word={m.drawPage.confirmWord}
        confirmLabel={m.drawPage.newDrawConfirm}
        onClose={() => setRedrawOpen(false)}
        onConfirm={() => {
          setRedrawOpen(false);
          void run(true);
        }}
      />
    </div>
  );
}
