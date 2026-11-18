import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import type { ChampionshipRepository } from '../storage/repository';
import { indexedDbRepository } from '../storage/indexeddb';
import { loadSettings, saveSettings, type Settings } from '../storage/settings';
import { I18nProvider } from '../i18n';
import { cn } from '../ui/components/ui';

type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: ToastTone;
  text: string;
}

interface AppContextValue {
  repo: ChampionshipRepository;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  toast: (text: string, tone?: ToastTone) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children, repo = indexedDbRepository }: { children: ReactNode; repo?: ChampionshipRepository }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const toast = useCallback((text: string, tone: ToastTone = 'success') => {
    const id = ++counter.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3200);
  }, []);

  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  const value = useMemo(() => ({ repo, settings, updateSettings, toast }), [repo, settings, updateSettings, toast]);

  return (
    <AppContext.Provider value={value}>
      <I18nProvider language={settings.language}>
        {children}
        <div className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite" role="status">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex max-w-md animate-deal items-center gap-2.5 rounded-2xl px-4 py-3 text-[15px] font-semibold shadow-[var(--shadow-lift)]',
                t.tone === 'error' ? 'bg-wine-600 text-white' : t.tone === 'info' ? 'bg-ink-800 text-cream-50' : 'bg-bottle-900 text-cream-50',
              )}
            >
              {t.tone === 'success' ? <CheckCircle2 size={18} className="text-gold-300" /> : t.tone === 'error' ? <AlertTriangle size={18} /> : <Info size={18} />}
              {t.text}
            </div>
          ))}
        </div>
      </I18nProvider>
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp fuera de AppProvider');
  return ctx;
}
