/* Motor de REELS ANIMADOS (06/10/2026). Dibuja en canvas 2D un guion de reel (contrato ReelGuion v1: gancho, desarrollo, valor, cta,
 * etiquetas Mito/Realidad/Error 1/Paso 2…, mockups de WhatsApp, agenda y pedido) con movimiento de verdad: texto que entra palabra por
 * palabra, cortes con barrido o golpe de zoom, números y checks que aparecen animados, chats que se arman mensaje por mensaje, fotos
 * reales de fondo con movimiento lento y cierre con teléfono. Es DETERMINISTA: dibujar(ctx, t, escala) pinta el cuadro del segundo t,
 * así que sirve para la vista previa y para grabar el video cuadro por cuadro. Sin librerías. Todo texto se dibuja con fillText.
 * Zona segura de Reels (1080×1920): 70 px a los lados, 270 arriba y 480 abajo, y el carril derecho de botones (x > 930). */
(function (root) {
  'use strict';
  var F = '"Inter","SF Pro Display","Segoe UI","Helvetica Neue",Roboto,Arial,sans-serif';
  var W = 1080, H = 1920, X0 = 70, XW = 860, Y0 = 270, Y1 = 1440;
  var PAL = {
    automatia: { fondo: '#10261C', fondo2: '#1B4332', texto: '#FFFFFF', apoyo: '#CFE5D8', acento: '#F2A66B', claro: false },
    autocita: { fondo: '#0F2A22', fondo2: '#2F6B4F', texto: '#FFFFFF', apoyo: '#D5F3E4', acento: '#4ADE9B', claro: false },
    autoventas: { fondo: '#14301F', fondo2: '#2D6A4F', texto: '#FFFFFF', apoyo: '#D8EBDD', acento: '#F7BE96', claro: false },
    noche: { fondo: '#101418', fondo2: '#1E2A36', texto: '#FFFFFF', apoyo: '#C8D2DC', acento: '#FFD23F', claro: false },
    vino: { fondo: '#2A0F1A', fondo2: '#4A1B2E', texto: '#FFFFFF', apoyo: '#F1D5DC', acento: '#FF9F6B', claro: false },
    azul: { fondo: '#0E1F3A', fondo2: '#173A6B', texto: '#FFFFFF', apoyo: '#D2E4F7', acento: '#5CD0FF', claro: false },
    crema: { fondo: '#F7F3EA', fondo2: '#E9E2D0', texto: '#1D2B24', apoyo: '#4A5A52', acento: '#B4531F', claro: true },
    sol: { fondo: '#FFF4D6', fondo2: '#FFE29A', texto: '#2B2110', apoyo: '#5C4A22', acento: '#C2410C', claro: true },
  };
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function prog(t, t0, d) { return clamp((t - t0) / d, 0, 1); }
  function eOut(x) { return 1 - Math.pow(1 - x, 3); }
  function eInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eBack(x) { var c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function rgbDe(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(h, a) { var c = rgbDe(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mezcla(h1, h2, k) { var a = rgbDe(h1), b = rgbDe(h2); return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * k) + ',' + Math.round(a[1] + (b[1] - a[1]) * k) + ',' + Math.round(a[2] + (b[2] - a[2]) * k) + ')'; }
  function fuente(peso, px) { return peso + ' ' + Math.round(px) + 'px ' + F; }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function envolver(ctx, texto, maxW) {
    var pal = String(texto).split(/\s+/).filter(Boolean), lineas = [], act = '';
    pal.forEach(function (p) { var prueba = act ? act + ' ' + p : p; if (ctx.measureText(prueba).width <= maxW || !act) act = prueba; else { lineas.push(act); act = p; } });
    if (act) lineas.push(act); return lineas;
  }
  // Texto en palabras posicionadas (para animarlas una por una). align: 'left' | 'center'.
  function maquetar(ctx, texto, destacado, ancho, altoMax, max, min, peso, lh, align) {
    var size = max, lineas = [];
    for (; size >= min; size -= 4) { ctx.font = fuente(peso, size); lineas = envolver(ctx, texto, ancho); if (lineas.length * size * lh <= altoMax) break; }
    ctx.font = fuente(peso, size);
    var hi = {}; norm(destacado).split(' ').forEach(function (w) { if (w) hi[w] = true; });
    var palabras = [], idx = 0, espacio = ctx.measureText(' ').width;
    lineas.forEach(function (ln, li) {
      var ws = ln.split(' '), anchos = ws.map(function (w) { return ctx.measureText(w).width; }), total = anchos.reduce(function (a, b) { return a + b; }, 0) + espacio * (ws.length - 1);
      var x = align === 'center' ? (ancho - total) / 2 : 0;
      ws.forEach(function (w, k) { palabras.push({ t: w, x: x, y: li * size * lh, w: anchos[k], hi: !!hi[norm(w)] && norm(w) !== '', i: idx++ }); x += anchos[k] + espacio; });
    });
    return { size: size, palabras: palabras, alto: lineas.length * size * lh, lh: lh, peso: peso };
  }
  function esNumerada(et) { var m = norm(et).match(/^(error|paso|verdad)?\s?(\d{1,2})$/); return m ? { palabra: m[1] || '', n: m[2] } : null; }
  function tipoDe(e) {
    if (e.rol === 'gancho') return 'gancho';
    if (e.rol === 'cta') return 'cta';
    if (e.mockup && e.mockup.tipo) return 'mock';
    var et = norm(e.etiqueta);
    if (esNumerada(e.etiqueta)) return 'num';
    if (et === 'mito') return 'mito'; if (et === 'realidad') return 'realidad';
    if (et === 'antes' || et === 'sin') return 'antes'; if (et === 'despues' || et === 'con') return 'despues';
    return 'generico';
  }

  function crear(guion, opc) {
    opc = opc || {};
    var P = PAL[opc.paleta || guion.paleta] || PAL.noche, esc = (guion.escenas || []).slice(0, 30), fotos = (opc.fotos || []).filter(Boolean);
    var tel = String(opc.telefono || '').trim(), marca = String(opc.marca || '').trim().slice(0, 40), eco = guion.loop && guion.loop.eco ? String(guion.loop.eco) : '';
    var mc = document.createElement('canvas').getContext('2d');
    var ESC = [], t = 0, TX = P.texto, AP = P.apoyo, AC = P.acento, ALERTA = P.claro ? '#C2261F' : '#FF6B5E';
    esc.forEach(function (e, i) {
      var dur = clamp(Number(e.dur) || 2.5, 1.4, 6), tipo = tipoDe(e), S = { i: i, e: e, tipo: tipo, ini: t, dur: dur, fin: t + dur };
      var num = esNumerada(e.etiqueta), texto = String(e.texto || '');
      if (tipo === 'gancho') { S.txt = maquetar(mc, texto, e.destacado, XW, 760, 150, 74, '900', 1.06, 'center'); }
      else if (tipo === 'cta') { S.txt = maquetar(mc, texto, e.destacado, XW - 80, 330, 104, 56, '900', 1.08, 'center'); }
      else if (tipo === 'mock') { S.txt = maquetar(mc, texto, e.destacado, XW, 210, 70, 42, '800', 1.1, 'left'); }
      else { S.txt = maquetar(mc, texto, e.destacado, XW, tipo === 'num' ? 470 : 520, 108, 56, '800', 1.08, 'left'); }
      if (e.apoyo) { mc.font = fuente('600', 46); S.apoyoL = envolver(mc, e.apoyo, XW).slice(0, 3); }
      S.num = num; ESC.push(S); t += dur;
    });
    var TOTAL = t;
    // Cortes: se alternan el barrido de color y el golpe de zoom con destello
    var CORTES = ESC.slice(1).map(function (S, k) { return { t: S.ini, tipo: k % 2 === 0 ? 'barrido' : 'golpe' }; });

    function foto(ctx, img, tl, dur, variante) {
      var k = 1.06 + 0.12 * clamp(tl / dur, 0, 1), esc = Math.max(W / img.width, H / img.height) * k, iw = img.width * esc, ih = img.height * esc;
      var dx = (variante % 2 ? -1 : 1) * 40 * clamp(tl / dur, 0, 1);
      ctx.drawImage(img, (W - iw) / 2 + dx, (H - ih) / 2, iw, ih);
    }
    function fondo(ctx, S, tl, tg) {
      var i = S.i, v = i % 5, ang = [0.9, 1.9, 0.4, 2.4, 1.3][v];
      var g = ctx.createLinearGradient(W / 2 - Math.cos(ang) * 1100, H / 2 - Math.sin(ang) * 1100, W / 2 + Math.cos(ang) * 1100, H / 2 + Math.sin(ang) * 1100);
      var mal = S.tipo === 'antes' || S.tipo === 'mito';
      g.addColorStop(0, mal ? mezcla(P.fondo, '#000000', 0.25) : P.fondo); g.addColorStop(1, mal ? mezcla(P.fondo2, '#000000', 0.35) : P.fondo2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      var img = fotos.length && S.tipo !== 'cta' ? fotos[i % fotos.length] : null;
      if (img) {
        foto(ctx, img, tl, S.dur, i);
        var o = ctx.createLinearGradient(0, 0, 0, H); o.addColorStop(0, rgba(P.fondo, 0.78)); o.addColorStop(0.5, rgba(P.fondo, 0.62)); o.addColorStop(1, rgba(P.fondo, 0.86)); ctx.fillStyle = o; ctx.fillRect(0, 0, W, H);
      } else {
        ctx.save(); ctx.globalAlpha = 1;
        if (v === 0) { for (var k = 0; k < 3; k++) { var r = 380 + k * 230 + 18 * Math.sin(tg * 0.8 + k); ctx.strokeStyle = rgba(AC, 0.10 - k * 0.025); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(880 + 30 * Math.sin(tg * 0.5), 560 + 24 * Math.cos(tg * 0.4), r, 0, 6.2832); ctx.stroke(); } }
        else if (v === 1) { ctx.fillStyle = rgba(TX, 0.07); for (var gx = 40; gx < W; gx += 70) for (var gy = 40; gy < H; gy += 70) { ctx.beginPath(); ctx.arc(gx + ((tg * 8) % 70), gy, 2.4, 0, 6.2832); ctx.fill(); } var gl = ctx.createRadialGradient(240, 1500, 0, 240, 1500, 780); gl.addColorStop(0, rgba(AC, 0.20)); gl.addColorStop(1, rgba(AC, 0)); ctx.fillStyle = gl; ctx.fillRect(0, 700, W, 1220); }
        else if (v === 2) { ctx.strokeStyle = rgba(AC, 0.12); ctx.lineWidth = 6; for (var l = 0; l < 7; l++) { var yy = ((l * 290 + tg * 160) % 2200) - 140; ctx.beginPath(); ctx.moveTo(-100, yy); ctx.lineTo(W + 100, yy - 260); ctx.stroke(); } }
        else if (v === 3) { for (var q = 0; q < 5; q++) { ctx.strokeStyle = rgba(TX, 0.06); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W + 80, H - 120, 260 + q * 170 + 10 * Math.sin(tg + q), 0, 6.2832); ctx.stroke(); } var gl2 = ctx.createRadialGradient(W, 0, 0, W, 0, 900); gl2.addColorStop(0, rgba(AC, 0.22)); gl2.addColorStop(1, rgba(AC, 0)); ctx.fillStyle = gl2; ctx.fillRect(0, 0, W, 1000); }
        else { for (var s = 0; s < 4; s++) { ctx.fillStyle = rgba(AC, 0.05 + s * 0.012); ctx.beginPath(); var ox = 120 + s * 260 + 24 * Math.sin(tg * 0.6 + s), oy = 400 + s * 260; ctx.moveTo(ox, oy); ctx.lineTo(ox + 340, oy + 80); ctx.lineTo(ox + 90, oy + 380); ctx.closePath(); ctx.fill(); } }
        ctx.restore();
      }
    }
    function chip(ctx, texto, x, y, color, tl, ini, tamano) {
      var p = eBack(prog(tl, ini, 0.4)); if (p <= 0) return;
      ctx.save(); ctx.font = fuente('900', tamano || 34); var w = ctx.measureText(texto).width + 56, h = (tamano || 34) * 1.75;
      ctx.translate(x, y + h / 2); ctx.scale(p, p); ctx.globalAlpha = clamp(p, 0, 1); rr(ctx, 0, -h / 2, w, h, h / 2); ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = P.claro && color === AC ? '#FFFFFF' : (color === AC ? P.fondo : '#FFFFFF'); ctx.textBaseline = 'middle'; ctx.fillText(texto, 28, 2); ctx.restore(); return w;
    }
    function palabras(ctx, S, x0, y0, tl, ini, opciones) {
      opciones = opciones || {}; var T = S.txt, n = T.palabras.length, paso = Math.min(0.09, 0.9 / Math.max(n, 1)), ultimo = ini + (n - 1) * paso + 0.4;
      ctx.save(); ctx.textBaseline = 'alphabetic';
      T.palabras.forEach(function (w) {
        var p = prog(tl, ini + w.i * paso, 0.38), s = 0.72 + 0.28 * eBack(p), a = eOut(p); if (a <= 0) return;
        var cx = x0 + w.x + w.w / 2, by = y0 + w.y + T.size * 0.9;
        ctx.save(); ctx.translate(cx, by - T.size * 0.3); ctx.scale(s, s); ctx.globalAlpha = a * (opciones.alfa == null ? 1 : opciones.alfa); ctx.translate(0, (1 - a) * 36); ctx.font = fuente(T.peso, T.size);
        if (!P.claro) { ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4; }
        ctx.fillStyle = w.hi ? AC : TX; ctx.fillText(w.t, -w.w / 2, T.size * 0.3); ctx.restore();
        if (w.hi) { var u = eOut(prog(tl, ultimo, 0.45)); if (u > 0) { ctx.fillStyle = AC; rr(ctx, x0 + w.x, by + T.size * 0.1, w.w * u, Math.max(6, T.size * 0.07), 4); ctx.fill(); } }
      });
      if (opciones.tachar) {                      // el "mito" se tacha línea por línea cuando ya se leyó
        var tp = prog(tl, opciones.tachar, 0.7), lineasY = {}; T.palabras.forEach(function (w) { var k = w.y; (lineasY[k] = lineasY[k] || { x: w.x, x2: w.x + w.w }).x2 = w.x + w.w; });
        var keys = Object.keys(lineasY), tot = keys.length, kk = 0; ctx.strokeStyle = ALERTA; ctx.lineWidth = Math.max(8, T.size * 0.09); ctx.lineCap = 'round';
        keys.forEach(function (k) { var pr = clamp(tp * tot - kk, 0, 1), L = lineasY[k], y = y0 + Number(k) + T.size * 0.62; if (pr > 0) { ctx.beginPath(); ctx.moveTo(x0 + L.x, y); ctx.lineTo(x0 + L.x + (L.x2 - L.x) * pr, y); ctx.stroke(); } kk++; });
      }
      ctx.restore(); return ultimo;
    }
    function apoyo(ctx, S, x, y, tl, ini) {
      if (!S.apoyoL) return; var p = eOut(prog(tl, ini, 0.5)); if (p <= 0) return;
      ctx.save(); ctx.globalAlpha = p; ctx.font = fuente('600', 46); ctx.fillStyle = AP; ctx.textBaseline = 'alphabetic';
      S.apoyoL.forEach(function (ln, k) { ctx.fillText(ln, x, y + k * 58 + (1 - p) * 24); }); ctx.restore();
    }
    function icono(ctx, tipo, cx, cy, r, tl, ini, color) {
      var p = eBack(prog(tl, ini, 0.5)); if (p <= 0) return; var d = eOut(prog(tl, ini + 0.15, 0.4));
      ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p); ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = tipo === 'check' && color === AC ? (P.claro ? '#FFFFFF' : P.fondo) : '#FFFFFF'; ctx.lineWidth = r * 0.17; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      if (tipo === 'check') { ctx.moveTo(-r * 0.42, 0); ctx.lineTo(-r * 0.1, r * 0.34); ctx.lineTo(-r * 0.42 + (r * 0.95) * d * 0.9 + r * 0.3 * (1 - d), -r * 0.3 * d + r * 0.34 * (1 - d)); }
      else { ctx.moveTo(-r * 0.36, -r * 0.36); ctx.lineTo(-r * 0.36 + r * 0.72 * d, -r * 0.36 + r * 0.72 * d); ctx.moveTo(r * 0.36, -r * 0.36); ctx.lineTo(r * 0.36 - r * 0.72 * d, -r * 0.36 + r * 0.72 * d); }
      ctx.stroke(); ctx.restore();
    }
    function explosion(ctx, cx, cy, tl, ini, color) {
      var p = prog(tl, ini, 0.7); if (p <= 0 || p >= 1) return; ctx.save(); for (var k = 0; k < 14; k++) { var a = k * 6.2832 / 14, d = 80 + 260 * eOut(p); ctx.globalAlpha = 1 - p; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 10 * (1 - p) + 3, 0, 6.2832); ctx.fill(); } ctx.restore();
    }
    // ── Mockups ─────────────────────────────────────────────────────────────────────────────────────────
    function tarjeta(ctx, x, y, w, h, p) { ctx.save(); ctx.globalAlpha = p; ctx.shadowColor = 'rgba(0,0,0,0.38)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18; rr(ctx, x, y, w, h, 44); ctx.fillStyle = P.claro ? '#FFFFFF' : '#F4F6F4'; ctx.fill(); ctx.restore(); }
    function mockWhatsapp(ctx, m, x, y, w, tl) {
      var p = eOut(prog(tl, 0.2, 0.5)), msgs = (m.chat || []).slice(0, 4); var h = 120 + msgs.length * 190; tarjeta(ctx, x, y + (1 - p) * 60, w, h, p);
      ctx.save(); ctx.globalAlpha = p; ctx.translate(0, (1 - p) * 60); rr(ctx, x, y, w, 96, 44); ctx.fillStyle = '#1F7A5C'; ctx.fill(); ctx.fillRect(x, y + 60, w, 36);
      ctx.font = fuente('800', 38); ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle'; ctx.fillText('WhatsApp', x + 40, y + 50); ctx.restore();
      var yy = y + 130;
      msgs.forEach(function (c, k) {
        var ini = 0.8 + k * 0.95, esCli = c.de === 'cliente', ap = eBack(prog(tl, ini, 0.4)); ctx.font = fuente('600', 38); var L = envolver(ctx, c.texto || '', w - 190).slice(0, 3), bw = Math.min(w - 110, Math.max.apply(null, L.map(function (s) { return ctx.measureText(s).width; })) + 56), bh = L.length * 50 + 40;
        if (!esCli && tl < ini + 0.05 && tl > ini - 0.6) { var tp = prog(tl, ini - 0.6, 0.5); ctx.save(); ctx.globalAlpha = tp * (1 - prog(tl, ini - 0.1, 0.1)); for (var d = 0; d < 3; d++) { ctx.fillStyle = '#7A8A83'; ctx.beginPath(); ctx.arc(x + w - 120 + d * 30, yy + 24 - 8 * Math.abs(Math.sin(tl * 9 + d)), 9, 0, 6.2832); ctx.fill(); } ctx.restore(); }
        if (ap > 0) {
          var bx = esCli ? x + 30 : x + w - 30 - bw; ctx.save(); ctx.globalAlpha = clamp(ap, 0, 1); ctx.translate(bx + bw / 2, yy + bh / 2); ctx.scale(0.7 + 0.3 * ap, 0.7 + 0.3 * ap);
          rr(ctx, -bw / 2, -bh / 2, bw, bh, 30); ctx.fillStyle = esCli ? '#FFFFFF' : '#CFF3DD'; ctx.fill(); if (esCli) { ctx.strokeStyle = '#DDE3DF'; ctx.lineWidth = 2; ctx.stroke(); }
          ctx.fillStyle = '#16201B'; ctx.font = fuente('600', 38); ctx.textBaseline = 'middle'; L.forEach(function (s, j) { ctx.fillText(s, -bw / 2 + 28, -bh / 2 + 20 + 25 + j * 50); }); ctx.restore();
        }
        yy += bh + 28;
      });
    }
    function mockAgenda(ctx, m, x, y, w, tl) {
      var filas = (m.agenda || []).slice(0, 5), p = eOut(prog(tl, 0.2, 0.5)), h = 150 + filas.length * 132; tarjeta(ctx, x, y + (1 - p) * 60, w, h, p);
      ctx.save(); ctx.translate(0, (1 - p) * 60); ctx.globalAlpha = p; ctx.font = fuente('900', 40); ctx.fillStyle = '#16201B'; ctx.textBaseline = 'middle'; ctx.fillText('Agenda de hoy', x + 44, y + 70);
      filas.forEach(function (f, k) {
        var a = eBack(prog(tl, 0.7 + k * 0.45, 0.4)); if (a <= 0) return; var ry = y + 132 + k * 132; ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(0, (1 - clamp(a, 0, 1)) * 30);
        var col = f.estado === 'libre' ? '#FFFFFF' : (f.estado === 'nuevo' ? AC : '#C9D2CD'); rr(ctx, x + 36, ry, w - 72, 106, 30); ctx.fillStyle = f.estado === 'libre' ? '#F0F3F1' : '#E7ECE9'; ctx.fill();
        ctx.fillStyle = '#16201B'; ctx.font = fuente('900', 40); ctx.fillText(f.hora || '', x + 70, ry + 53); ctx.font = fuente('700', 38); ctx.fillText(f.etiqueta || '', x + 230, ry + 53);
        var pw = 170; rr(ctx, x + w - 36 - 24 - pw, ry + 28, pw, 50, 25); ctx.fillStyle = col; ctx.fill(); if (f.estado === 'libre') { ctx.strokeStyle = '#9AA7A0'; ctx.lineWidth = 2; ctx.stroke(); }
        ctx.fillStyle = f.estado === 'nuevo' ? (P.claro ? '#FFFFFF' : P.fondo) : '#33413A'; ctx.font = fuente('800', 28); ctx.textAlign = 'center'; ctx.fillText(String(f.estado || '').toUpperCase(), x + w - 60 - pw / 2, ry + 54); ctx.textAlign = 'left'; ctx.restore();
      }); ctx.restore();
    }
    function mockPedido(ctx, m, x, y, w, tl) {
      var ped = m.pedido || { items: [], estado: '' }, items = (ped.items || []).slice(0, 4), p = eOut(prog(tl, 0.2, 0.5)), h = 250 + items.length * 120; tarjeta(ctx, x, y + (1 - p) * 60, w, h, p);
      ctx.save(); ctx.translate(0, (1 - p) * 60); ctx.globalAlpha = p; ctx.font = fuente('900', 40); ctx.fillStyle = '#16201B'; ctx.textBaseline = 'middle'; ctx.fillText('Pedido', x + 44, y + 70);
      items.forEach(function (it, k) {
        var a = eBack(prog(tl, 0.7 + k * 0.45, 0.4)); if (a <= 0) return; var ry = y + 132 + k * 120; ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(0, (1 - clamp(a, 0, 1)) * 30);
        rr(ctx, x + 36, ry, w - 72, 96, 28); ctx.fillStyle = '#E7ECE9'; ctx.fill(); ctx.fillStyle = '#16201B'; ctx.font = fuente('700', 38); ctx.fillText(String(it.producto || '').slice(0, 24), x + 66, ry + 49); ctx.font = fuente('900', 38); ctx.textAlign = 'right'; ctx.fillText('x' + (Number(it.cantidad) || 1), x + w - 66, ry + 49); ctx.textAlign = 'left'; ctx.restore();
      });
      var a2 = eBack(prog(tl, 0.9 + items.length * 0.45, 0.45)); if (a2 > 0) { ctx.globalAlpha = clamp(a2, 0, 1); rr(ctx, x + 36, y + h - 96, w - 72, 66, 33); ctx.fillStyle = AC; ctx.fill(); ctx.fillStyle = P.claro ? '#FFFFFF' : P.fondo; ctx.font = fuente('900', 34); ctx.textAlign = 'center'; ctx.fillText(String(ped.estado || '').toUpperCase(), x + w / 2, y + h - 62); ctx.textAlign = 'left'; }
      ctx.restore();
    }
    // ── Escenas ────────────────────────────────────────────────────────────────────────────────────────
    function escena(ctx, S, t) {
      var tl = t - S.ini - 0.12, tg = t, punch = 1 + 0.10 * (1 - eOut(prog(tl, -0.12, 0.42)));
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(punch, punch); ctx.translate(-W / 2, -H / 2);
      fondo(ctx, S, tl + 0.12, tg);
      var T = S.txt, tipo = S.tipo;
      if (tipo === 'gancho') {
        var x = X0, y = 855 - T.alto / 2 - (S.apoyoL ? 50 : 0);
        var barra = eOut(prog(tl, 0, 0.5)); ctx.fillStyle = AC; rr(ctx, W / 2 - 95 * barra, y - 70, 190 * barra, 14, 7); ctx.fill();
        ctx.save(); var z = 1 + 0.018 * Math.sin(tl * 2.2); ctx.translate(W / 2, 855); ctx.scale(z, z); ctx.translate(-W / 2, -855); palabras(ctx, S, x, y, tl, 0.05); ctx.restore();
        apoyo(ctx, S, X0 + 20, y + T.alto + 70, tl, 1.0);
      } else if (tipo === 'cta') {
        var pulso = 1 + 0.03 * Math.sin(tl * 5), cy = 470, ch = tel ? 1010 : 800;
        ctx.save(); ctx.translate(W / 2, cy + ch / 2); ctx.scale(pulso, pulso); ctx.translate(-W / 2, -(cy + ch / 2));
        var pcard = eBack(prog(tl, 0, 0.5)); ctx.globalAlpha = clamp(pcard, 0, 1);
        for (var r = 0; r < 3; r++) { var rp = (tl * 0.9 + r / 3) % 1; ctx.strokeStyle = rgba(AC, 0.35 * (1 - rp)); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(W / 2, cy + 190, 140 + rp * 520, 0, 6.2832); ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.restore();
        palabras(ctx, S, X0 + 40, 510 + (tel ? 0 : 60), tl, 0.1);
        if (tel) {
          var pt = eBack(prog(tl, 1.0, 0.5)); if (pt > 0) { ctx.save(); ctx.translate(W / 2, 1090); ctx.scale(pt, pt); ctx.globalAlpha = clamp(pt, 0, 1); ctx.font = fuente('900', 108); var tw = ctx.measureText(tel).width + 100; rr(ctx, -tw / 2, -82, tw, 164, 82); ctx.fillStyle = AC; ctx.fill(); ctx.fillStyle = P.claro ? '#FFFFFF' : P.fondo; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillText(tel, 0, 6); ctx.restore(); }
          var fl = eOut(prog(tl, 1.3, 0.5)); if (fl > 0) { ctx.save(); ctx.globalAlpha = fl; ctx.font = fuente('700', 44); ctx.fillStyle = TX; ctx.textAlign = 'center'; ctx.fillText('WhatsApp', W / 2, 1245); ctx.restore(); }
        }
        if (eco) { var ec = eOut(prog(tl, 1.7, 0.6)); if (ec > 0) { ctx.save(); ctx.globalAlpha = ec * 0.95; ctx.font = fuente('700', 46); ctx.fillStyle = AP; ctx.textAlign = 'center'; ctx.fillText(eco, W / 2, tel ? 1340 : 1180); ctx.restore(); } }
        apoyo(ctx, S, X0 + 20, tel ? 1385 : 1250, tl, 1.5);
      } else if (tipo === 'num') {
        var apH = S.apoyoL ? 70 + S.apoyoL.length * 58 : 0, bloque = 190 + T.alto + apH, yB = clamp(840 - bloque / 2, 330, 640);
        var n = S.num, cxn = X0 + 82, cyn = yB + 82; var pn = eBack(prog(tl, 0.02, 0.5));
        ctx.save(); ctx.globalAlpha = 0.07; ctx.font = fuente('900', 760); ctx.fillStyle = TX; ctx.textAlign = 'right'; ctx.fillText(n.n, 1040, 1150); ctx.restore();
        if (pn > 0) { ctx.save(); ctx.translate(cxn, cyn); ctx.scale(pn, pn); ctx.beginPath(); ctx.arc(0, 0, 82, 0, 6.2832); ctx.fillStyle = AC; ctx.fill(); ctx.font = fuente('900', 92); ctx.fillStyle = P.claro ? '#FFFFFF' : P.fondo; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n.n, 0, 6); ctx.restore(); }
        if (n.palabra) chip(ctx, String(S.e.etiqueta).replace(/\s?\d+$/, '').toUpperCase(), cxn + 120, cyn - 30, 'rgba(255,255,255,0.14)', tl, 0.15, 36);
        palabras(ctx, S, X0, yB + 190, tl, 0.2); apoyo(ctx, S, X0 + 10, yB + 190 + T.alto + 70, tl, 1.1);
      } else if (tipo === 'mock') {
        var et = S.e.etiqueta ? chip(ctx, String(S.e.etiqueta).toUpperCase(), X0, 320, AC, tl, 0.05, 30) : 0;
        palabras(ctx, S, X0, 400, tl, 0.1);
        var m = S.e.mockup, my = 400 + T.alto + 50;
        if (m.tipo === 'whatsapp') mockWhatsapp(ctx, m, X0 + 30, my, XW - 60, tl); else if (m.tipo === 'agenda') mockAgenda(ctx, m, X0 + 30, my, XW - 60, tl); else mockPedido(ctx, m, X0 + 30, my, XW - 60, tl);
        apoyo(ctx, S, X0 + 10, 1395, tl, 2.0);
      } else {
        var color = tipo === 'mito' || tipo === 'antes' ? ALERTA : AC, texto = tipo === 'generico' ? String(S.e.etiqueta || '').toUpperCase() : (tipo === 'mito' ? 'MITO' : tipo === 'realidad' ? 'REALIDAD' : tipo === 'antes' ? String(S.e.etiqueta).toUpperCase() : String(S.e.etiqueta).toUpperCase());
        var apH2 = S.apoyoL ? 70 + S.apoyoL.length * 58 : 0, bloque2 = 130 + T.alto + apH2, yC = clamp(840 - bloque2 / 2, 330, 640), ty = yC + 130;
        if (texto) chip(ctx, texto, X0, yC, color, tl, 0.05, 40);
        var tachar = tipo === 'mito' ? Math.max(0.9, 0.2 + S.txt.palabras.length * 0.09 + 0.5) : 0;
        palabras(ctx, S, X0, ty, tl, 0.2, { tachar: tachar, alfa: tipo === 'mito' ? 1 - 0.35 * eOut(prog(tl, tachar, 0.6)) : 1 });
        apoyo(ctx, S, X0 + 10, ty + T.alto + 70, tl, 1.1);
        if (tipo === 'mito') icono(ctx, 'x', 870, yC + 40, 70, tl, 0.4, ALERTA);
        if (tipo === 'realidad' || tipo === 'despues') { icono(ctx, 'check', 870, yC + 40, 70, tl, 0.4, AC); explosion(ctx, 870, yC + 40, tl, 0.4, AC); }
      }
      ctx.restore();
    }
    function corte(ctx, c, t) {
      var d = t - c.t; if (c.tipo === 'barrido') {
        var p = prog(t, c.t - 0.2, 0.5); if (p <= 0 || p >= 1) return; var cx = -0.9 * W + 2.8 * W * eInOut(p), sk = 260;
        ctx.save(); ctx.fillStyle = AC; ctx.beginPath(); ctx.moveTo(cx - 0.9 * W + sk, 0); ctx.lineTo(cx + 0.9 * W + sk, 0); ctx.lineTo(cx + 0.9 * W - sk, H); ctx.lineTo(cx - 0.9 * W - sk, H); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgba(P.fondo, 0.5); ctx.beginPath(); ctx.moveTo(cx + 0.9 * W + sk - 50, 0); ctx.lineTo(cx + 0.9 * W + sk + 40, 0); ctx.lineTo(cx + 0.9 * W - sk + 40, H); ctx.lineTo(cx + 0.9 * W - sk - 50, H); ctx.closePath(); ctx.fill(); ctx.restore();
      } else { var f = 1 - prog(d, 0, 0.28); if (d >= -0.02 && f > 0) { ctx.fillStyle = rgba('#FFFFFF', 0.6 * f); ctx.fillRect(0, 0, W, H); } }
    }
    function dibujar(ctx, t, escala) {
      t = clamp(t, 0, TOTAL - 0.001); var k = escala || 1; ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      var idx = 0; for (var i = 0; i < ESC.length; i++) { if (t >= ESC[i].ini + (i ? 0.05 : 0)) idx = i; }
      escena(ctx, ESC[idx], t);
      CORTES.forEach(function (c) { if (t > c.t - 0.3 && t < c.t + 0.4) corte(ctx, c, t); });
      // progreso del reel y marca
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; rr(ctx, X0, 292, XW, 8, 4); ctx.fill(); ctx.fillStyle = AC; rr(ctx, X0, 292, Math.max(8, XW * t / TOTAL), 8, 4); ctx.fill();
      if (marca) { ctx.font = fuente('700', 30); ctx.fillStyle = rgba(TX, 0.72); ctx.textBaseline = 'alphabetic'; ctx.fillText(marca, X0, 1415); }
      ctx.restore();
    }
    return { dibujar: dibujar, duracion: TOTAL, ancho: W, alto: H, cortes: CORTES.map(function (c) { return c.t; }), escenas: ESC.length };
  }
  // Whoosh sintético en cada corte (opcional): ruido con filtro que barre de grave a agudo.
  function whoosh(ac, destino, cuando) {
    var n = ac.sampleRate * 0.42, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var src = ac.createBufferSource(); src.buffer = buf; var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(300, cuando); f.frequency.exponentialRampToValueAtTime(3200, cuando + 0.34);
    var g = ac.createGain(); g.gain.setValueAtTime(0.0001, cuando); g.gain.exponentialRampToValueAtTime(0.95, cuando + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.4); src.connect(f); f.connect(g); g.connect(destino); src.start(cuando);
  }
  root.ReelMotor = { crear: crear, whoosh: whoosh, PALETAS: PAL };
})(typeof window !== 'undefined' ? window : this);
