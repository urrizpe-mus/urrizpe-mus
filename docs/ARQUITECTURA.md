# Arquitectura de URRIZPE MUS

## Estructura

```
src/
  domain/      Motor del campeonato. TypeScript puro, sin React ni almacenamiento.
    types.ts         Modelo de datos (Championship, Pair, Bracket, Match, DrawRecord…)
    rounds.ts        Matemática de rondas: fases previas, pases directos, P − 1 partidos
    random.ts        Aleatoriedad criptográfica y Fisher-Yates
    draw.ts          Estrategias de sorteo (hoy: aleatoria) y registro del sorteo
    bracket.ts       Cuadro fijo, avance, registro y corrección de ganadoras, integridad
    standings.ts     Estados de parejas, clasificación y estadísticas
    pairs.ts         Validación, limpieza de textos, búsqueda y alta por lista
    championship.ts  Operaciones del campeonato (inmutables, con historial)
  storage/     Persistencia
    repository.ts    Contrato de almacenamiento (preparado para la nube)
    indexeddb.ts     Implementación local con control de revisiones
    settings.ts      Preferencias (localStorage)
  io/          Importación y exportación
    backup.ts        Copias JSON y validación estricta al importar
    pdf.ts           PDF de cuadro, clasificación y parejas; CSV
    html.ts          Página HTML autónoma de solo consulta
  i18n/        Textos de la interfaz (es.ts) preparados para euskera
  state/       Estado de React: app (ajustes, avisos), campeonato activo, PWA
  ui/          Interfaz: componentes, cuadro, partidos, pantallas y marca
```

La interfaz nunca modifica datos directamente: llama a funciones de `domain/championship.ts`, que devuelven un campeonato nuevo, y `state/championship.tsx` lo guarda en orden (una operación tras otra).

## Motor de eliminatorias

Para P parejas y un cuadro principal de N parejas (N = 2, 4, 8, 16 o 32):

1. Si **P < N**, se avisa y no se crea nada (no se inventan parejas). Se recomienda el mayor N que no supere P.
2. Si **P > N**, la primera fase previa lleva P a la mayor potencia de 2 menor que P. En cada transición de E parejas a T plazas (con T ≤ E ≤ 2T):
   - partidos = E − T
   - parejas que juegan = 2 · (E − T)
   - pases directos = 2T − E
3. Después se añaden fases previas completas hasta llegar a N, y desde N el cuadro principal hasta la final.

Ejemplos verificados por las pruebas:

| Parejas | Cuadro | Rondas |
|---|---|---|
| 50 | 32 | Previa 50→32 (18 partidos, 14 exentas) · 32 · 16 · 8 · 4 · 2 |
| 23 | 16 | Previa 23→16 (7 partidos, 9 exentas) · 16 · 8 · 4 · 2 |
| 16 | 16 | Octavos (8 partidos) · cuartos · semis · final |
| 100 | 32 | Previa 1: 100→64 (36 partidos, 28 exentas) · Previa 2: 64→32 · dieciseisavos… |

El total de partidos siempre es **P − 1** y solo hay pases directos en la primera ronda.

### Cuadro fijo

La primera ronda tiene T «unidades» (T = plazas de la ronda siguiente). Cada unidad es un partido o un pase directo. La unidad en la posición p alimenta el lado (p mod 2) del partido ⌊p/2⌋ de la siguiente ronda, y así sucesivamente: el cuadro es un árbol binario completo, fijo desde el sorteo. Cada partido guarda de dónde viene cada lado (`pair`, `bye` o `match`); quién ocupa un lado se **calcula** a partir de los resultados, nunca se copia. Por eso no pueden aparecer duplicados ni incoherencias.

`bracketIntegrityErrors()` comprueba la estructura (cada pareja una vez, partidos por ronda, referencias, resultados válidos). Se ejecuta al generar el cuadro, al importar copias y en las pruebas.

## Sorteo

- `createCryptoRandom()` usa `crypto.getRandomValues()` con **muestreo por rechazo** (sin sesgo de módulo).
- `fisherYates()` baraja todas las parejas.
- La posición de los partidos y los pases directos en la primera ronda también se baraja: ni el número, ni el nombre, ni el orden de inscripción influyen. Las pruebas comprueban estadísticamente la uniformidad.
- El sorteo queda **sin confirmar** hasta que el usuario lo confirma. Se puede repetir o descartar. Con el cuadro confirmado, un nuevo sorteo exige escribir «SORTEO»; el anterior se archiva en `previousDraws`.
- Se registran: identificador, fecha y hora, método, participantes, orden, distribución, rondas y configuración.
- **Preparado para el futuro**: una estrategia de sorteo (`DrawStrategyImpl`) solo decide el orden y la distribución. Cabezas de serie, sorteo manual o editar emparejamientos antes de confirmar se añaden como nuevas estrategias sin tocar el motor.

