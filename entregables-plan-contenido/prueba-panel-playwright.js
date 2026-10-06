const { chromium } = require('playwright');
const API = 'https://autocita-production.up.railway.app';
const store = []; let nid = 1; const log = [];
const sh = '/tmp/claude-0/-home-user-autocita-dashboard/3b0583ac-4acc-5d0d-b14e-f09c5d6bda3f/scratchpad/shots';
require('fs').mkdirSync(sh, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { localStorage.setItem('admin_key_herramientas', 'clave-test'); localStorage.setItem('admin_key_autocita', 'clave-test'); });
  let falla = { publicaciones: 1 };       // la primera vez que se pide "publicaciones" el servidor devuelve 502 (simula caída)
  await ctx.route('**/*', async (route) => {
    const req = route.request(), url = new URL(req.url());
    if (!req.url().startsWith(API)) { if (req.url().startsWith('file:')) return route.continue(); return route.abort(); }
    const path = url.pathname + url.search, m = req.method();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (path.startsWith('/admin/pluggs/plan-contenido/')) {
      const body = req.postData() || '{}';
      if (path.endsWith('/grupo') && JSON.parse(body).grupo === 'publicaciones' && falla.publicaciones > 0) { falla.publicaciones--; log.push('502 simulado en publicaciones'); return route.fulfill({ status: 502, headers: cors, contentType: 'application/json', body: JSON.stringify({ error: 'OpenAI tardó demasiado en responder. Probá de nuevo.' }) }); }
      const r = await fetch('http://127.0.0.1:3999' + path, { method: m, headers: { 'content-type': 'application/json', 'x-admin-key': 'clave-test' }, body });
      return route.fulfill({ status: r.status, headers: cors, contentType: 'application/json', body: await r.text() });
    }
    if (path.startsWith('/admin/pluggs/generaciones')) {
      log.push(m + ' ' + path.split('?')[0].replace(/[0-9a-f-]{36}/, ':id') + (url.search ? url.search : ''));
      const id = (path.match(/generaciones\/([^?]+)/) || [])[1];
      if (m === 'POST') { const b = JSON.parse(req.postData()); const f = { id: '00000000-0000-4000-8000-' + String(nid++).padStart(12, '0'), created_at: new Date().toISOString(), negocio: b.entrada.negocio, formato: b.formato, entrada: b.entrada, variantes: b.variantes, marca: b.marca }; store.push(f); return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(f) }); }
      if (m === 'PATCH') { const b = JSON.parse(req.postData()); const f = store.find((x) => x.id === id); f.variantes = b.variantes; f.entrada = b.entrada; return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(f) }); }
      if (m === 'DELETE') { const i = store.findIndex((x) => x.id === id); if (i >= 0) store.splice(i, 1); return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '{"ok":true}' }); }
      if (m === 'GET' && id) { const f = store.find((x) => x.id === id); return route.fulfill({ status: f ? 200 : 404, headers: cors, contentType: 'application/json', body: JSON.stringify(f || { error: 'No existe' }) }); }
      const fm = url.searchParams.get('formato'); const liv = url.searchParams.get('liviano') === '1';
      return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(store.filter((x) => x.formato === fm).reverse().map((x) => liv ? { id: x.id, created_at: x.created_at, negocio: x.negocio, marca: x.marca, formato: x.formato, entrada: x.entrada } : x)) });
    }
    return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '[]' });
  });
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', (e) => errores.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errores.push('CONSOLE ' + m.text()); });
  await page.goto('file:///home/user/automatia-admin/index.html');
  await page.click('nav button:has-text("Pluggs")');
  await page.click('#gvModoPlan');
  console.log('planCard visible:', await page.isVisible('#planCard'), '| estudio oculto:', !(await page.isVisible('#gvEstudio')));
  await page.fill('#pcNegocio', 'Electrotecnia C&C'); await page.fill('#pcTipo', 'Servicios técnicos: generadores y sistemas contra incendios');
  await page.fill('#pcPublico', 'Empresas, hoteles y condominios en San José y Heredia'); await page.fill('#pcPropuesta', 'Mantenimiento preventivo y correctivo de plantas eléctricas y sistemas contra incendios');
  await page.fill('#pcDatos', 'Los clientes preguntan qué pasa si la planta no arranca cuando se va la luz. Hacemos visitas de revisión. Atendemos San José y Heredia.');
  await page.fill('#pcMonto', '150.000'); await page.fill('#pcReelPrincipal', 'Qué pasa si la planta no arranca');
  await page.click('#pcGenerarBtn');
  await page.waitForFunction(() => /Plan completo|pendientes|pendiente/.test(document.getElementById('pcMensaje').textContent), null, { timeout: 90000 });
  console.log('mensaje final:', await page.textContent('#pcMensaje'));
  console.log('pasos:', (await page.$$eval('#pcPasos li', (l) => l.map((x) => x.textContent))).join(' | '));
  await page.screenshot({ path: sh + '/1-desktop-plan.png', fullPage: false });
  await (await page.$('#pcResultado')).screenshot({ path: sh + '/2-resultado.png' });
  // reintentar el grupo fallido
  await page.click('.pc-tabs button:has-text("Publicaciones")');
  console.log('banner reintento visible:', await page.isVisible('button:has-text("Reintentar este grupo")'));
  await page.click('button:has-text("Reintentar este grupo")');
  await page.waitForFunction(() => /Publicaciones: listo|Todavía faltan/.test(document.getElementById('pcMensaje').textContent), null, { timeout: 60000 });
  console.log('tras reintento:', await page.textContent('#pcMensaje'));
  // abrir carrusel y screenshot
  await page.click('.pc-pieza.t-publicacion details.pc-det summary');
  await page.screenshot({ path: sh + '/3-publicaciones.png' });
  // editar texto y esperar autoguardado
  const antes = log.length;
  const campo = page.locator('.pc-pieza.t-publicacion input[type=text]').first();
  await campo.fill('Titular editado a mano'); await campo.blur();
  await page.waitForFunction(() => /Guardado ✓/.test(document.getElementById('pcEstadoGuardado').textContent), null, { timeout: 8000 });
  console.log('autoguardado:', log.slice(antes).join(' / '), '|', await page.textContent('#pcEstadoGuardado'));
  // seleccionar reels y mandar a Generar video
  await page.click('.pc-tabs button:has-text("Reels")');
  await page.click('button:has-text("Seleccionar todo")'); console.log('cuenta:', await page.textContent('#pcCuenta'));
  await page.click('button:has-text("Mandar a Generar video")');
  console.log('en tarjeta de reel:', await page.evaluate(() => grEstado.variantes.length), '| gvReels visible:', await page.isVisible('#gvReels'), '| val ok primero:', await page.evaluate(() => JSON.stringify(grEstado.variantes[0].val.errores ? grEstado.variantes[0].val.errores.length : grEstado.variantes[0].val.ok)));
  await page.screenshot({ path: sh + '/4-reels-enviados.png' });
  await page.click('#gvModoPlan');
  // carrusel
  await page.click('.pc-tabs button:has-text("Publicaciones")');
  await page.locator('.pc-pieza.t-publicacion .pc-pieza-cab input[type=checkbox]').first().check();
  await page.click('button:has-text("Mandar al generador de carruseles")');
  console.log('carrusel cargado láminas:', await page.evaluate(() => gvEstado.carrusel && gvEstado.carrusel.length), '| titular 1 editado llegó:', await page.evaluate(() => gvEstado.carrusel[0].titular));
  await page.click('#gvModoPlan');
  // descargas
  await page.click('.pc-tabs button:has-text("Historias")');
  const [d] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Descargar .csv")')]);
  const p = await d.path(); const csv = require('fs').readFileSync(p, 'utf8'); console.log('csv historias:', d.suggestedFilename(), csv.split('\n').length, 'líneas;', csv.split('\n')[1].slice(0, 90));
  // animaciones
  await page.click('.pc-tabs button:has-text("Animaciones")');
  await page.click('button:has-text("Generar animación")');
  await page.waitForFunction(() => /Reels local/.test(document.querySelector('.pc-pieza.t-animacion .pc-msg').textContent), null, { timeout: 15000 });
  console.log('animación sin ayudante:', await page.textContent('.pc-pieza.t-animacion .pc-msg'));
  await page.screenshot({ path: sh + '/5-animaciones.png' });
  await page.click('.pc-tabs button:has-text("Pauta")'); await page.screenshot({ path: sh + '/6-pauta.png' });
  await page.click('.pc-tabs button:has-text("Calendario")');
  await (await page.$('#pcPanel')).screenshot({ path: sh + '/7-calendario.png' });
  // recargar y abrir el plan guardado
  await page.reload(); await page.click('nav button:has-text("Pluggs")'); await page.click('#gvModoPlan');
  await page.waitForSelector('.pc-guardado');
  console.log('lista guardados:', await page.$$eval('.pc-guardado .pc-info', (l) => l.map((x) => x.textContent.slice(0, 160))));
  await page.click('.pc-guardado button:has-text("Abrir")');
  console.log('reabierto:', await page.textContent('#pcEstadoGuardado'), '| titular editado persistió:', await page.evaluate(() => pc.plan.publicaciones.some((p) => p.laminas[0].titular === 'Titular editado a mano')));
  // duplicar y borrar
  await page.click('.pc-guardado button:has-text("Duplicar")'); await page.waitForFunction(() => document.querySelectorAll('.pc-guardado').length === 2);
  await page.locator('.pc-guardado button:has-text("Borrar")').first().click.bind(page.locator('.pc-guardado button:has-text("Borrar")').first());
  page.once('dialog', (d) => d.accept()); await page.locator('.pc-guardado button:has-text("Borrar")').first().click();
  await page.waitForFunction(() => document.querySelectorAll('.pc-guardado').length === 1);
  console.log('tras duplicar y borrar quedan:', await page.$$eval('.pc-guardado', (l) => l.length));
  // móvil
  await page.setViewportSize({ width: 390, height: 800 }); await page.click('.pc-tabs button:has-text("Calendario")');
  const ancho = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); console.log('móvil scrollWidth/innerWidth:', ancho);
  await (await page.$('#planCard')).screenshot({ path: sh + '/8-movil.png' });
  console.log('errores de página:', errores.length ? errores : 'ninguno');
  console.log('LOG generaciones:', log.filter((x) => !x.startsWith('PATCH')).concat(['…PATCH x' + log.filter((x) => x.startsWith('PATCH')).length]).join(' | '));
  await browser.close();
})().catch((e) => { console.error('FALLÓ', e); process.exit(1); });
