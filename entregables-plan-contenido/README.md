# Plan de contenido: entrega (06/10/2026)

Cambios de código (en los clones de los repos privados, SIN commit): `Autocita/index.js` (backend autocita-api) y `automatia-admin/index.html` (panel).
En esta carpeta: `archivos-completos/` y los `.patch` (no se suben a este repo público; ver `.gitignore`).

## Qué hay para ver
- `planes-simulados/`: plan de la clínica y de Electrotecnia C&C con IA SIMULADA (textos de relleno; prueban el pipeline real).
- `capturas/`: el panel funcionando. `render-animaciones/capturas/`: diseño de las 6 plantillas.
- `prueba-*.js`: IA simulada, orquestador y prueba del panel en Chromium (se pueden correr de nuevo).

## Animaciones (render local, sin video de IA)
`render-animaciones/anim-motor.js` dibuja las 6 plantillas (flujo, esquema, antes_despues, checklist, linea_tiempo, numero_grande) de forma determinista.
- Render: `node render-animacion.js muestras/a1-web-flujo.json` (requiere playwright y ffmpeg con libx264 y libvpx-vp9).
- Para `web`: MP4 + WebM livianos (< 1.5 MB, 1280×720, 8 a 12 s, sin audio, bucle sin salto), fragmento `<video>` y HTML autocontenido.
- `servidor-local-animacion.js`: gancho para `POST /animacion` en tu ayudante local (2 líneas, ver el archivo).
- Muestras renderizadas en `salida/` (historia, post cuadrado y web).

## Orden de deploy
1. SQL: ninguno (confirmá que `pluggs_generaciones` no tenga CHECK sobre `formato` o `marca`).
2. Backend `Autocita/index.js` → Railway (autocita-api).
3. Panel `automatia-admin/index.html` → Vercel.
4. Copiar `render-animaciones/` a `~/autocita-panel/render-reels/animaciones/` y conectar `/animacion` en `servidor-local.js`.
