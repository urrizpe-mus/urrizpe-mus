# Pruebas

```bash
npm test                    # pruebas automáticas (Vitest)
npm run build && npm run check:responsive   # navegador real en 3 tamaños
```

## Motor (`src/domain/engine.test.ts`)

Para 2, 3, 4, 5, 8, 16, 17, 23, 32, 33, 50, 64, 100 y 128 parejas se genera un sorteo real, se juega el campeonato entero y se comprueba:

1. Todas las parejas inscritas aparecen.
2. Ninguna aparece duplicada.
3. Ninguna desaparece.
4. Cada pareja está en un único enfrentamiento por ronda.
5. Los pases directos son correctos.
6. Los partidos previos son los correctos.
7. Las que avanzan completan exactamente la siguiente ronda.
8. Cada partido elimina a una única pareja.
9. Las ganadoras avanzan al partido y lado correctos.
10. Las perdedoras quedan eliminadas.
11. La final produce una única campeona.
12. No se pueden registrar dos ganadoras distintas sin corregir.
13. Corregir no modifica las ramas independientes.
- Total de partidos = P − 1.
- La regla N ≤ P ≤ 2N se comprueba para **todas** las combinaciones de 2 a 256 parejas y cuadros de 2 a 32.
- Ejemplos obligatorios: 50/32, 23/16, 16/16 y 100/32.
- Uniformidad estadística de Fisher-Yates (prueba χ² sobre 48 000 barajados) y reparto imparcial de los pases directos.

## Campeonato y datos

- `championship.test.ts`: numeración estable, bloqueo del cuadro confirmado, descartar sorteos sin confirmar, historial, alta por lista y búsqueda.
- `storage.test.ts`: 14) los datos siguen tras cerrar y abrir; una revisión antigua no pisa datos nuevos; campeonatos separados; 15) exportar e importar ida y vuelta, rechazo de archivos inválidos y limpieza de textos.

## Interfaz (`src/test/ui-flow.test.tsx`)

Crear campeonato, añadir parejas (lista), sortear, confirmar el cuadro, seleccionar ganadoras hasta la final, corregir una ganadora, consultar la clasificación (sin puntos ni tantos), recuperar los datos guardados, gestionar parejas (añadir, editar, buscar, eliminar), aviso de parejas insuficientes e importar una copia.

## Navegador real (`scripts/responsive-check.mjs`)

Con Chrome en **móvil (390×844)**, **tablet (820×1180)** y **ordenador (1440×900)**: crea un campeonato de 23 parejas, sortea, confirma, registra partidos y recorre las 11 pantallas. Falla si hay errores de JavaScript, si algo se sale horizontalmente de la pantalla o si los botones de ganadora miden menos de 40 px de alto en táctil.
