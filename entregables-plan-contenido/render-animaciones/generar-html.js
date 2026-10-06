// Arma el HTML AUTOCONTENIDO de una animación (sin librerías ni archivos externos) para pegar en una landing.
// Usa el mismo motor que el render a MP4: una sola fuente de verdad. Respeta prefers-reduced-motion (deja el cuadro final) y
// pausa la animación cuando no se ve en pantalla. Todo texto del guion entra con textContent (el JSON va escapado dentro del <script>).
const fs = require('fs'), path = require('path');
function fragmento(guion, motorJs) {
  motorJs = motorJs || fs.readFileSync(path.join(__dirname, 'anim-motor.js'), 'utf8');
  const id = 'cc-anim-' + String(guion.id || 'a').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const json = JSON.stringify(guion).replace(/</g, '\\u003c').replace(new RegExp('[\\u2028\\u2029]', 'g'), ' ');
  const alt = String(guion.resumen || guion.titulo || 'Animación explicativa').replace(/[<>&"]/g, ' ');
  return `<!-- Animación "${String(guion.titulo || '').replace(/[<>&"-]/g, ' ')}": HTML/CSS/SVG autocontenido, sin librerías. Pegalo donde quieras que aparezca. -->
<div id="${id}" role="img" aria-label="${alt}" style="width:100%;max-width:${guion.lienzo.ancho}px"></div>
<script>
${motorJs}
(function () {
  var g = ${json}, cont = document.getElementById('${id}');
  var quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var m = AnimMotor.iniciar(cont, g, { reducirMovimiento: quieto });
  function ajustar() { m.escalar(Math.min(cont.parentNode.clientWidth || g.lienzo.ancho, g.lienzo.ancho)); }
  ajustar(); window.addEventListener('resize', ajustar);
  if (quieto) return;
  var visible = true, t0 = null;
  if (window.IntersectionObserver) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(cont);
  function marco(ahora) { if (t0 === null) t0 = ahora; if (visible) m.dibujar(((ahora - t0) / 1000) % g.duracion); requestAnimationFrame(marco); }
  requestAnimationFrame(marco);
})();
</script>
`;
}
module.exports = { fragmento };
if (require.main === module) { const g = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); process.stdout.write(fragmento(g)); }
