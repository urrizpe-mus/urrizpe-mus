import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Trophy,
  PlusCircle,
  Settings,
  LayoutDashboard,
  Users,
  Shuffle,
  GitFork,
  Swords,
  Medal,
  Download,
  MoreHorizontal,
  Monitor,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { useT } from '../../i18n';
import { Logo, Emblem } from '../brand/Logo';
import { cn, Modal } from '../components/ui';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

function useGlobalNav(): NavItem[] {
  const m = useT();
  return [
    { to: '/', label: m.nav.home, icon: <Home size={20} />, end: true },
    { to: '/campeonatos', label: m.nav.championships, icon: <Trophy size={20} /> },
    { to: '/nuevo', label: m.nav.newChampionship, icon: <PlusCircle size={20} /> },
    { to: '/ajustes', label: m.nav.settings, icon: <Settings size={20} /> },
  ];
}

export function useChampionshipNav(id: string): NavItem[] {
  const m = useT();
  const base = `/c/${id}`;
  return [
    { to: base, label: m.nav.dashboard, icon: <LayoutDashboard size={20} />, end: true },
    { to: `${base}/partidos`, label: m.nav.matches, icon: <Swords size={20} /> },
    { to: `${base}/cuadro`, label: m.nav.bracket, icon: <GitFork size={20} className="rotate-90" /> },
    { to: `${base}/clasificacion`, label: m.nav.standings, icon: <Medal size={20} /> },
    { to: `${base}/parejas`, label: m.nav.pairs, icon: <Users size={20} /> },
    { to: `${base}/sorteo`, label: m.nav.draw, icon: <Shuffle size={20} /> },
    { to: `${base}/exportar`, label: m.nav.export, icon: <Download size={20} /> },
    { to: `${base}/vista`, label: m.nav.publicView, icon: <Monitor size={20} /> },
  ];
}

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors',
          isActive ? 'bg-cream-50 text-bottle-900 shadow-sm [&_svg]:text-gold-600' : 'text-cream-100/80 hover:bg-white/8 hover:text-cream-50',
        )
      }
    >
      {item.icon}
      {item.label}
    </NavLink>
  );
}

/**
 * Estructura general. Ordenador: barra lateral fija. Móvil y tablet
 * vertical: barra superior y navegación inferior con botones grandes.
 */
export function Shell({ children, championship }: { children: ReactNode; championship?: { id: string; name: string } }) {
  const m = useT();
  const global = useGlobalNav();
  const champNav = useChampionshipNav(championship?.id ?? '');
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const bottom: NavItem[] = championship ? champNav.slice(0, 4) : global;
  const more = championship ? champNav.slice(4) : [];
  const moreActive = more.some((i) => location.pathname.startsWith(i.to));

  return (
    <div className="min-h-dvh lg:pl-[272px]">
      {/* Barra lateral (ordenador) */}
      <aside className="no-print felt fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col overflow-y-auto border-r border-gold-500/20 px-4 py-6 lg:flex">
        <Link to="/" className="mb-8 px-2">
          <Logo size={44} light />
        </Link>
        <nav className="flex flex-col gap-1" aria-label={m.nav.menu}>
          {global.map((i) => (
            <SideLink key={i.to} item={i} />
          ))}
        </nav>
        {championship && (
          <>
            <div className="gold-rule my-6 opacity-50" />
            <p className="mb-1 px-3 text-[11px] font-bold tracking-[0.16em] text-gold-300/80 uppercase">{m.nav.championships}</p>
            <p className="mb-3 truncate px-3 font-display text-lg text-cream-50" title={championship.name}>
              {championship.name}
            </p>
            <nav className="flex flex-col gap-1">
              {champNav.map((i) => (
                <SideLink key={i.to} item={i} />
              ))}
            </nav>
          </>
        )}
        <p className="mt-auto px-3 pt-8 text-xs leading-relaxed text-cream-100/50">{m.app.localOnly}</p>
      </aside>

      {/* Barra superior (móvil) */}
      <header className="no-print felt sticky top-0 z-30 border-b border-gold-500/25 px-4 pt-[env(safe-area-inset-top)] lg:hidden">
        <div className="flex h-14 items-center gap-3">
          {championship ? (
            <>
              <Link to="/campeonatos" aria-label={m.nav.back} className="-ml-1 rounded-full p-1.5 text-cream-50 hover:bg-white/10">
                <ArrowLeft size={22} />
              </Link>
              <Emblem size={30} />
              <p className="min-w-0 flex-1 truncate font-display text-[17px] font-semibold text-cream-50">{championship.name}</p>
            </>
          ) : (
            <Link to="/">
              <Logo size={34} light />
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-4 pt-5 pb-[calc(96px+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">{children}</main>

      {/* Navegación inferior (móvil) */}
      <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-bottle-900/10 bg-cream-50/95 backdrop-blur lg:hidden" aria-label={m.nav.menu}>
        <div className="mx-auto flex max-w-xl">
          {bottom.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                cn('flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold', isActive ? 'text-bottle-900 [&_svg]:text-gold-600' : 'text-ink-500')
              }
            >
              {i.icon}
              <span className="max-w-full truncate px-1">{i.label}</span>
            </NavLink>
          ))}
          {championship && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn('flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold', moreActive ? 'text-bottle-900 [&_svg]:text-gold-600' : 'text-ink-500')}
            >
              <MoreHorizontal size={20} />
              {m.nav.more}
            </button>
          )}
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={m.nav.more}>
        <div className="flex flex-col gap-1 pb-2">
          {[...more, { to: '/campeonatos', label: m.nav.championships, icon: <Trophy size={20} /> }, { to: '/ajustes', label: m.nav.settings, icon: <Settings size={20} /> }].map((i) => (
            <Link
              key={i.to}
              to={i.to}
              onClick={() => setMoreOpen(false)}
              className="flex min-h-14 items-center gap-3 rounded-xl px-3 text-base font-semibold text-bottle-900 hover:bg-bottle-800/6 [&>svg:first-child]:text-gold-600"
            >
              {i.icon}
              <span className="flex-1">{i.label}</span>
              <ChevronRight size={18} className="text-ink-400" />
            </Link>
          ))}
        </div>
      </Modal>
    </div>
  );
}
