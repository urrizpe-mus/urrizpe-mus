import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Trash2, Trophy, AlertTriangle } from 'lucide-react';
import { createChampionship } from '../../domain/championship';
import { MAIN_DRAW_SIZES, MAX_PAIRS, DomainError } from '../../domain/types';
import { planRounds, recommendMainDrawSize } from '../../domain/rounds';
import type { PairInput } from '../../domain/pairs';
import { roundName, useT } from '../../i18n';
import { useApp } from '../../state/app';
import { Badge, Button, Card, Field, Input, Notice, PageHeader, Textarea, cn } from '../components/ui';
import { PasteDialog, PlanSummary } from '../components/shared';

type Row = PairInput & { key: number };

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Selector del cuadro principal con recomendación y aviso si faltan parejas. */
export function MainDrawPicker({ value, onChange, pairCount, disabled }: { value: number; onChange: (n: number) => void; pairCount: number; disabled?: boolean }) {
  const m = useT();
  const recommended = recommendMainDrawSize(pairCount);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup">
      {MAIN_DRAW_SIZES.map((size) => {
        const plan = planRounds(Math.max(size, 2), size);
        const label = roundName(m, plan[0], plan);
        const short = pairCount > 0 && pairCount < size;
        return (
          <button
            key={size}
            type="button"
            role="radio"
            aria-checked={value === size}
            disabled={disabled}
            onClick={() => onChange(size)}
            className={cn(
              'relative flex min-h-20 flex-col items-start justify-center rounded-xl border-2 px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
              value === size ? 'border-bottle-700 bg-bottle-50' : 'border-bottle-900/10 bg-white hover:border-bottle-900/30',
              short && 'border-dashed',
            )}
          >
            <span className="font-display text-2xl font-semibold text-bottle-900">{size}</span>
            <span className="text-xs font-semibold text-ink-600">{label}</span>
            {recommended === size && (
              <Badge tone="gold" className="absolute top-1.5 right-1.5 !px-1.5 text-[10px]">
                {m.create.recommended}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function NewChampionshipPage() {
  const m = useT();
  const { repo, toast } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 4 }, (_, i) => ({ key: i, name: '', player1: '', player2: '' })));
  const [nextKey, setNextKey] = useState(4);
  const [count, setCount] = useState('');
  const [mainDraw, setMainDraw] = useState<number | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const filled = rows.filter((r) => r.player1.trim() && r.player2.trim());
  const partial = rows.filter((r) => (r.player1.trim() || r.player2.trim() || r.name?.trim()) && !(r.player1.trim() && r.player2.trim()));
  const pairCount = filled.length;
  const recommended = recommendMainDrawSize(pairCount) ?? 2;
  const effectiveMain = mainDraw ?? recommended;

  const plan = useMemo(() => {
    try {
      return pairCount >= 2 ? planRounds(pairCount, effectiveMain) : null;
    } catch {
      return null;
    }
  }, [pairCount, effectiveMain]);

  const addRows = (n: number, data: PairInput[] = []) => {
    setRows((prev) => {
      // Rellena primero las filas vacías.
      const next = prev.slice();
      const queue = data.slice();
      for (let i = 0; i < next.length && queue.length; i++) {
        if (!next[i].player1 && !next[i].player2 && !next[i].name) next[i] = { ...next[i], ...queue.shift()! };
      }
      let k = nextKey;
      const extra = Math.max(n, queue.length);
      for (let i = 0; i < extra; i++) next.push({ key: k++, ...(queue[i] ?? { name: '', player1: '', player2: '' }) });
      setNextKey(k);
      return next.slice(0, MAX_PAIRS);
    });
  };

  const generateRows = () => {
    const n = Math.min(MAX_PAIRS, Math.max(0, parseInt(count, 10) || 0));
    if (n <= rows.length) {
      setRows((prev) => prev.filter((r, i) => i < n || r.player1 || r.player2 || r.name));
    } else addRows(n - rows.length);
  };

  const update = (key: number, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const submit = async () => {
    setSubmitted(true);
    if (!name.trim() || partial.length) return;
    if (pairCount > 0 && pairCount < effectiveMain) return;
    setBusy(true);
    try {
      const ch = createChampionship({ name, date, description, mainDrawSize: effectiveMain, pairs: filled.map(({ name: n, player1, player2 }) => ({ name: n, player1, player2 })) });
      const saved = await repo.save(ch, null);
      toast(m.create.created);
      navigate(`/c/${saved.id}`);
    } catch (e) {
      toast(e instanceof DomainError ? e.message : m.errors.storage, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={m.create.title} />
      <div className="flex flex-col gap-5">
        <Card as="section" className="p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <StepNum n={1} /> {m.create.step1}
          </h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <Field label={m.common.name} htmlFor="c-name" error={submitted && !name.trim() ? 'El campeonato necesita un nombre.' : undefined}>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={m.create.namePlaceholder} maxLength={80} />
            </Field>
            <Field label={m.common.date} htmlFor="c-date">
              <Input id="c-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={`${m.common.description} (${m.common.optional})`} htmlFor="c-desc">
                <Textarea id="c-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={m.create.descriptionPlaceholder} maxLength={500} />
              </Field>
            </div>
          </div>
        </Card>

        <Card as="section" className="p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <StepNum n={2} /> {m.create.step2}
              <Badge tone="green">{pairCount}</Badge>
            </h2>
            <Button variant="outline" size="sm" icon={<ClipboardList size={16} />} onClick={() => setPasteOpen(true)}>
              {m.create.paste}
            </Button>
          </div>
          <div className="mb-4 flex items-end gap-2">
            <div className="w-40">
              <Field label={m.create.pairCount} htmlFor="c-count">
                <Input id="c-count" type="number" inputMode="numeric" min={2} max={MAX_PAIRS} value={count} onChange={(e) => setCount(e.target.value)} placeholder={String(rows.length)} />
              </Field>
            </div>
            <Button variant="subtle" onClick={generateRows} disabled={!count}>
              {m.create.generateRows}
            </Button>
          </div>
          <p className="mb-3 text-xs text-ink-500">{m.create.pairCountHelp}</p>
          <ol className="flex flex-col gap-2">
            {rows.map((r, i) => {
              const bad = submitted && partial.includes(r);
              return (
                <li key={r.key} className={cn('grid grid-cols-[2.25rem_1fr_auto] items-start gap-2 rounded-xl p-2 sm:grid-cols-[2.25rem_1fr_1fr_1fr_auto] sm:items-center', bad ? 'bg-wine-50 ring-1 ring-wine-600/30' : 'bg-white/60')}>
                  <span className="flex h-11 items-center justify-center font-display text-lg font-semibold text-bottle-800 tabular-nums">{i + 1}</span>
                  <div className="col-start-2 row-start-1 grid gap-2 sm:contents">
                    <Input aria-label={`${m.create.player1} ${i + 1}`} placeholder={m.create.player1} value={r.player1} onChange={(e) => update(r.key, { player1: e.target.value })} maxLength={60} />
                    <Input aria-label={`${m.create.player2} ${i + 1}`} placeholder={m.create.player2} value={r.player2} onChange={(e) => update(r.key, { player2: e.target.value })} maxLength={60} />
                    <Input aria-label={`${m.create.pairName} ${i + 1}`} placeholder={m.create.pairName} value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} maxLength={60} />
                  </div>
                  <button type="button" aria-label={m.create.removeRow} onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))} className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-400 hover:bg-wine-50 hover:text-wine-600">
                    <Trash2 size={18} />
                  </button>
                </li>
              );
            })}
          </ol>
          <Button variant="outline" className="mt-3 w-full sm:w-auto" icon={<Plus size={18} />} onClick={() => addRows(1)}>
            {m.create.addRow}
          </Button>
          {submitted && partial.length > 0 && (
            <div className="mt-3">
              <Notice tone="wine" icon={<AlertTriangle size={18} />}>
                {m.create.incompleteRows(partial.length)}
              </Notice>
            </div>
          )}
          {pairCount === 0 && <p className="mt-3 text-sm text-ink-500">{m.create.skipPairs}</p>}
        </Card>

        <Card as="section" className="p-4 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 text-xl font-semibold">
            <StepNum n={3} /> {m.create.step3}
          </h2>
          <p className="mb-4 text-sm text-ink-500">{m.create.mainDrawHelp}</p>
          <MainDrawPicker value={effectiveMain} onChange={setMainDraw} pairCount={pairCount} />
          {pairCount > 0 && pairCount < effectiveMain && (
            <div className="mt-3">
              <Notice tone="wine" icon={<AlertTriangle size={18} />}>
                {m.create.notEnough(pairCount, effectiveMain)}
              </Notice>
            </div>
          )}
          {plan && (
            <div className="mt-5">
              <h3 className="mb-2 text-base font-semibold">{m.plan.title}</h3>
              <PlanSummary rounds={plan} />
            </div>
          )}
        </Card>

        <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 lg:bottom-4">
          <Button size="lg" className="w-full shadow-[var(--shadow-lift)]" icon={<Trophy size={20} />} disabled={busy} onClick={submit}>
            {m.create.submit}
          </Button>
        </div>
      </div>
      <PasteDialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onAdd={(pairs) => {
          addRows(0, pairs);
          return true;
        }}
      />
    </div>
  );
}

function StepNum({ n }: { n: number }) {
  return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-500 font-sans text-sm font-extrabold text-bottle-950">{n}</span>;
}
