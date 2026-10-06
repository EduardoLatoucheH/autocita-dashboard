// Gancho para tu ayudante local (render-reels/servidor-local.js): atiende POST /animacion con el guion JSON del Plan de contenido.
// Cómo conectarlo (2 líneas en tu servidor-local.js, DESPUÉS de validar la clave como hacés con /render):
//   const { generarAnimacion } = require('./animaciones/servidor-local-animacion.js');
//   if (req.method === 'POST' && url === '/animacion') { return generarAnimacion(cuerpoJson).then((r) => responder(200, r), (e) => responder(400, { error: e.message })); }
// El panel espera 200 si se generó; si la ruta no existe (404) muestra "falta actualizar render-reels/" y deja bajar el .json.
const { execFile } = require('child_process'), path = require('path');
const TOPE_BYTES = 20000;
function generarAnimacion(guion) {
  return new Promise((ok, mal) => {
    const texto = JSON.stringify(guion || {});
    if (texto.length > TOPE_BYTES) return mal(new Error('Guion demasiado grande'));
    const tmp = path.join(require('os').tmpdir(), 'anim-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.json');
    require('fs').writeFileSync(tmp, texto);
    // execFile (sin shell): el guion nunca llega a una línea de comandos; render-animacion.js lo valida con listas cerradas
    execFile('node', [path.join(__dirname, 'render-animacion.js'), tmp, '--salida', path.join(__dirname, 'salida')], { timeout: 180000, maxBuffer: 4 * 1024 * 1024 }, (e, out) => {
      try { require('fs').unlinkSync(tmp); } catch (x) { /* ya no está */ }
      if (e) return mal(new Error('No se pudo renderizar la animación'));
      try { const r = JSON.parse(out); ok({ listo: true, tiempo_s: r.tiempo_render_s, archivos: Object.keys(r.archivos) }); } catch (x) { mal(new Error('Respuesta inválida del render')); }
    });
  });
}
module.exports = { generarAnimacion };
