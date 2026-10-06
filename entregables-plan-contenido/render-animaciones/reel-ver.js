// Saca cuadros del reel animado a distintos segundos para revisar el diseño sin grabar video.
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
(async () => {
  const guion = JSON.parse(fs.readFileSync(path.join(__dirname, 'muestras', process.argv[2] || 'reel-electrotecnia-45s.json'), 'utf8')), tel = process.argv[3] || '', fotos = process.argv[4] === 'fotos';
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 540, height: 960 } }); const errores = []; p.on('pageerror', (e) => errores.push(e.message));
  await p.goto('file://' + path.join(__dirname, 'reel-prueba.html'));
  const info = await p.evaluate(({ g, tel, fotos }) => {
    const mk = (c1, c2) => { const c = document.createElement('canvas'); c.width = 1600; c.height = 1200; const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 1600, 1200); gr.addColorStop(0, c1); gr.addColorStop(1, c2); x.fillStyle = gr; x.fillRect(0, 0, 1600, 1200); x.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * 1500, Math.random() * 1100, 120, 80); return c; };
    window.__m = ReelMotor.crear(g, { telefono: tel, marca: 'Electrotecnia C&C', fotos: fotos ? [mk('#7a4b00', '#2b1700'), mk('#1d5a7a', '#0b2233')] : [] });
    return { dur: window.__m.duracion, escenas: window.__m.escenas, cortes: window.__m.cortes.length };
  }, { g: guion, tel, fotos });
  console.log(JSON.stringify(info));
  const ts = (process.argv[5] || '1.6,5.2,8,11,14.5,18,22,27,32,36,40,45').split(',').map(Number);
  fs.mkdirSync(path.join(__dirname, 'capturas-reel'), { recursive: true });
  for (const t of ts) { await p.evaluate((t) => { const c = document.getElementById('c'), x = c.getContext('2d'); window.__m.dibujar(x, t, 0.5); }, t); await p.screenshot({ path: path.join(__dirname, 'capturas-reel', 'f' + String(t).replace('.', '_') + '.png') }); }
  console.log('errores:', errores.length ? errores : 'ninguno'); await b.close();
})();