## Registro de ganadoras

- Solo se registra **qué pareja gana**. `recordWinner()` rechaza partidos sin las dos parejas, parejas que no juegan ese partido y partidos ya decididos (hay que «Corregir»).
- La ganadora pasa automáticamente al partido fijo que le corresponde; la perdedora queda eliminada; en la final, la ganadora es campeona.
- Los pases directos aparecen como «Pase directo», avanzan solos y no suman victorias.
- **Corrección**: `correctWinner()` cambia la ganadora (o deja el partido pendiente) y anula solo los partidos posteriores **ya decididos** de esa rama. El resto del cuadro no cambia. Antes se muestra qué partidos se anularán.

## Clasificación

Las parejas se ordenan por la ronda alcanzada. Las eliminadas en la misma ronda comparten posición: en una ronda de E parejas y T plazas, las perdedoras ocupan T+1 a E (semifinalistas 3.º–4.º, cuartofinalistas 5.º–8.º…). No se inventan desempates.

## Datos

- **IndexedDB** (`urrizpe-mus` → `championships`). Cada campeonato es un documento completo.
- Cada guardado comprueba la **revisión** dentro de la misma transacción: una pestaña o copia antigua no puede pisar datos más nuevos (se recargan y se avisa). Las pestañas se avisan entre sí con `BroadcastChannel`.
- Se pide almacenamiento persistente (`navigator.storage.persist()`).
- **Historial** de cambios en cada campeonato (hasta 1000 entradas).
- **Preparado para la nube**: `ChampionshipRepository` es la única puerta de acceso a datos. Para Supabase u otra base de datos basta con escribir otra implementación (`list`, `get`, `save` con revisión, `overwrite`, `remove`) y pasarla a `<App repo={…} />`. Sincronizar entre dispositivos, usuarios y vista pública en directo requieren ese backend.

## Exportación e importación

- **JSON**: `{ app: "urrizpe-mus", kind: "backup", schemaVersion: 1, championships: [...] }`. Al importar se valida todo (tipos, parejas, números repetidos, coherencia del cuadro) y se limpian caracteres de control. Si el campeonato ya existe se elige entre importar como copia o sobrescribir (con aviso).
- **PDF** (jsPDF, en el navegador): el cuadro se reparte en hojas A4 apaisadas de hasta 4 rondas y 8 cruces; la última hoja enlaza las ramas hasta la campeona.
- **CSV** con «;» para Excel en español y protección contra fórmulas.
- **HTML de consulta**: página autónoma sin JavaScript, para compartir.

## PWA y funcionamiento sin conexión

- Manifest con nombre, iconos (normales y «maskable»), colores de marca y pantalla de inicio.
- Service worker (Workbox) que guarda **solo la aplicación**. Los datos nunca pasan por la caché, así que una versión antigua no puede sobrescribirlos.
- Actualizaciones: cuando hay una versión nueva se muestra un aviso y el usuario decide cuándo recargar.
- Sin conexión funciona todo (crear, sortear, registrar, consultar, exportar). Hace falta conexión para la primera carga y para recibir actualizaciones. No hay sincronización entre dispositivos.

## Seguridad

- Sin secretos ni claves en el código. Sin peticiones a servidores externos (fuentes incluidas en el propio paquete).
- Cabeceras en Vercel: CSP estricta, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Los nombres se muestran siempre como texto (React y el HTML exportado escapan el contenido).
- Operaciones destructivas con confirmación: borrar campeonatos, nuevo sorteo (escribir «SORTEO»), borrar todo (escribir «BORRAR»), sobrescribir al importar.

## Idiomas

Todos los textos están en `src/i18n/es.ts`. Para añadir euskera: crear `eu.ts` con el tipo `Messages`, registrarlo en `src/i18n/index.tsx` y habilitar la opción en Configuración. Los mensajes del historial y de error del motor están en español.

## Decisiones técnicas

- **Componentes base propios en lugar de la CLI de shadcn/ui**: mismo estilo y accesibilidad (diálogos con foco, Escape, roles), sin añadir Radix y una docena de dependencias para pocos componentes.
- **jsPDF** para PDF reales y nítidos (vectoriales), sin depender del diálogo de impresión.
- **Fuentes autoalojadas** (Fraunces y Manrope) para que funcionen sin conexión y sin enviar datos a terceros.
