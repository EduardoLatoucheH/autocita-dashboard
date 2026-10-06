// Simula lo que hará el panel: calendario y después cada grupo en lotes.
const BASE = 'http://127.0.0.1:3999', KEY = 'clave-test';
async function post(path, body) {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': KEY }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); return { status: r.status, j };
}
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
(async () => {
  const entrada = JSON.parse(process.argv[2]), out = process.argv[3];
  const cal = await post('/admin/pluggs/plan-contenido/calendario', { entrada });
  if (cal.status !== 200) { console.log('CALENDARIO FALLÓ', cal.status, JSON.stringify(cal.j)); process.exit(1); }
  const e = cal.j.entrada, piezas = cal.j.piezas;
  const temas = {}; piezas.forEach((p) => { temas[p.id] = p.tema; });
  const plan = { entrada: e, decisiones: cal.j.decisiones, calendario: piezas, historias: [], reels: [], publicaciones: [], preguntas: [], animaciones: [], pauta: null, estado_grupos: {}, llamadas: cal.j.llamadas, avisos: {} };
  let ganchos = [], plantillas = [], contexto = null;
  const grupo = async (g, lote, extra) => post('/admin/pluggs/plan-contenido/grupo', { grupo: g, entrada: e, piezas: lote, contexto: Object.assign({ temas, ganchos: ganchos.slice(-40), plantillas_usadas: plantillas }, extra || {}) });
  const falt = { historias: [], reels: [], publicaciones: [], animaciones: [], preguntas: [], pauta: [] };
  const tipoDe = { historias: 'historia', reels: 'reel', publicaciones: 'publicacion', animaciones: 'animacion' };
  const tam = { historias: 7, reels: 2, publicaciones: 4, animaciones: 6 };
  for (const g of ['historias', 'reels', 'publicaciones', 'animaciones']) {
    for (const lote of chunk(piezas.filter((p) => p.tipo === tipoDe[g]), tam[g])) {
      const r = await grupo(g, lote);
      if (r.status !== 200) { console.log(g, 'ERROR', r.status, JSON.stringify(r.j)); falt[g].push(...lote.map((p) => p.id)); continue; }
      plan[g].push(...r.j.items); plan.llamadas += r.j.llamadas; falt[g].push(...r.j.faltantes);
      if (r.j.problemas.length) plan.avisos[g] = (plan.avisos[g] || []).concat(r.j.problemas);
      if (g === 'reels') { contexto = r.j.contexto || contexto; r.j.items.forEach((i) => { plantillas.push(i.plantilla); ganchos.push(i.guion.escenas[0].texto); }); }
      if (g === 'historias') r.j.items.forEach((i) => ganchos.push(i.cuadros[0].texto));
      if (g === 'publicaciones') r.j.items.forEach((i) => ganchos.push(i.laminas[0].titular));
    }
  }
  const pr = await grupo('preguntas', piezas, { resumen: plan.decisiones.resumen });
  plan.preguntas = pr.j.items || []; plan.llamadas += pr.j.llamadas || 0; falt.preguntas = pr.j.faltantes || [];
  const gpi = {}; plan.reels.forEach((r) => { gpi[r.id] = r.guion.escenas[0].texto; });
  const pa = await grupo('pauta', piezas, { ganchos_por_id: gpi });
  plan.pauta = pa.j.pauta; plan.llamadas += pa.j.llamadas || 0; if (pa.j.problemas && pa.j.problemas.length) plan.avisos.pauta = pa.j.problemas;
  plan.estado_grupos = Object.fromEntries(Object.keys(falt).map((g) => [g, falt[g].length ? 'pendiente' : 'ok']));
  plan.faltantes = falt; plan.contexto_reel = contexto;
  require('fs').writeFileSync(out, JSON.stringify(plan, null, 1));
  const n = (a) => a.length;
  console.log(JSON.stringify({ negocio: e.negocio, semanas: plan.decisiones.semanas, ritmo: plan.decisiones.ritmo, topes: plan.decisiones.topes, ajustes: plan.decisiones.ajustes, piezas: n(piezas), historias: n(plan.historias), reels: n(plan.reels), publicaciones: n(plan.publicaciones), carruseles: plan.publicaciones.filter((p) => p.formato === 'carrusel').length, preguntas: n(plan.preguntas), animaciones: n(plan.animaciones), campanas: plan.pauta && plan.pauta.campanas.map((c) => [c.pieza_id, c.pct, c.monto, c.dias]), estado: plan.estado_grupos, faltantes: falt, avisos: plan.avisos, llamadas_ia: plan.llamadas }, null, 1));
})();
