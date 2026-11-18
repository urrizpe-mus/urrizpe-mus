import { Outlet, useParams, Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { useT } from '../../i18n';
import { ChampionshipProvider, useLoadChampionship } from '../../state/championship';
import { Shell } from '../layout/Shell';
import { WinnerFlowProvider } from '../match/WinnerFlow';
import { Button, EmptyState } from '../components/ui';

/** Carga el campeonato de la URL y lo pone a disposición de sus pantallas. */
export function ChampionshipLayout() {
  const { id } = useParams();
  const m = useT();
  const { state, setState, reload } = useLoadChampionship(id);

  if (state.status === 'loading') {
    return (
      <Shell>
        <p className="text-ink-500">{m.app.loading}</p>
      </Shell>
    );
  }
  if (state.status === 'missing') {
    return (
      <Shell>
        <EmptyState
          icon={<SearchX size={40} />}
          title={m.errors.notFound}
          text={m.errors.notFoundText}
          action={
            <Link to="/campeonatos">
              <Button>{m.nav.championships}</Button>
            </Link>
          }
        />
      </Shell>
    );
  }
  const ch = state.championship;
  return (
    <ChampionshipProvider initial={ch} onChange={(c) => setState({ status: 'ready', championship: c })} reload={reload}>
      <WinnerFlowProvider>
        <Shell championship={{ id: ch.id, name: ch.name }}>
          <Outlet />
        </Shell>
      </WinnerFlowProvider>
    </ChampionshipProvider>
  );
}
