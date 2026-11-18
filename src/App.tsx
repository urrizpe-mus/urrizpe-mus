import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AppProvider } from './state/app';
import { PwaUpdater } from './state/pwa';
import { useT } from './i18n';
import { Shell } from './ui/layout/Shell';
import { Button, EmptyState } from './ui/components/ui';
import { HomePage } from './ui/pages/HomePage';
import { ChampionshipsPage } from './ui/pages/ChampionshipsPage';
import { NewChampionshipPage } from './ui/pages/NewChampionshipPage';
import { SettingsPage } from './ui/pages/SettingsPage';
import { ChampionshipLayout } from './ui/pages/ChampionshipLayout';
import { DashboardPage } from './ui/pages/DashboardPage';
import { PairsPage } from './ui/pages/PairsPage';
import { DrawPage } from './ui/pages/DrawPage';
import { BracketPage } from './ui/pages/BracketPage';
import { MatchesPage } from './ui/pages/MatchesPage';
import { StandingsPage } from './ui/pages/StandingsPage';
import { ExportPage } from './ui/pages/ExportPage';
import { PublicViewPage } from './ui/pages/PublicViewPage';
import type { ChampionshipRepository } from './storage/repository';

function NotFound() {
  const m = useT();
  return (
    <Shell>
      <EmptyState
        title={m.errors.pageNotFound}
        action={
          <Link to="/">
            <Button>{m.nav.home}</Button>
          </Link>
        }
      />
    </Shell>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Shell><HomePage /></Shell>} />
      <Route path="/campeonatos" element={<Shell><ChampionshipsPage /></Shell>} />
      <Route path="/nuevo" element={<Shell><NewChampionshipPage /></Shell>} />
      <Route path="/ajustes" element={<Shell><SettingsPage /></Shell>} />
      <Route path="/c/:id/vista" element={<PublicViewPage />} />
      <Route path="/c/:id" element={<ChampionshipLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="parejas" element={<PairsPage />} />
        <Route path="sorteo" element={<DrawPage />} />
        <Route path="cuadro" element={<BracketPage />} />
        <Route path="partidos" element={<MatchesPage />} />
        <Route path="clasificacion" element={<StandingsPage />} />
        <Route path="exportar" element={<ExportPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App({ repo }: { repo?: ChampionshipRepository }) {
  return (
    <AppProvider repo={repo}>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AppRoutes />
      </BrowserRouter>
      <PwaUpdater />
    </AppProvider>
  );
}
