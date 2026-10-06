// Saca capturas del motor (a mitad y al final de cada animación) para revisar el diseño sin renderizar video.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
(async () => {
  const navegador = await chromium.launch(), carpeta = path.join(__dirname, 'capturas'); fs.mkdirSync(carpeta, { recursive: true });
  for (const f of fs.readdirSync(path.join(__dirname, 'muestras')).filter((x) => x.endsWith('.json'))) {
    const g = JSON.parse(fs.readFileSync(path.join(__dirname, 'muestras', f), 'utf8'));
    const p = await navegador.newPage({ viewport: { width: g.lienzo.ancho, height: g.lienzo.alto } });
    const errores = []; p.on('pageerror', (e) => errores.push(e.message));
    await p.goto('file://' + path.join(__dirname, 'animacion.html'));
    await p.evaluate((x) => { window.__m = AnimMotor.iniciar(document.getElementById('app'), x); }, g);
    for (const [nom, t] of [['mitad', g.duracion * 0.55], ['final', g.duracion - 1.3]]) { await p.evaluate((s) => window.__m.dibujar(s), t); await p.screenshot({ path: path.join(carpeta, f.replace('.json', '') + '-' + nom + '.png') }); }
    console.log(f, errores.length ? 'ERRORES ' + errores.join('|') : 'ok'); await p.close();
  }
  await navegador.close();
})();
