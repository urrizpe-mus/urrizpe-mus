// Sustituto de «virtual:pwa-register/react» en las pruebas (no hay service worker en jsdom).
export function useRegisterSW() {
  const noop = () => undefined;
  return { needRefresh: [false, noop], offlineReady: [false, noop], updateServiceWorker: async () => undefined };
}
