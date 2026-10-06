#!/usr/bin/env node
// Render LOCAL de una animación del Plan de contenido: guion JSON → MP4 (y para destino "web": MP4 liviano + WebM + HTML autocontenido
// + fragmento <video>). Sin video de IA y sin costo por render: Chromium dibuja cada cuadro con el motor y ffmpeg arma el video.
// Uso: node render-animacion.js guion.json [--salida carpeta] [--calidad borrador|normal]
// Requiere: node 18+, el paquete "playwright" (Chromium) y ffmpeg con libx264 y libvpx-vp9 en el PATH.
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { fragmento } = require('./generar-html.js');
const PLANTILLAS = ['flujo', 'esquema', 'antes_despues', 'checklist', 'linea_tiempo', 'numero_grande'];
const MEDIDAS = { historia: [1080, 1920], reel: [1080, 1920], post: [1080, 1080], web: [1280, 720] };
function validar(g) {
  const e = [];
  if (!g || g.version !== 1 || g.tipo !== 'animacion') e.push('No es un guion de animación (version 1).');
  else {
    if (!PLANTILLAS.includes(g.plantilla)) e.push('Plantilla no permitida.');
    if (!MEDIDAS[g.destino]) e.push('Destino no permitido.');
    else if (g.lienzo.ancho !== MEDIDAS[g.destino][0] || g.lienzo.alto !== MEDIDAS[g.destino][1]) e.push('Las medidas no coinciden con el destino.');
    if (!(g.duracion >= 4 && g.duracion <= 40)) e.push('Duración fuera de rango (4 a 40 s).');
    if (!Array.isArray(g.bloques) || !g.bloques.length || g.bloques.length > 8) e.push('Cantidad de bloques inválida.');
  }
  return e;
}
function ffmpeg(args, entrada) {
  return new Promise((ok, mal) => { const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y'].concat(args), { stdio: ['pipe', 'inherit', 'inherit'] }); p.on('error', mal); p.on('close', (c) => c ? mal(new Error('ffmpeg salió con ' + c)) : ok()); entrada(p.stdin); });
}
(async () => {
  const arg = process.argv.slice(2), ruta = arg.find((x) => !x.startsWith('--')), val = (n, d) => { const i = arg.indexOf('--' + n); return i >= 0 ? arg[i + 1] : d; };
  if (!ruta) { console.error('Uso: node render-animacion.js guion.json [--salida carpeta] [--calidad borrador|normal]'); process.exit(1); }
  const g = JSON.parse(fs.readFileSync(ruta, 'utf8')), err = validar(g);
  if (err.length) { console.error('Guion inválido: ' + err.join(' ')); process.exit(1); }
  const salida = path.resolve(val('salida', path.join(__dirname, 'salida'))), calidad = val('calidad', 'normal'), id = String(g.id || 'animacion').replace(/[^a-z0-9_-]/gi, '');
  const nombre = id + '-' + String(g.titulo).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40);
  fs.mkdirSync(salida, { recursive: true });
  let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Falta el paquete playwright (npm i playwright).'); process.exit(1); }
  const FPS = 30, W = g.lienzo.ancho, H = g.lienzo.alto, n = Math.round(g.duracion * FPS), t0 = Date.now();
  const navegador = await chromium.launch(), pagina = await navegador.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await pagina.goto('file://' + path.join(__dirname, 'animacion.html'));
  await pagina.evaluate((guion) => { window.__m = AnimMotor.iniciar(document.getElementById('app'), guion); }, g);
  // 1) cuadros → un solo archivo intermedio de alta calidad (se reutiliza para MP4 y WebM)
  const cuadros = path.join(salida, '.cuadros-' + nombre + '.mjpeg'), ws = fs.createWriteStream(cuadros);
  for (let i = 0; i < n; i++) {                     // el cuadro n (t = duración) no se incluye: así el bucle de "web" cierra sin salto
    await pagina.evaluate((t) => window.__m.dibujar(t), i / FPS);
    ws.write(await pagina.screenshot({ type: 'jpeg', quality: calidad === 'borrador' ? 70 : 95 }));
  }
  await new Promise((r) => ws.end(r)); await navegador.close();
  const tCuadros = Date.now() - t0, web = g.destino === 'web', res = { id: g.id, destino: g.destino, plantilla: g.plantilla, medidas: W + 'x' + H, duracion_s: g.duracion, cuadros: n, archivos: {} };
  const entrada = (p) => fs.createReadStream(cuadros).pipe(p);
  const base = ['-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
  // 2) MP4. Para "web": liviano (objetivo menos de 1.5 MB), sin audio; si se pasa, se sube el CRF hasta entrar.
  const mp4 = path.join(salida, nombre + '.mp4'); let crf = web ? 27 : (calidad === 'borrador' ? 28 : 18);
  for (let intento = 0; intento < 5; intento++) {
    await ffmpeg(base.concat(['-an', '-c:v', 'libx264', '-preset', web ? 'slow' : 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]), entrada);
    if (!web || fs.statSync(mp4).size <= 1.5 * 1048576) break; crf += 3;
  }
  res.archivos.mp4 = { ruta: mp4, mb: +(fs.statSync(mp4).size / 1048576).toFixed(2), crf };
  if (web) {
    const webm = path.join(salida, nombre + '.webm'); let q = 36;
    for (let intento = 0; intento < 4; intento++) {
      await ffmpeg(base.concat(['-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(q), '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', webm]), entrada);
      if (fs.statSync(webm).size <= 1.5 * 1048576) break; q += 3;
    }
    res.archivos.webm = { ruta: webm, mb: +(fs.statSync(webm).size / 1048576).toFixed(2), crf: q };
    fs.writeFileSync(path.join(salida, nombre + '-video.html'), '<video autoplay muted loop playsinline preload="metadata" width="' + W + '" height="' + H + '" aria-label="' + String(g.resumen || g.titulo).replace(/[<>&"]/g, ' ') + '">\n  <source src="' + nombre + '.webm" type="video/webm">\n  <source src="' + nombre + '.mp4" type="video/mp4">\n</video>\n');
    res.archivos.html_video = path.join(salida, nombre + '-video.html');
  }
  if (web || ['checklist', 'linea_tiempo', 'numero_grande'].includes(g.plantilla)) { const h = path.join(salida, nombre + '-autocontenido.html'); fs.writeFileSync(h, fragmento(g)); res.archivos.html_autocontenido = { ruta: h, kb: +(fs.statSync(h).size / 1024).toFixed(1) }; }
  fs.unlinkSync(cuadros);
  res.tiempo_render_s = +((Date.now() - t0) / 1000).toFixed(1); res.tiempo_cuadros_s = +(tCuadros / 1000).toFixed(1);
  try { res.duracion_video_s = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).toString().trim(); } catch (e) {}
  fs.writeFileSync(path.join(salida, nombre + '-resultado.json'), JSON.stringify(res, null, 2));
  console.log(JSON.stringify(res, null, 2));
})().catch((e) => { console.error('FALLÓ el render:', e.message); process.exit(1); });
