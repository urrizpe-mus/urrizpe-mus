import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';
import { useT } from '../i18n';
import { Button } from '../ui/components/ui';

/* Instalación PWA ---------------------------------------------------------- */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // la instalación nunca es obligatoria ni intrusiva
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIos(): boolean {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return {
    canInstall: !!deferred,
    installed: isStandalone(),
    install: async () => {
      if (!deferred) return false;
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      listeners.forEach((l) => l());
      return outcome === 'accepted';
    },
  };
}

/* Actualizaciones ---------------------------------------------------------- */

/**
 * El service worker solo guarda la aplicación (HTML, JS, CSS, iconos).
 * Los campeonatos viven en IndexedDB y nunca pasan por la caché, así que
 * una versión antigua de la app no puede sobrescribir datos.
 * Cuando hay una versión nueva se avisa y el usuario decide cuándo recargar.
 */
export function PwaUpdater() {
  const m = useT();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Comprobar actualizaciones cada hora mientras la app esté abierta.
      if (registration) setInterval(() => registration.update().catch(() => undefined), 60 * 60 * 1000);
    },
  });
  if (!needRefresh) return null;
  return (
    <div className="no-print fixed inset-x-3 top-3 z-[70] mx-auto flex max-w-md animate-deal items-center gap-3 rounded-2xl bg-bottle-900 px-4 py-3 text-cream-50 shadow-[var(--shadow-lift)] sm:top-auto sm:bottom-6">
      <RefreshCw size={18} className="shrink-0 text-gold-300" />
      <p className="flex-1 text-sm font-semibold">{m.settings.update}</p>
      <Button size="sm" variant="gold" onClick={() => updateServiceWorker(true)}>
        {m.settings.updateButton}
      </Button>
      <button className="text-xs text-cream-100/70" onClick={() => setNeedRefresh(false)}>
        {m.nav.close}
      </button>
    </div>
  );
}
