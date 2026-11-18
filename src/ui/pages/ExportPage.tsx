import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Braces, FileSpreadsheet, FileText, Globe, GitFork, Medal, Monitor, Printer, Users } from 'lucide-react';
import { useT } from '../../i18n';
import { backupToJson, createBackup, downloadText, safeFileName } from '../../io/backup';
import { readOnlyHtml } from '../../io/html';
const pdf = () => import('../../io/pdf');
import { useApp } from '../../state/app';
import { useChampionship } from '../../state/championship';
import { Button, Card, Notice, PageHeader } from '../components/ui';

function Item({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bottle-800 text-gold-300">{icon}</span>
        <div>
          <p className="font-display text-[17px] font-semibold text-bottle-900">{title}</p>
          <p className="text-sm text-ink-500">{text}</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">{action}</div>
    </Card>
  );
}

export function ExportPage() {
  const m = useT();
  const { toast } = useApp();
  const { championship: ch } = useChampionship();
  const [busy, setBusy] = useState<string | null>(null);
  const hasBracket = ch.drawStatus === 'confirmed' && !!ch.bracket;

  const run = async (key: string, fn: () => Promise<void> | void) => {
    setBusy(key);
    try {
      await fn();
      toast(m.exportPage.done);
    } catch {
      toast(m.errors.generic, 'error');
    } finally {
      setBusy(null);
    }
  };
  const label = (key: string, text: string) => (busy === key ? m.exportPage.generating : text);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={m.exportPage.title} />
      {!hasBracket && <Notice tone="gold">{m.exportPage.noBracket}</Notice>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Item
          icon={<GitFork size={22} className="rotate-90" />}
          title={m.exportPage.pdfBracket}
          text={m.exportPage.pdfBracketText}
          action={
            <>
              <Button disabled={!hasBracket || !!busy} icon={<FileText size={17} />} onClick={() => run('bracket', async () => downloadText(await (await pdf()).bracketPdf(ch, m), safeFileName(`${ch.name}-cuadro`, 'pdf')))}>
                {label('bracket', m.common.download)}
              </Button>
              <Link to={`/c/${ch.id}/cuadro`}>
                <Button variant="outline" disabled={!hasBracket} icon={<Printer size={17} />}>
                  {m.exportPage.printBracket}
                </Button>
              </Link>
            </>
          }
        />
        <Item
          icon={<Medal size={22} />}
          title={m.exportPage.pdfStandings}
          text={m.exportPage.pdfStandingsText}
          action={
            <>
              <Button disabled={!hasBracket || !!busy} icon={<FileText size={17} />} onClick={() => run('standings', async () => downloadText(await (await pdf()).standingsPdf(ch, m), safeFileName(`${ch.name}-clasificacion`, 'pdf')))}>
                {label('standings', m.common.download)}
              </Button>
              <Link to={`/c/${ch.id}/clasificacion`}>
                <Button variant="outline" disabled={!hasBracket} icon={<Printer size={17} />}>
                  {m.exportPage.printStandings}
                </Button>
              </Link>
            </>
          }
        />
        <Item
          icon={<Users size={22} />}
          title={m.exportPage.pdfPairs}
          text={m.exportPage.pdfPairsText}
          action={
            <Button disabled={!ch.pairs.length || !!busy} icon={<FileText size={17} />} onClick={() => run('pairs', async () => downloadText(await (await pdf()).pairsPdf(ch, m), safeFileName(`${ch.name}-parejas`, 'pdf')))}>
              {label('pairs', m.common.download)}
            </Button>
          }
        />
        <Item
          icon={<FileSpreadsheet size={22} />}
          title={m.exportPage.csvPairs}
          text={m.exportPage.csvPairsText}
          action={
            <Button variant="outline" disabled={!ch.pairs.length} onClick={() => run('csv', async () => downloadText((await pdf()).pairsCsv(ch, m), safeFileName(`${ch.name}-parejas`, 'csv'), 'text/csv'))}>
              {m.common.download}
            </Button>
          }
        />
        <Item
          icon={<Braces size={22} />}
          title={m.exportPage.json}
          text={m.exportPage.jsonText}
          action={
            <Button variant="outline" onClick={() => run('json', () => downloadText(backupToJson(createBackup([ch])), safeFileName(ch.name, 'json')))}>
              {m.common.download}
            </Button>
          }
        />
        <Item
          icon={<Globe size={22} />}
          title={m.exportPage.html}
          text={m.exportPage.htmlText}
          action={
            <Button variant="outline" onClick={() => run('html', () => downloadText(readOnlyHtml(ch, m), safeFileName(`${ch.name}-consulta`, 'html'), 'text/html'))}>
              {m.common.download}
            </Button>
          }
        />
      </div>
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-[17px] font-semibold text-bottle-900">{m.exportPage.publicTitle}</p>
          <p className="max-w-3xl text-sm text-ink-500">{m.exportPage.publicText}</p>
        </div>
        <Link to={`/c/${ch.id}/vista`}>
          <Button variant="subtle" icon={<Monitor size={17} />}>
            {m.nav.publicView}
          </Button>
        </Link>
      </Card>
    </div>
  );
}
