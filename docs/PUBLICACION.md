# Publicación y actualización

- **Dirección pública:** https://urrizpe-mus.github.io/urrizpe-mus/
- **Repositorio:** https://github.com/urrizpe-mus/urrizpe-mus (organización independiente `urrizpe-mus`)
- **Alojamiento:** GitHub Pages, gratuito y con HTTPS.

## Cómo se publica

Cada vez que se sube un cambio a la rama `main`, el flujo `.github/workflows/deploy.yml`:

1. Instala las dependencias (`npm ci`).
2. Ejecuta todas las pruebas (`npm test`). Si alguna falla, **no se publica**.
3. Genera la versión de producción (`npm run build`).
4. La publica en GitHub Pages.

El progreso se ve en la pestaña **Actions** del repositorio. También se puede lanzar a mano con «Run workflow».

## Publicar una nueva versión

```bash
npm test                 # comprobar que todo pasa
npm run build            # comprobar que compila
git add -A
git commit -m "Descripción del cambio"
git push
```

En uno o dos minutos la nueva versión está en Internet. Quien tenga la app abierta o instalada verá el aviso «Hay una nueva versión disponible» y decidirá cuándo actualizar. Los campeonatos guardados no se tocan.

## Ruta base

La app vive en `/urrizpe-mus/`. Está configurado en `vite.config.ts` (`BASE_PATH`, por defecto `/urrizpe-mus/`). Si algún día se usa un dominio propio en la raíz (por ejemplo `urrizpemus.com`), se publica con `BASE_PATH=/` y se configura el dominio en *Settings → Pages → Custom domain*.

`scripts/spa-fallback.mjs` copia `index.html` como `404.html` para que los enlaces directos (por ejemplo `/urrizpe-mus/c/…/cuadro`) abran la app.

## Instalar la PWA

- **Android (Chrome):** menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio».
- **iPhone/iPad (Safari):** botón Compartir → «Añadir a pantalla de inicio».
- **Ordenador (Chrome/Edge):** icono de instalar en la barra de direcciones.
- También desde **Configuración → Instalar la aplicación** dentro de la propia app.

## Ejecutar en local

```bash
npm install
npm run dev        # http://localhost:5173/urrizpe-mus/
```

## Limitaciones actuales y mejoras futuras

- Los datos se guardan solo en el dispositivo; no hay sincronización entre móvil y ordenador (se usa la copia JSON).
- No hay vista pública en directo por Internet: necesitaría una base de datos (por ejemplo Supabase, con plan gratuito). La arquitectura ya está preparada (`ChampionshipRepository`).
- Sin cuentas de usuario ni permisos: quien tenga el dispositivo gestiona sus campeonatos.
- Euskera preparado pero sin traducir.
- Mejoras posibles: cabezas de serie, sorteo manual, editar emparejamientos antes de confirmar, sincronización en la nube, dominio propio.
