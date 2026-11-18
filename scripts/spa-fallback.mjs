// GitHub Pages no conoce las rutas de la app (/c/…/cuadro). Copiar index.html
// como 404.html hace que cualquier ruta cargue la app, que muestra la pantalla correcta.
import { copyFileSync, writeFileSync } from 'node:fs';
copyFileSync('dist/index.html', 'dist/404.html');
writeFileSync('dist/.nojekyll', '');
console.log('404.html y .nojekyll creados');
