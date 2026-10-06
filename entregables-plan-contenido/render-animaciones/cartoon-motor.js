/* CartoonMotor — reel cartoon dibujado en canvas 2D, determinista: dibujar(ctx, t, k) con t en segundos.
 *
 * Cuatro estilos (A sitcom plano, B fábula con animalitos, C recortes de papel, D cómic pop con mascota). Personajes ORIGINALES dibujados
 * con formas simples: nada de piel amarilla ni ojos saltones. Cada escena trae quién habla (a|b), el texto del globo, la expresión,
 * la acción y el fondo (listas cerradas). El motor no usa imágenes de IA ni recursos externos: todo se dibuja con trazos.
 * Se usa igual para la vista previa, las miniaturas y la grabación del video (MediaRecorder + captureStream) en el navegador.
 *
 *   var m = CartoonMotor.crear(guion, { telefono:'8888 8888', marca:'Nombre' });   // → { duracion, cortes, dibujar(ctx,t,k) }
 *   CartoonMotor.miniatura(canvas, 'comic');                                       // un cuadro de muestra de ese estilo
 * guion = { estilo, escenas:[{ personaje:'a'|'b', texto, expresion, accion, fondo, dur }], cta?:{texto} , negocio }
 */
(function (global) {
  'use strict';
  var W = 1080, H = 1920;
  var EXPRESIONES = ['neutral', 'feliz', 'triste', 'sorprendido', 'enojado', 'pensando', 'guiño'];
  var ACCIONES = ['quieto', 'saludar', 'señalar', 'saltar', 'caminar', 'celebrar', 'temblar'];
  var FONDOS = ['oficina', 'taller', 'calle', 'casa', 'exterior'];

  // ── Estilos: reparto fijo + paleta + trazo ───────────────────────────────────────────────────────────
  var ESTILOS = {
    sitcom: {
      nombre: 'Sitcom plano', ayuda: 'Contorno grueso, caras muy expresivas, humor cotidiano.',
      reparto: { a: { tipo: 'duena', nombre: 'La dueña' }, b: { tipo: 'cliente', nombre: 'El cliente' } },
      contorno: '#1f1b2d', grosor: 9, sombra: false, textura: 'ninguna',
      fondos: { oficina: ['#fde7c8', '#f5c98f'], taller: ['#d9e8f5', '#a9c7e3'], calle: ['#cfeaf7', '#9fd0ea'], casa: ['#f8dcdc', '#eeb6b6'], exterior: ['#c9eefc', '#f6f1c1'] },
      suelo: '#c9a27a', globo: '#ffffff', texto: '#1f1b2d', acento: '#ff6b57', fuente: '"Trebuchet MS","Arial Rounded MT Bold","Helvetica Neue",Arial,sans-serif',
    },
    fabula: {
      nombre: 'Fábula con animalitos', ayuda: 'Suave, tipo cuento ilustrado, con moraleja.',
      reparto: { a: { tipo: 'buho', nombre: 'El búho' }, b: { tipo: 'zorro', nombre: 'El zorro' } },
      contorno: '#5b3d2a', grosor: 4, sombra: false, textura: 'granulo',
      fondos: { oficina: ['#f6ead3', '#e8d3a8'], taller: ['#e9dfc7', '#cdb98f'], calle: ['#dff0e0', '#b8d8b4'], casa: ['#f7e1d3', '#ebc3a8'], exterior: ['#cfe8f3', '#bfe2b0'] },
      suelo: '#a9c98d', globo: '#fffaf0', texto: '#4a3222', acento: '#d9822b', fuente: 'Georgia,"Palatino Linotype","Times New Roman",serif',
    },
    recortes: {
      nombre: 'Recortes de papel', ayuda: 'Capas con sombra, colores cálidos, aire artesanal.',
      reparto: { a: { tipo: 'duena', nombre: 'La dueña' }, b: { tipo: 'robot', nombre: 'El robot asistente' } },
      contorno: null, grosor: 0, sombra: true, textura: 'papel',
      fondos: { oficina: ['#ffd9a8', '#ffb877'], taller: ['#ffe3a3', '#f4b45a'], calle: ['#ffd2b0', '#f08f6c'], casa: ['#ffd6d0', '#f2a39a'], exterior: ['#ffe8b5', '#9fd6c0'] },
      suelo: '#d98f5c', globo: '#fffdf6', texto: '#4a2c1b', acento: '#2f8f83', fuente: '"Avenir Next","Trebuchet MS",Arial,sans-serif',
    },
    comic: {
      nombre: 'Cómic pop con mascota', ayuda: 'Color fuerte, puntos de imprenta, mascota propia.',
      reparto: { a: { tipo: 'calendario', nombre: 'La mascota' }, b: { tipo: 'duena', nombre: 'La dueña' } },
      contorno: '#111111', grosor: 10, sombra: false, textura: 'puntos',
      fondos: { oficina: ['#ffe14d', '#ffb800'], taller: ['#5cd0ff', '#2c8bff'], calle: ['#ff6fb5', '#ff3d8b'], casa: ['#b58cff', '#7a4dff'], exterior: ['#6ee7c8', '#16b7a0'] },
      suelo: '#222222', globo: '#ffffff', texto: '#111111', acento: '#ff2d55', fuente: '"Impact","Arial Black","Helvetica Neue",Arial,sans-serif',
    },
  };

  // ── Utilidades ───────────────────────────────────────────────────────────────────────────────────────
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function suave(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function rebote(x) { x = clamp(x, 0, 1); var c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function hash(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
  function mezcla(c1, c2, f) {
    var a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16), r = [];
    for (var i = 16; i >= 0; i -= 8) r.push(Math.round(((a >> i) & 255) * (1 - f) + ((b >> i) & 255) * f));
    return '#' + r.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  // Rellena y, si el estilo tiene contorno, traza. Con "sombra" (recortes) cada forma proyecta sombra de papel.
  function pintar(ctx, est, fill) {
    if (est.sombra) { ctx.save(); ctx.shadowColor = 'rgba(70,35,10,0.32)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 7; ctx.shadowOffsetY = 9; ctx.fillStyle = fill; ctx.fill(); ctx.restore(); }
    else { ctx.fillStyle = fill; ctx.fill(); }
    if (est.contorno) { ctx.lineWidth = est.grosor; ctx.strokeStyle = est.contorno; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  }
  function miembro(ctx, est, x1, y1, x2, y2, grosor, color) {
    ctx.lineCap = 'round';
    if (est.sombra) { ctx.save(); ctx.strokeStyle = 'rgba(70,35,10,0.30)'; ctx.lineWidth = grosor; ctx.beginPath(); ctx.moveTo(x1 + 6, y1 + 8); ctx.lineTo(x2 + 6, y2 + 8); ctx.stroke(); ctx.restore(); }
    if (est.contorno) { ctx.strokeStyle = est.contorno; ctx.lineWidth = grosor + est.grosor * 1.6; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    ctx.strokeStyle = color; ctx.lineWidth = grosor; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function elipse(ctx, est, x, y, rx, ry, fill, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); pintar(ctx, est, fill); }
  function poli(ctx, est, pts, fill) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); pintar(ctx, est, fill); }

  // ── Caras ────────────────────────────────────────────────────────────────────────────────────────────
  // modo: 'ojos' (redondos), 'led' (robot), 'grandes' (búho)
  function cara(ctx, est, cx, cy, r, expr, boca, mira, parpadeo, modo) {
    var ex = r * 0.36, ey = cy - r * 0.08, er = modo === 'grandes' ? r * 0.3 : r * 0.2, c = est.contorno || '#2a1a12';
    var lw = Math.max(3, r * 0.07);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var s = -1; s <= 1; s += 2) {
      var ox = cx + s * ex, abre = parpadeo ? 0.1 : 1, guinio = expr === 'guiño' && s === 1;
      if (modo === 'led') {
        ctx.fillStyle = '#10222b'; rr(ctx, ox - er * 1.15, ey - er * 1.05 * abre, er * 2.3, er * 2.1 * abre, er * 0.5); ctx.fill();
        ctx.fillStyle = expr === 'enojado' ? '#ff7a7a' : (expr === 'triste' ? '#8fb7ff' : '#7dffd8');
        if (guinio) { ctx.fillRect(ox - er * 0.8, ey - lw * 0.5, er * 1.6, lw); } else { rr(ctx, ox - er * 0.75, ey - er * 0.7 * abre, er * 1.5, er * 1.4 * abre, er * 0.4); ctx.fill(); }
      } else if (guinio || expr === 'feliz' && modo !== 'grandes') {
        ctx.strokeStyle = c; ctx.lineWidth = lw * 1.2; ctx.beginPath(); ctx.arc(ox, ey + er * 0.35, er * 0.95, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      } else {
        var ry = er * (expr === 'sorprendido' ? 1.25 : 1) * abre;
        ctx.beginPath(); ctx.ellipse(ox, ey, er * (expr === 'sorprendido' ? 1.1 : 1), Math.max(1.5, ry), 0, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
        if (est.contorno) { ctx.lineWidth = lw * 0.8; ctx.strokeStyle = c; ctx.stroke(); }
        if (!parpadeo) { ctx.beginPath(); ctx.arc(ox + mira * er * 0.35, ey + (expr === 'pensando' ? -er * 0.3 : 0), er * (expr === 'sorprendido' ? 0.36 : 0.5), 0, Math.PI * 2); ctx.fillStyle = '#1b1313'; ctx.fill(); ctx.beginPath(); ctx.arc(ox + mira * er * 0.35 + er * 0.16, ey - er * 0.2, er * 0.14, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); }
      }
      // cejas
      if (modo !== 'led') {
        ctx.strokeStyle = c; ctx.lineWidth = lw * 1.1; ctx.beginPath();
        var by = ey - er * 1.55, bx0 = ox - er * 0.9, bx1 = ox + er * 0.9, dy0 = 0, dy1 = 0;
        if (expr === 'enojado') { dy0 = s === -1 ? -er * 0.35 : er * 0.45; dy1 = -dy0 * 0.6; if (s === 1) { var t0 = dy0; dy0 = dy1 * -1; dy1 = -t0 * -1; } dy0 = s === -1 ? -er * 0.4 : er * 0.4; dy1 = s === -1 ? er * 0.4 : -er * 0.4; }
        else if (expr === 'triste') { dy0 = s === -1 ? er * 0.35 : -er * 0.1; dy1 = s === -1 ? -er * 0.1 : er * 0.35; }
        else if (expr === 'sorprendido') { by -= er * 0.55; }
        else if (expr === 'pensando') { by -= s === 1 ? er * 0.6 : 0; dy0 = s === 1 ? er * 0.1 : 0; }
        ctx.moveTo(bx0, by + dy0); ctx.quadraticCurveTo(ox, by - er * 0.25 + (dy0 + dy1) / 2, bx1, by + dy1); ctx.stroke();
      }
    }
    // boca
    var my = cy + r * 0.42, ancho = r * 0.5, abierta = clamp(boca, 0, 1);
    ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.fillStyle = modo === 'led' ? '#7dffd8' : '#5a1f1f';
    if (modo === 'led') {
      ctx.fillStyle = '#10222b'; rr(ctx, cx - ancho * 0.8, my - r * 0.06, ancho * 1.6, r * 0.2 + abierta * r * 0.22, r * 0.08); ctx.fill();
      ctx.fillStyle = '#7dffd8'; rr(ctx, cx - ancho * 0.6, my, ancho * 1.2, r * 0.07 + abierta * r * 0.14, r * 0.04); ctx.fill();
    } else if (expr === 'sorprendido' || abierta > 0.45) {
      var h = r * (0.1 + abierta * 0.3) * (expr === 'sorprendido' ? 1.25 : 1);
      ctx.beginPath(); ctx.ellipse(cx, my + h * 0.3, expr === 'sorprendido' ? r * 0.2 : ancho * 0.5, h, 0, 0, Math.PI * 2); ctx.fill(); if (est.contorno) ctx.stroke();
      if (expr !== 'sorprendido') { ctx.fillStyle = '#ff8f8f'; ctx.beginPath(); ctx.ellipse(cx, my + h * 0.75, ancho * 0.32, h * 0.38, 0, 0, Math.PI * 2); ctx.fill(); }
    } else if (expr === 'feliz' || expr === 'guiño') {
      ctx.beginPath(); ctx.moveTo(cx - ancho * 0.7, my - r * 0.04); ctx.quadraticCurveTo(cx, my + r * (0.28 + abierta * 0.4), cx + ancho * 0.7, my - r * 0.04); ctx.stroke();
    } else if (expr === 'triste') {
      ctx.beginPath(); ctx.moveTo(cx - ancho * 0.5, my + r * 0.12); ctx.quadraticCurveTo(cx, my - r * 0.12, cx + ancho * 0.5, my + r * 0.12); ctx.stroke();
    } else if (expr === 'enojado') {
      ctx.beginPath(); ctx.moveTo(cx - ancho * 0.5, my + r * 0.08 + abierta * r * 0.1); ctx.lineTo(cx + ancho * 0.5, my + r * 0.02); ctx.stroke();
    } else if (expr === 'pensando') {
      ctx.beginPath(); ctx.moveTo(cx - ancho * 0.3, my + r * 0.05); ctx.quadraticCurveTo(cx + ancho * 0.2, my - r * 0.06, cx + ancho * 0.65, my + r * 0.1); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(cx - ancho * 0.45, my + r * 0.05); ctx.lineTo(cx + ancho * 0.45, my + r * 0.05); ctx.stroke();
    }
    if (est.sombra === false && modo !== 'led' && (expr === 'feliz' || expr === 'guiño')) { ctx.fillStyle = 'rgba(255,120,120,0.35)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.6, cy + r * 0.28, r * 0.17, r * 0.1, 0, 0, Math.PI * 2); ctx.ellipse(cx + r * 0.6, cy + r * 0.28, r * 0.17, r * 0.1, 0, 0, Math.PI * 2); ctx.fill(); }
  }

  // ── Personajes (origen en los pies, y negativo hacia arriba; S = alto total) ────────────────────────────
  // e = { expr, boca, accion, t (tiempo local), mira (-1 izq, 1 der), lado (-1 izq, 1 der) }
  function brazos(ctx, est, e, S, hombro, color, mano, largo) {
    var t = e.t, d = e.lado === -1 ? 1 : -1;          // d: hacia dónde mira (hacia el otro personaje)
    var hx = S * 0.2, hy = -S * hombro, L = S * (largo || 0.3);
    var izq = [-hx, hy, -hx - L * 0.45, hy + L * 0.95], der = [hx, hy, hx + L * 0.45, hy + L * 0.95];
    var vivo = (d === 1) ? der : izq, quieto = (d === 1) ? izq : der;
    if (e.accion === 'saludar') { var w = Math.sin(t * 9) * L * 0.25; vivo = [vivo[0], vivo[1], vivo[0] + d * L * 0.55 + w, hy - L * 0.85]; }
    else if (e.accion === 'señalar') { vivo = [vivo[0], vivo[1], vivo[0] + d * L * 1.35, hy - L * 0.1 + Math.sin(t * 6) * L * 0.05]; }
    else if (e.accion === 'celebrar') { var a2 = Math.sin(t * 11) * L * 0.15; izq = [izq[0], izq[1], izq[0] - L * 0.45 - a2, hy - L * 1.0]; der = [der[0], der[1], der[0] + L * 0.45 + a2, hy - L * 1.0]; vivo = (d === 1) ? der : izq; quieto = (d === 1) ? izq : der; }
    else if (e.accion === 'caminar') { var sw = Math.sin(t * 7) * L * 0.3; izq[2] += sw; der[2] -= sw; }
    else if (e.accion === 'temblar') { izq[2] += Math.sin(t * 40) * 6; der[2] += Math.cos(t * 40) * 6; }
    else if (e.hablando) { vivo[2] += d * L * 0.2 + Math.sin(t * 5) * L * 0.12; vivo[3] -= L * 0.25 + Math.abs(Math.sin(t * 5)) * L * 0.12; }
    [izq, der].forEach(function (b) { miembro(ctx, est, b[0], b[1], b[2], b[3], S * 0.075, color); elipse(ctx, est, b[2], b[3], S * 0.055, S * 0.055, mano); });
  }
  function piernas(ctx, est, e, S, color, zapato, ancho) {
    var sw = e.accion === 'caminar' ? Math.sin(e.t * 7) * S * 0.07 : 0, a = ancho || 0.1;
    miembro(ctx, est, -S * a, -S * 0.22, -S * a + sw, -S * 0.03, S * 0.085, color); miembro(ctx, est, S * a, -S * 0.22, S * a - sw, -S * 0.03, S * 0.085, color);
    elipse(ctx, est, -S * a + sw - S * 0.02, -S * 0.015, S * 0.085, S * 0.04, zapato); elipse(ctx, est, S * a - sw + S * 0.02, -S * 0.015, S * 0.085, S * 0.04, zapato);
  }
  var PIEL = ['#f2c9a0', '#d9a273', '#b9774c', '#8a5638'];
  function humano(ctx, est, e, S, v) {       // v: { piel, pelo, camisa, pantalon, tipoPelo, casco, mono }
    piernas(ctx, est, e, S, v.pantalon, '#2b2b36');
    // cuerpo
    ctx.beginPath(); rr(ctx, -S * 0.2, -S * 0.66, S * 0.4, S * 0.46, S * 0.12); pintar(ctx, est, v.camisa);
    if (v.mono) { ctx.beginPath(); rr(ctx, -S * 0.12, -S * 0.6, S * 0.24, S * 0.12, S * 0.03); pintar(ctx, est, mezcla(v.camisa, '#ffffff', 0.25)); }
    brazos(ctx, est, e, S, 0.6, v.camisa, v.piel, 0.3);
    // cuello y cabeza
    var hy = -S * 0.8, r = S * 0.2;
    ctx.fillStyle = v.piel; ctx.fillRect(-S * 0.04, -S * 0.7, S * 0.08, S * 0.07);
    if (v.tipoPelo === 'larga') {       // dos mechones a los lados (no un bloque bajo la cara, que parecería barba)
      [-1, 1].forEach(function (sd) { ctx.beginPath(); rr(ctx, sd * r * 0.92 - r * 0.24, hy - r * 0.7, r * 0.48, r * 2.05, r * 0.24); pintar(ctx, est, v.pelo); });
      ctx.beginPath(); ctx.arc(0, hy - r * 0.05, r * 1.12, 0, Math.PI * 2); pintar(ctx, est, v.pelo);
    }
    elipse(ctx, est, 0, hy, r, r * 1.06, v.piel);
    elipse(ctx, est, -r * 0.98, hy + r * 0.1, r * 0.17, r * 0.22, v.piel); elipse(ctx, est, r * 0.98, hy + r * 0.1, r * 0.17, r * 0.22, v.piel);
    if (v.casco) {
      ctx.beginPath(); ctx.arc(0, hy - r * 0.18, r * 1.12, Math.PI, 0); ctx.closePath(); pintar(ctx, est, '#ffcf24');
      ctx.beginPath(); rr(ctx, -r * 1.3, hy - r * 0.2, r * 2.6, r * 0.2, r * 0.1); pintar(ctx, est, '#f2b800');
    } else if (v.tipoPelo === 'larga') {
      ctx.beginPath(); ctx.arc(0, hy - r * 0.12, r * 1.08, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(r * 0.7, hy - r * 0.5); ctx.quadraticCurveTo(0, hy - r * 0.15, -r * 0.8, hy - r * 0.55); ctx.closePath(); pintar(ctx, est, v.pelo);
    } else {
      ctx.beginPath(); ctx.arc(0, hy - r * 0.1, r * 1.06, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); pintar(ctx, est, v.pelo);
    }
    cara(ctx, est, 0, hy + r * 0.1, r, e.expr, e.boca, e.mira, e.parpadeo, 'ojos');
  }
  function buho(ctx, est, e, S) {
    var cafe = '#8a5a3c', claro = '#ecd3a9';
    miembro(ctx, est, -S * 0.1, -S * 0.1, -S * 0.1, -S * 0.02, S * 0.06, '#e59a2f'); miembro(ctx, est, S * 0.1, -S * 0.1, S * 0.1, -S * 0.02, S * 0.06, '#e59a2f');
    elipse(ctx, est, 0, -S * 0.45, S * 0.32, S * 0.42, cafe);
    elipse(ctx, est, 0, -S * 0.36, S * 0.22, S * 0.3, claro);
    for (var f = 0; f < 3; f++) for (var g = -1; g <= 1; g += 2) { ctx.strokeStyle = 'rgba(138,90,60,0.55)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(g * S * 0.06, -S * 0.3 + f * S * 0.08, S * 0.04, 0.2, Math.PI - 0.2); ctx.stroke(); }
    // alas como brazos
    var ala = e.accion === 'saludar' ? Math.sin(e.t * 9) * S * 0.04 : (e.hablando ? Math.sin(e.t * 5) * S * 0.03 : 0), d = e.lado === -1 ? 1 : -1;
    var sube = (e.accion === 'celebrar') ? -S * 0.22 : (e.accion === 'señalar' ? -S * 0.08 : 0);
    ctx.save(); ctx.translate(-S * 0.3, -S * 0.5); ctx.rotate(0.3 + (d === -1 ? ala / S * 4 : 0) + (e.accion === 'celebrar' ? -1.0 : 0)); elipse(ctx, est, 0, S * 0.12, S * 0.09, S * 0.24, mezcla(cafe, '#000000', 0.12)); ctx.restore();
    ctx.save(); ctx.translate(S * 0.3, -S * 0.5); ctx.rotate(-0.3 - (d === 1 ? ala / S * 4 : 0) + (e.accion === 'celebrar' ? 1.0 : 0)); elipse(ctx, est, 0, S * 0.12 + sube * 0.2, S * 0.09, S * 0.24, mezcla(cafe, '#000000', 0.12)); ctx.restore();
    // cabeza integrada con orejas
    poli(ctx, est, [[-S * 0.27, -S * 0.78], [-S * 0.2, -S * 0.98], [-S * 0.06, -S * 0.82]], cafe); poli(ctx, est, [[S * 0.27, -S * 0.78], [S * 0.2, -S * 0.98], [S * 0.06, -S * 0.82]], cafe);
    elipse(ctx, est, 0, -S * 0.7, S * 0.3, S * 0.2, cafe);
    elipse(ctx, est, -S * 0.12, -S * 0.7, S * 0.12, S * 0.12, '#fffdf2'); elipse(ctx, est, S * 0.12, -S * 0.7, S * 0.12, S * 0.12, '#fffdf2');
    cara(ctx, est, 0, -S * 0.68, S * 0.24, e.expr, e.boca * 0.5, e.mira, e.parpadeo, 'grandes');
    poli(ctx, est, [[-S * 0.045, -S * 0.64], [S * 0.045, -S * 0.64], [0, -S * 0.57 + e.boca * S * 0.03]], '#f2a93a');
    // anteojitos de sabio
    ctx.strokeStyle = est.contorno || '#5b3d2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-S * 0.12, -S * 0.7, S * 0.125, 0, Math.PI * 2); ctx.arc(S * 0.12, -S * 0.7, S * 0.125, 0, Math.PI * 2); ctx.moveTo(-S * 0.0, -S * 0.7); ctx.lineTo(S * 0.0, -S * 0.7); ctx.stroke();
  }
  function zorro(ctx, est, e, S) {
    var nar = '#e07a2f', blanco = '#fff3e0', osc = '#5b3320';
    // cola
    ctx.save(); ctx.translate(-S * 0.25 * -e.lado, -S * 0.2); ctx.rotate(-0.5 * -e.lado + Math.sin(e.t * 3) * 0.12); elipse(ctx, est, 0, -S * 0.12, S * 0.12, S * 0.3, nar); elipse(ctx, est, 0, -S * 0.32, S * 0.08, S * 0.1, blanco); ctx.restore();
    piernas(ctx, est, e, S, nar, osc, 0.09);
    elipse(ctx, est, 0, -S * 0.43, S * 0.24, S * 0.28, nar); elipse(ctx, est, 0, -S * 0.4, S * 0.14, S * 0.21, blanco);
    brazos(ctx, est, e, S, 0.5, nar, osc, 0.26);
    var hy = -S * 0.75;
    poli(ctx, est, [[-S * 0.24, hy - S * 0.02], [-S * 0.22, hy - S * 0.3], [-S * 0.06, hy - S * 0.12]], nar); poli(ctx, est, [[S * 0.24, hy - S * 0.02], [S * 0.22, hy - S * 0.3], [S * 0.06, hy - S * 0.12]], nar);
    poli(ctx, est, [[-S * 0.19, hy - S * 0.06], [-S * 0.18, hy - S * 0.2], [-S * 0.1, hy - S * 0.1]], '#ffc9a0'); poli(ctx, est, [[S * 0.19, hy - S * 0.06], [S * 0.18, hy - S * 0.2], [S * 0.1, hy - S * 0.1]], '#ffc9a0');
    poli(ctx, est, [[-S * 0.3, hy + S * 0.02], [S * 0.3, hy + S * 0.02], [0, hy + S * 0.24]], blanco);
    elipse(ctx, est, 0, hy, S * 0.27, S * 0.2, nar);
    poli(ctx, est, [[-S * 0.22, hy + S * 0.05], [S * 0.22, hy + S * 0.05], [0, hy + S * 0.22]], blanco);
    elipse(ctx, est, 0, hy + S * 0.2, S * 0.04, S * 0.03, osc);
    cara(ctx, est, 0, hy - S * 0.02, S * 0.22, e.expr, e.boca, e.mira, e.parpadeo, 'ojos');
  }
  function robot(ctx, est, e, S) {
    var cuerpo = '#6fa8c9', claro = '#cfe6f2', acento = '#f2b134';
    piernas(ctx, est, e, S, '#4d7895', '#3d4a55', 0.09);
    ctx.beginPath(); rr(ctx, -S * 0.22, -S * 0.64, S * 0.44, S * 0.44, S * 0.07); pintar(ctx, est, cuerpo);
    ctx.beginPath(); rr(ctx, -S * 0.13, -S * 0.56, S * 0.26, S * 0.18, S * 0.04); pintar(ctx, est, claro);
    elipse(ctx, est, -S * 0.05, -S * 0.47, S * 0.025, S * 0.025, acento); elipse(ctx, est, S * 0.05, -S * 0.47, S * 0.025, S * 0.025, '#e36060');
    brazos(ctx, est, e, S, 0.58, '#4d7895', acento, 0.28);
    var hy = -S * 0.8, r = S * 0.2;
    miembro(ctx, est, 0, hy - r * 1.0, 0, hy - r * 1.5 - (e.hablando ? Math.abs(Math.sin(e.t * 8)) * 8 : 0), S * 0.02, '#4d7895'); elipse(ctx, est, 0, hy - r * 1.58, S * 0.035, S * 0.035, '#e36060');
    ctx.beginPath(); rr(ctx, -r * 1.15, hy - r * 0.95, r * 2.3, r * 1.9, r * 0.5); pintar(ctx, est, cuerpo);
    ctx.beginPath(); rr(ctx, -r * 0.95, hy - r * 0.72, r * 1.9, r * 1.42, r * 0.35); pintar(ctx, est, '#e9f4fa');
    elipse(ctx, est, -r * 1.2, hy, S * 0.03, S * 0.07, acento); elipse(ctx, est, r * 1.2, hy, S * 0.03, S * 0.07, acento);
    cara(ctx, est, 0, hy + r * 0.05, r * 0.95, e.expr, e.boca, e.mira, e.parpadeo, 'led');
  }
  function calendario(ctx, est, e, S) {
    var rojo = '#ff2d55', papel = '#ffffff';
    piernas(ctx, est, e, S, '#2b2b36', '#ff2d55', 0.1);
    var h = S * 0.68, w = S * 0.6, y0 = -S * 0.2 - h;
    brazos(ctx, est, e, S, 0.45, '#2b2b36', '#ffffff', 0.3);
    ctx.beginPath(); rr(ctx, -w / 2, y0, w, h, S * 0.07); pintar(ctx, est, papel);
    ctx.save(); ctx.beginPath(); rr(ctx, -w / 2, y0, w, h, S * 0.07); ctx.clip(); ctx.fillStyle = rojo; ctx.fillRect(-w / 2, y0, w, h * 0.2); ctx.restore();
    ctx.beginPath(); rr(ctx, -w / 2, y0, w, h, S * 0.07); if (est.contorno) { ctx.lineWidth = est.grosor; ctx.strokeStyle = est.contorno; ctx.stroke(); }
    for (var i = -1; i <= 1; i += 2) { ctx.beginPath(); rr(ctx, i * w * 0.24 - S * 0.02, y0 - S * 0.06, S * 0.04, S * 0.13, S * 0.02); pintar(ctx, est, '#dfe3e8'); }
    // cuadrícula de días (sin números: es decoración)
    ctx.strokeStyle = 'rgba(17,17,17,0.14)'; ctx.lineWidth = 3;
    for (var gx = 1; gx < 4; gx++) { ctx.beginPath(); ctx.moveTo(-w / 2 + gx * w / 4, y0 + h * 0.8); ctx.lineTo(-w / 2 + gx * w / 4, y0 + h - 8); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-w / 2 + 10, y0 + h * 0.9); ctx.lineTo(w / 2 - 10, y0 + h * 0.9); ctx.stroke();
    cara(ctx, est, 0, y0 + h * 0.5, S * 0.22, e.expr, e.boca, e.mira, e.parpadeo, 'ojos');
  }
  function dibujarPersonaje(ctx, est, tipo, x, y, S, e) {
    ctx.save(); ctx.translate(x, y);
    var d = e.lado === -1 ? 1 : -1;
    if (e.lado === 1) ctx.scale(1, 1);
    // sombra en el piso
    if (!est.sombra) { ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(0, 4, S * 0.3, S * 0.035, 0, 0, Math.PI * 2); ctx.fill(); }
    if (tipo === 'duena') humano(ctx, est, e, S, { piel: PIEL[1], pelo: '#4a2a1f', tipoPelo: 'larga', camisa: est === ESTILOS.comic ? '#8b5cf6' : (est === ESTILOS.recortes ? '#2f8f83' : '#13b5a5'), pantalon: '#35507a', mono: true });
    else if (tipo === 'cliente') humano(ctx, est, e, S, { piel: PIEL[0], pelo: '#2b2420', tipoPelo: 'corta', camisa: '#ff9d3c', pantalon: '#3b3f4a' });
    else if (tipo === 'tecnico') humano(ctx, est, e, S, { piel: PIEL[2], pelo: '#1d1612', tipoPelo: 'corta', camisa: '#3a78d4', pantalon: '#2a3d63', casco: true });
    else if (tipo === 'buho') buho(ctx, est, e, S);
    else if (tipo === 'zorro') zorro(ctx, est, e, S);
    else if (tipo === 'robot') robot(ctx, est, e, S);
    else if (tipo === 'calendario') calendario(ctx, est, e, S);
    ctx.restore(); return d;
  }

  // ── Fondos ───────────────────────────────────────────────────────────────────────────────────────────
  function fondo(ctx, est, id, tl, acento) {
    var cols = est.fondos[id] || est.fondos.oficina, g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, cols[0]); g.addColorStop(0.7, cols[1]); g.addColorStop(1, cols[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var linea = est.contorno;
    function marco(x, y, w, h, fill, r) { ctx.beginPath(); rr(ctx, x, y, w, h, r || 12); pintar(ctx, est, fill); }
    var ps = mezcla(cols[1], '#000000', 0.12), cl = mezcla(cols[0], '#ffffff', 0.5);
    if (id === 'oficina' || id === 'casa') {
      marco(120, 360, 300, 380, '#bfe6ff', 20); ctx.strokeStyle = linea || '#ffffff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(270, 360); ctx.lineTo(270, 740); ctx.moveTo(120, 550); ctx.lineTo(420, 550); ctx.stroke();
      marco(700, 420, 240, 160, mezcla(acento, '#ffffff', 0.55), 14); marco(730, 450, 180, 20, '#ffffff', 8); marco(730, 495, 120, 20, '#ffffff', 8);
      marco(40, 1180, 240, 40, ps, 10);
    } else if (id === 'taller') {
      marco(60, 300, 960, 520, mezcla(cols[1], '#ffffff', 0.25), 16);
      for (var i = 0; i < 6; i++) { var tx = 140 + i * 150; ctx.beginPath(); rr(ctx, tx, 380 + (i % 2) * 40, 34, 170, 10); pintar(ctx, est, i % 2 ? '#d7dde4' : acento); ctx.beginPath(); ctx.arc(tx + 17, 380 + (i % 2) * 40 - 14, 30, 0, Math.PI * 2); pintar(ctx, est, '#9aa5b1'); }
      marco(700, 900, 300, 200, '#f2b134', 16); marco(730, 930, 90, 60, '#fff3c4', 8); ctx.beginPath(); ctx.moveTo(900, 940); ctx.lineTo(850, 1010); ctx.lineTo(885, 1010); ctx.lineTo(840, 1080); ctx.lineWidth = 12; ctx.strokeStyle = linea || '#b87400'; ctx.stroke();
    } else if (id === 'calle') {
      for (var b = 0; b < 5; b++) { var bw = 170 + (b % 3) * 40, bh = 380 + ((b * 97) % 260), bx = -40 + b * 230; marco(bx, 1200 - bh, bw, bh, mezcla(cols[1], '#000000', 0.05 + b * 0.04), 10); for (var wy = 0; wy < 4; wy++) for (var wx = 0; wx < 2; wx++) marco(bx + 30 + wx * 70, 1200 - bh + 40 + wy * 80, 40, 46, '#fff5c2', 6); }
      ctx.fillStyle = mezcla(cols[1], '#000000', 0.25); ctx.fillRect(0, 1400, W, 80);
    } else { // exterior
      for (var c = 0; c < 3; c++) { var cx0 = ((c * 460 + tl * 24) % 1500) - 220; ctx.beginPath(); ctx.ellipse(cx0, 260 + c * 140, 150, 56, 0, 0, Math.PI * 2); ctx.ellipse(cx0 + 110, 240 + c * 140, 110, 48, 0, 0, Math.PI * 2); pintar(ctx, est, '#ffffff'); }
      ctx.beginPath(); ctx.ellipse(300, 1260, 640, 240, 0, 0, Math.PI * 2); pintar(ctx, est, mezcla(est.suelo, '#ffffff', 0.15)); ctx.beginPath(); ctx.ellipse(900, 1300, 560, 220, 0, 0, Math.PI * 2); pintar(ctx, est, mezcla(est.suelo, '#000000', 0.06));
    }
    // piso
    ctx.fillStyle = est.suelo; ctx.fillRect(0, 1440, W, H - 1440); if (linea) { ctx.fillStyle = linea; ctx.fillRect(0, 1440, W, est.grosor); }
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (var p = 0; p < 6; p++) ctx.fillRect(p * 190 + 20, 1560 + (p % 2) * 90, 120, 10);
    // textura del estilo
    if (est.textura === 'puntos') { ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#000'; for (var py = 0; py < 36; py++) for (var px = 0; px < 22; px++) { var rx = px * 52 + (py % 2) * 26, ry = py * 54, rad = 3 + 7 * (ry / H); ctx.beginPath(); ctx.arc(rx, ry, rad, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
    else if (est.textura === 'granulo') { ctx.save(); ctx.globalAlpha = 0.12; for (var q = 0; q < 380; q++) { ctx.fillStyle = hash(q) > 0.5 ? '#7a5a3a' : '#ffffff'; ctx.fillRect(hash(q + 7) * W, hash(q + 13) * H, 4, 4); } ctx.restore(); }
    else if (est.textura === 'papel') { ctx.save(); ctx.globalAlpha = 0.10; ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 2; for (var l = 0; l < 40; l++) { var ly = hash(l) * H; ctx.beginPath(); ctx.moveTo(hash(l + 3) * W * 0.6, ly); ctx.lineTo(hash(l + 3) * W * 0.6 + 140 + hash(l + 9) * 260, ly + hash(l + 5) * 12 - 6); ctx.stroke(); } ctx.restore(); }
  }

  // ── Globo de diálogo con texto que va apareciendo ─────────────────────────────────────────────────────
  function palabrasEnLineas(ctx, texto, ancho) {
    var palabras = String(texto).split(/\s+/).filter(Boolean), lineas = [[]], x = 0, sp = ctx.measureText(' ').width;
    palabras.forEach(function (w) {
      var ww = ctx.measureText(w).width;
      if (x > 0 && x + sp + ww > ancho) { lineas.push([]); x = 0; }
      lineas[lineas.length - 1].push({ w: w, ww: ww }); x += (x > 0 ? sp : 0) + ww;
    });
    return { lineas: lineas, sp: sp, total: palabras.length };
  }
  function globo(ctx, est, texto, tl, hablanteX, hablanteY, frac, grito) {
    var tam = texto.length > 60 ? 54 : (texto.length > 36 ? 60 : 68);
    ctx.font = (est === ESTILOS.comic ? '' : 'bold ') + tam + 'px ' + est.fuente;
    var maxW = 800, L = palabrasEnLineas(ctx, texto, maxW), lh = tam * 1.22;
    var wmax = 0; L.lineas.forEach(function (ln) { var s = 0; ln.forEach(function (p, i) { s += p.ww + (i ? L.sp : 0); }); wmax = Math.max(wmax, s); });
    var bw = wmax + 90, bh = L.lineas.length * lh + 70, bx = clamp(hablanteX - bw / 2, 40, W - 40 - bw), by = clamp(hablanteY - bh - 110, 190, 1000), pop = rebote(clamp(tl / 0.35, 0, 1));
    ctx.save(); ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(pop, pop); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    ctx.beginPath();
    if (grito) { var cx0 = bx + bw / 2, cy0 = by + bh / 2, pts = 18; for (var i = 0; i < pts * 2; i++) { var a = i / (pts * 2) * Math.PI * 2, rx = (i % 2 ? 0.46 : 0.56) * bw + 26, ry = (i % 2 ? 0.46 : 0.58) * bh + 26; ctx.lineTo(cx0 + Math.cos(a) * rx, cy0 + Math.sin(a) * ry); } ctx.closePath(); }
    else rr(ctx, bx, by, bw, bh, est === ESTILOS.recortes ? 30 : 56);
    pintar(ctx, est, est.globo);
    // cola hacia el que habla
    var tx = clamp(hablanteX, bx + 70, bx + bw - 70);
    var colaY = Math.min(hablanteY, by + bh + 110); ctx.beginPath(); ctx.moveTo(tx - 34, by + bh - 4); ctx.lineTo(clamp(hablanteX, tx - 70, tx + 70), colaY); ctx.lineTo(tx + 34, by + bh - 4); ctx.closePath();
    if (est.sombra) { ctx.save(); ctx.shadowColor = 'rgba(70,35,10,0.32)'; ctx.shadowOffsetX = 7; ctx.shadowOffsetY = 9; ctx.fillStyle = est.globo; ctx.fill(); ctx.restore(); } else { ctx.fillStyle = est.globo; ctx.fill(); if (est.contorno) { ctx.lineWidth = est.grosor; ctx.strokeStyle = est.contorno; ctx.lineJoin = 'round'; ctx.stroke(); } }
    ctx.fillStyle = est.globo; ctx.beginPath(); ctx.moveTo(tx - 30, by + bh - 7); ctx.lineTo(tx + 30, by + bh - 7); ctx.lineTo(tx, by + bh + 2); ctx.closePath(); ctx.fill();
    // texto: se pinta palabra por palabra
    var mostrar = Math.ceil(frac * L.total), n = 0; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    L.lineas.forEach(function (ln, li) {
      var s = 0; ln.forEach(function (p, i) { s += p.ww + (i ? L.sp : 0); });
      var x = bx + (bw - s) / 2, y = by + 35 + li * lh + lh / 2;
      ln.forEach(function (p) { n++; if (n <= mostrar) { ctx.fillStyle = est.texto; ctx.fillText(p.w, x, y); } x += p.ww + L.sp; });
    });
    ctx.restore();
    return { alto: bh };
  }

  // ── Confeti para las escenas de celebración ──────────────────────────────────────────────────────────
  function confeti(ctx, tl, acento) {
    var cols = [acento, '#ffd23f', '#3bceac', '#ff6fb5', '#5aa9ff'];
    for (var i = 0; i < 46; i++) {
      var x = hash(i) * W, v = 260 + hash(i + 3) * 380, y = ((tl * v + hash(i + 7) * H) % (H + 80)) - 40, r = Math.sin(tl * 6 + i) * 1.2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-9, -5, 18, 10); ctx.restore();
    }
  }

  // ── Motor ────────────────────────────────────────────────────────────────────────────────────────────
  function crear(guion, cfg) {
    cfg = cfg || {};
    var est = ESTILOS[guion.estilo] || ESTILOS.sitcom, esc = (guion.escenas || []).slice(0, 30);
    if (!esc.length) esc = [{ personaje: 'a', texto: '', expresion: 'neutral', accion: 'quieto', fondo: 'oficina', dur: 3 }];      // un guion vacío no rompe el dibujo
    var tel = String(cfg.telefono || '').replace(/[^0-9+() \-]/g, '').trim().slice(0, 20), marca = String(cfg.marca || guion.negocio || '').slice(0, 40);
    var ini = [], acc = 0; esc.forEach(function (e) { ini.push(acc); acc += Math.max(1.8, Number(e.dur) || 3.4); });
    var total = acc + 0.6;
    function idxEn(t) { for (var i = esc.length - 1; i >= 0; i--) if (t >= ini[i]) return i; return 0; }
    function dibujar(ctx, t, k) {
      k = k || 1; ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, W, H);
      var i = idxEn(Math.min(t, total - 0.01)), e = esc[i] || {}, tl = t - ini[i], dur = Math.max(1.8, Number(e.dur) || 3.4), ultima = i === esc.length - 1;
      // entrada de escena: leve zoom y fundido desde el corte
      var ent = suave(tl / 0.28), zoom = 1.035 - 0.035 * ent;
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
      fondo(ctx, est, FONDOS.indexOf(e.fondo) >= 0 ? e.fondo : 'oficina', t, est.acento);
      var reparto = est.reparto, quien = e.personaje === 'b' ? 'b' : 'a', otro = quien === 'a' ? 'b' : 'a';
      var pos = { a: { x: 290, lado: -1 }, b: { x: 790, lado: 1 } };
      var hablando = tl > 0.22 && tl < dur - 0.25, frac = clamp((tl - 0.3) / Math.max(0.8, dur * 0.52), 0, 1);
      var expr = EXPRESIONES.indexOf(e.expresion) >= 0 ? e.expresion : 'neutral', accion = ACCIONES.indexOf(e.accion) >= 0 ? e.accion : 'quieto';
      if (ultima) accion = 'celebrar';
      ['b', 'a'].forEach(function (id) {       // primero el que escucha (queda atrás) y al final el que habla
        var orden = id === otro ? 0 : 1; if (orden !== 0) return;
        var p = pos[id], S = 560, ex = (ultima ? 'feliz' : (expr === 'enojado' ? 'sorprendido' : (expr === 'triste' ? 'preocupado' : 'neutral')));
        if (ex === 'preocupado') ex = 'triste';
        var est2 = { expr: ex, boca: 0.08, accion: 'quieto', t: t, mira: pos[quien].x < p.x ? -1 : 1, lado: p.lado, hablando: false, parpadeo: (t * 1.0 + (id === 'a' ? 0 : 0.37)) % 3.2 < 0.12 };
        if (ultima) est2.accion = 'celebrar';
        dibujarPersonaje(ctx, est, reparto[id].tipo, p.x, 1540, S, est2);
      });
      var pq = pos[quien], Sq = 650, salto = 0, dx = 0;
      if (accion === 'saltar') salto = -Math.abs(Math.sin(tl * 7)) * 90; else if (accion === 'celebrar') salto = -Math.abs(Math.sin(tl * 8)) * 60; else if (accion === 'caminar') dx = Math.sin(tl * 3) * 30; else if (accion === 'temblar') dx = Math.sin(tl * 40) * 6;
      var respira = Math.sin(t * 3) * 6, boca = hablando ? Math.abs(Math.sin(tl * 15 + i)) * 0.95 : 0.08;
      var eq = { expr: expr, boca: boca, accion: accion, t: tl, mira: quien === 'a' ? 1 : -1, lado: pq.lado, hablando: hablando && accion === 'quieto', parpadeo: (t % 3.1) < 0.12 };
      dibujarPersonaje(ctx, est, reparto[quien].tipo, pq.x + dx, 1560 + salto + respira * 0.3, Sq, eq);
      if (accion === 'celebrar') confeti(ctx, tl, est.acento);
      // globo (arriba, sobre el que habla)
      var texto = String(e.texto || '');
      if (texto) globo(ctx, est, texto, tl, pq.x + dx, 1560 + salto - Sq * 1.02, frac, expr === 'enojado' || expr === 'sorprendido' && est === ESTILOS.comic);
      // cierre: botón de WhatsApp + teléfono (lo escribe quien entrega, no la IA)
      if (ultima && tel) {
        var pa = rebote(clamp((tl - 0.9) / 0.5, 0, 1)); ctx.save(); ctx.translate(W / 2, 1745); ctx.scale(pa, pa);
        ctx.beginPath(); rr(ctx, -430, -92, 860, 184, 92); pintar(ctx, est, '#25d366');
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 40px "Helvetica Neue",Arial,sans-serif'; ctx.fillText('Escribinos por WhatsApp', 0, -28);
        var ft = 76; ctx.font = 'bold ' + ft + 'px "Helvetica Neue",Arial,sans-serif'; while (ft > 30 && ctx.measureText(tel).width > 780) { ft -= 4; ctx.font = 'bold ' + ft + 'px "Helvetica Neue",Arial,sans-serif'; } ctx.fillText(tel, 0, 40); ctx.restore();
      }
      ctx.restore();
      // marca (arriba a la izquierda) y barra de progreso
      if (marca && t > 0.3) { ctx.globalAlpha = 0.9; ctx.font = 'bold 34px "Helvetica Neue",Arial,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; var mw = ctx.measureText(marca).width + 44; ctx.beginPath(); rr(ctx, 40, 84, mw, 62, 31); ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fill(); ctx.fillStyle = '#222'; ctx.fillText(marca, 62, 116); ctx.globalAlpha = 1; }
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, H - 14, W, 14); ctx.fillStyle = est.acento; ctx.fillRect(0, H - 14, W * clamp(t / total, 0, 1), 14);
      // corte: destello breve
      if (tl < 0.12 && i > 0) { ctx.globalAlpha = (0.12 - tl) / 0.12 * 0.5; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      ctx.restore();
    }
    return { duracion: total, cortes: ini.slice(1), inicios: ini, durs: esc.map(function (e) { return Math.max(1.8, Number(e.dur) || 3.4); }), dibujar: dibujar, escenas: esc.length };
  }

  // Un cuadro de muestra de un estilo (para elegirlo con la vista): las dos figuras y un globo.
  function miniatura(canvas, estilo, textoMuestra) {
    var est = ESTILOS[estilo] || ESTILOS.sitcom, k = canvas.width / W, ctx = canvas.getContext('2d');
    var m = crear({ estilo: estilo, escenas: [{ personaje: 'a', texto: textoMuestra || '¿Y si probamos algo distinto?', expresion: 'feliz', accion: 'saludar', fondo: 'oficina', dur: 3.4 }] }, {});
    m.dibujar(ctx, 1.4, k); return est;
  }

  var api = { crear: crear, miniatura: miniatura, ESTILOS: ESTILOS, EXPRESIONES: EXPRESIONES, ACCIONES: ACCIONES, FONDOS: FONDOS, ancho: W, alto: H };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else global.CartoonMotor = api;
})(typeof window !== 'undefined' ? window : globalThis);
