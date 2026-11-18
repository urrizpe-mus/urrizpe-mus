# URRIZPE MUS

Aplicación web para organizar **campeonatos de mus por parejas**: inscripción, sorteo imparcial, cuadro de eliminatorias, registro de ganadoras y clasificación. Funciona en ordenador, tablet y móvil, y se puede instalar como aplicación (PWA).

> La aplicación **solo registra qué pareja gana cada partido**. No pide puntos, tantos, juegos ni marcadores: todo lo demás (avance, eliminación, cuadro y clasificación) se calcula solo.

## Funciones

- **Campeonatos ilimitados**, cada uno con sus parejas, sorteos, resultados, clasificación e historial.
- **Parejas** con número único y fijo, nombre opcional y dos integrantes. Alta una a una o pegando una lista.
- **Cualquier número de parejas** (de 2 a 256). Cuadro principal de 32, 16, 8, 4 o 2 con fases previas y pases directos automáticos.
- **Sorteo imparcial**: Fisher-Yates con `crypto.getRandomValues()`. Se guarda fecha, identificador, participantes, emparejamientos, exentas y configuración.
- **Registro de ganadoras** con un toque, confirmación opcional y **corrección** que anula solo los partidos posteriores de esa rama.
- **Cuadro visual** con líneas de conexión (ordenador) y vista por rondas deslizable (móvil).
- **Clasificación** por ronda alcanzada, con posiciones compartidas (p. ej. 5.º–8.º).
- **Exportación**: cuadro, clasificación y parejas en PDF; parejas en CSV; copia completa en JSON; página HTML de solo consulta para compartir; impresión.
- **Vista de consulta** a pantalla completa para proyectar durante el campeonato.
- **PWA**: instalable, funciona sin conexión una vez cargada.

## Requisitos

- Node.js 20 o superior y npm.

## Instalación y uso local

```bash
npm install
npm run dev          # servidor de desarrollo en http://localhost:5173
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Comprueba tipos y genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve `dist/` en local (con service worker). |
| `npm test` | Ejecuta todas las pruebas automáticas (Vitest). |
| `npm run check:responsive` | Abre la app en Chrome real en móvil, tablet y ordenador, crea un campeonato, juega partidos, hace capturas en `screenshots/` y falla si algo se sale de la pantalla. Requiere Chrome (`CHROME_PATH`). |
| `npm run icons` | Regenera favicon e iconos PWA a partir del emblema. |

## Documentación

- [Arquitectura y funcionamiento](docs/ARQUITECTURA.md): módulos, motor de eliminatorias, sorteo, registro de ganadoras, datos, exportación y PWA.
- [Publicación y actualización](docs/PUBLICACION.md): GitHub, Vercel, dominio y cómo publicar nuevas versiones.
- [Pruebas](docs/PRUEBAS.md): qué se prueba y cómo.

## Datos y privacidad

Los campeonatos se guardan **en el navegador del dispositivo** (IndexedDB). No se envían a ningún servidor y **no se sincronizan** entre dispositivos: para pasar un campeonato del móvil al ordenador, exporta la copia JSON e impórtala en el otro. No hay cuentas de usuario: quien tenga acceso al dispositivo y al navegador puede gestionar sus campeonatos.

## Tecnologías

React 19 · TypeScript · Vite · Tailwind CSS 4 · Lucide · jsPDF · vite-plugin-pwa (Workbox) · Vitest · Testing Library · Vercel.
