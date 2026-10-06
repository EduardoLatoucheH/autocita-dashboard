// IA SIMULADA para probar el pipeline del plan de contenido sin llamar a OpenAI. Solo intercepta api.openai.com.
const real = global.fetch;
const log = [];
global.__llamadas = log;
const MARCAS = {
  'Clínica Dental Sonrisa': {
    reels: ['Cuánto dura una limpieza dental', 'Miedo al dentista antes de la cita', 'Errores al cepillarse en la noche', 'Dolor de muelas un domingo', 'Qué incluye la primera consulta', 'Blanqueamiento y dientes sensibles', 'Hilo dental que casi nadie usa', 'Ortodoncia para adultos que dudan', 'Revisión de niños antes de clases', 'Cita de limpieza que se pospone', 'Sarro que no se ve en el espejo', 'Qué hacer si se rompe un diente'],
    pubs: ['Cuándo toca la limpieza dental', 'Mitos del blanqueamiento dental', 'Primera cita con el dentista', 'Cepillado correcto paso a paso', 'Señales de que necesitás ortodoncia', 'Cuidar los dientes de los niños', 'Qué comer después de una extracción', 'Encías que sangran al cepillar', 'Dientes sensibles al frío', 'Preguntas frecuentes de pacientes', 'Cómo agendar tu cita por WhatsApp', 'Sonrisa para el Día de la Madre'],
    hist: ['Pregunta del día sobre limpiezas', 'Detrás de cámaras del consultorio', 'Mito rápido sobre el sarro', 'Tip de cepillado en 30 segundos', 'Respondiendo dudas de pacientes', 'Cómo se prepara el instrumental', 'Encuesta de hábitos de higiene', 'Resumen del carrusel de la semana', 'Anticipo del reel de la semana', 'Cómo es la sala de espera', 'Qué preguntar en la primera cita', 'Recordatorio de agendar limpieza', 'Dato útil sobre encías', 'Cierre de semana con preguntas', 'Lo que más nos preguntan', 'Mito sobre el blanqueamiento', 'Rutina nocturna de cuidado', 'Cuenta regresiva de cupos de la semana', 'Preguntas para el próximo reel', 'Un día en la clínica', 'Hilo dental explicado', 'Qué hacer ante una emergencia dental', 'Repaso de lo aprendido', 'Invitación a agendar'],
    anim: [['checklist', 'reel', 'Cinco señales de que necesitás una limpieza'], ['flujo', 'web', 'Cómo es tu primera cita paso a paso'], ['linea_tiempo', 'post', 'Tu calendario de cuidado dental'], ['antes_despues', 'historia', 'Rutina sin plan y rutina con plan'], ['esquema', 'web', 'Partes de un diente y qué cuida cada una']],
    datos: 'Limpieza dental, ortodoncia y blanqueamiento',
  },
  'Electrotecnia C&C': {
    reels: ['Qué pasa si la planta no arranca', 'Corte de luz en plena noche de lluvia', 'Errores que dejan la planta sin arrancar', 'Mantenimiento preventivo del generador', 'Alarma de incendio que nadie prueba', 'Batería de arranque descuidada', 'Combustible viejo en el tanque', 'Rociadores bloqueados por cajas', 'Tablero de transferencia sin revisar', 'Ruido raro al encender la planta', 'Extintores vencidos en la bodega', 'Quincena de mantenimiento antes de lluvias'],
    pubs: ['Señales de que tu planta no arranca', 'Qué incluye un mantenimiento preventivo', 'Cómo funciona un sistema contra incendios', 'Mitos del generador eléctrico', 'Pasos al irse la luz en tu negocio', 'Cada cuánto probar la planta', 'Qué revisar antes de la época lluviosa', 'Errores comunes con extintores', 'Detección alarma y rociadores', 'Preguntas frecuentes de clientes', 'Cómo pedir una visita técnica', 'Combustible y almacenamiento seguro'],
    hist: ['Pregunta del día sobre plantas eléctricas', 'Visita técnica en curso', 'Mito rápido del generador', 'Tip de revisión en 30 segundos', 'Respondiendo dudas de clientes', 'Cómo se prueba una alarma', 'Encuesta sobre cortes de luz', 'Resumen del carrusel de la semana', 'Anticipo del reel de la semana', 'Cómo es un tablero ordenado', 'Qué preguntar al contratar mantenimiento', 'Recordatorio de agendar revisión', 'Dato útil sobre baterías', 'Cierre de semana con preguntas', 'Lo que más nos preguntan', 'Mito sobre los extintores', 'Rutina de prueba mensual', 'Cuenta regresiva de cupos de visita', 'Preguntas para el próximo reel', 'Un día con el equipo técnico', 'Rociadores explicados', 'Qué hacer ante una falla', 'Repaso de lo aprendido', 'Invitación a pedir visita'],
    anim: [['flujo', 'web', 'Cómo arranca la planta cuando se va la luz'], ['checklist', 'reel', 'Cinco señales de que tu planta no va a arrancar'], ['esquema', 'web', 'Partes de un sistema contra incendios'], ['checklist', 'post', 'Qué incluye un mantenimiento preventivo'], ['linea_tiempo', 'historia', 'Calendario de mantenimiento del año']],
    datos: 'Mantenimiento de plantas eléctricas y sistemas contra incendios',
  },
};
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const ANG_SEM = [['dolor', 'error', 'paso'], ['mito', 'pregunta', 'dato'], ['curiosidad', 'incomoda', 'prueba'], ['beneficio', 'dolor', 'error']];
const ETAPAS = ['atraer', 'educar', 'confianza', 'venta'];
function brand(prompt) { const m = prompt.match(/Negocio: (.+)/); return MARCAS[m && m[1].trim()] || MARCAS['Clínica Dental Sonrisa']; }
function calendario(prompt) {
  const b = brand(prompt), piezas = []; let r = 0, p = 0, h = 0, a = 0;
  for (let w = 1; w <= 4; w++) {
    ANG_SEM[w - 1].forEach((ang, i) => { r++; piezas.push({ id: 'r' + r, semana: w, dia: DIAS[[1, 3, 5][i]], hora: '19:00', etapa: ETAPAS[(r + (i === 2 ? 0 : 1)) % 4 === 3 && r % 4 ? 2 : (i + w) % 3], pilar: 'cuidado preventivo', angulo: ang, tema: b.reels[r - 1], por_que: 'Horario de noche, cuando más gente revisa Instagram (es una propuesta).', relacionada_con: '', modo_reel: 'corto' }); });
    [0, 2, 4].forEach((d, i) => { p++; piezas.push({ id: 'p' + p, semana: w, dia: DIAS[d], hora: '12:00', etapa: ETAPAS[(p + 1) % 4], pilar: 'educación', angulo: ANG_SEM[w - 1][(i + 1) % 3], tema: b.pubs[p - 1], por_que: 'Mediodía, pausa de almuerzo (propuesta).', relacionada_con: i === 0 ? 'r' + (r - 2) : '', formato: i === 0 ? 'carrusel' : 'imagen', laminas: 8 }); });
    for (let d = 0; d < 6; d++) { h++; piezas.push({ id: 'h' + h, semana: w, dia: DIAS[d], hora: '18:30', etapa: ETAPAS[h % 4], pilar: 'cercanía', angulo: 'curiosidad', tema: b.hist[h - 1], por_que: 'Historias casi diarias para mantener cercanía.', relacionada_con: d === 1 ? 'r' + (r - 2) : '' }); }
  }
  b.anim.forEach(([pl, dest, tema], i) => { a++; piezas.push({ id: 'a' + a, semana: 1 + Math.floor(i / 2) + (i > 3 ? 0 : 0), dia: DIAS[(i * 2 + 1) % 7], hora: '17:00', etapa: 'educar', pilar: 'explicativo', angulo: 'paso', tema, por_que: 'Explica lo que se ve poco en una foto.', relacionada_con: '', destino: dest, plantilla: pl }); });
  // Un ángulo repetido adrede y un exceso de reels para comprobar que el servidor corrige y recorta.
  piezas.push({ id: 'r13', semana: 4, dia: 'domingo', hora: '10:00', etapa: 'venta', pilar: 'x', angulo: 'dolor', tema: 'Reel de más que debe recortar el servidor', relacionada_con: 'h99' });
  return { decisiones: { semanas: 4, resumen: 'Cuatro semanas porque hay datos reales suficientes. Tres reels por semana para alcance, tres publicaciones para educar y confianza, y historias casi todos los días para mantener cercanía. Los horarios son propuestas basadas en rutinas comunes, no en estadísticas. Ninguna semana repite el mismo ángulo.', horarios_nota: 'Probá estos horarios dos semanas y ajustalos con tus estadísticas.', fechas_cr: [{ fecha: '15 de agosto', nota: 'Día de la Madre, si cae dentro del plan' }] }, piezas };
}
function ids(prompt, re) { const out = []; let m; const r = new RegExp(re, 'gm'); while ((m = r.exec(prompt))) out.push({ id: m[1], resto: m[2] || '' }); return out; }
function corto(t, n) { return t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, ''); }
function historias(prompt) {
  const lista = ids(prompt, '^- (h\\d+): .*tema: (.*?)(?: · se conecta.*)?$');
  return { historias: lista.map(({ id, resto }) => ({ id, cuadros: [
    { texto: corto('¿Te pasa con esto? ' + resto, 70), mostrar: 'texto grande sobre fondo de color de la marca', sticker: null },
    { texto: corto('Lo que vemos cada semana: ' + resto.toLowerCase(), 70), mostrar: 'foto real del equipo trabajando, sin filtros', sticker: null },
    { texto: 'Contanos cuál es tu duda', mostrar: 'caja de preguntas sobre fondo liso', sticker: { tipo: 'pregunta', pregunta: 'Cuál es tu duda sobre ' + corto(resto.toLowerCase(), 40) + '?' } },
    { texto: 'Votá cuál te sirve más', mostrar: 'dos opciones en pantalla', sticker: { tipo: 'encuesta', pregunta: 'Cuál te sirve más hoy?', opciones: ['Consejo', 'Ejemplo'] } },
    { texto: 'Escribinos por WhatsApp', mostrar: 'botón de enlace al chat', sticker: { tipo: 'enlace', texto: 'Escribinos' } },
  ] })) };
}
function caption(t) { return { primera_linea: corto(t + ' y cómo resolverlo', 100), cuerpo: 'Lo vemos seguido en el día a día del negocio. Te contamos lo que hay que revisar primero.', cta: 'Escribinos por WhatsApp', hashtags: ['#cuidado', '#costarica', '#prevencion'], pregunta_cierre: 'Cuál de estos te ha pasado' }; }
function publicaciones(prompt) {
  const lista = ids(prompt, '^- (p\\d+): .*tema: (.*?)(?: · se conecta.*)?$'); const formatos = {}; ids(prompt, '^- (p\\d+): (CARRUSEL de exactamente (\\d+)|IMAGEN)').forEach((x) => { formatos[x.id] = x.resto.startsWith('CARRUSEL') ? parseInt(x.resto.replace(/\D/g, ''), 10) : 0; });
  return { publicaciones: lista.map(({ id, resto }) => {
    const n = formatos[id];
    if (n) { const pasos = ['Primero observá', 'Revisá lo básico', 'Anotá lo que notás', 'No lo dejes para después', 'Buscá ayuda a tiempo', 'Compará con lo normal', 'Guardá este resumen']; return { id, laminas: Array.from({ length: n }, (_, i) => i === 0 ? { titular: corto(resto, 40), destacado: resto.split(' ').slice(-1)[0], subtitulo: 'Lo que casi todos pasan por alto en el día a día', cta: '' } : i === n - 1 ? { titular: 'Escribinos y lo vemos', destacado: 'lo vemos', subtitulo: 'Contanos tu caso y te decimos por dónde empezar', cta: 'Escribinos' } : { titular: pasos[(i - 1) % pasos.length] + ' ' + i, destacado: pasos[(i - 1) % pasos.length].split(' ').slice(-1)[0], subtitulo: 'Paso ' + i + ' del hilo, dicho con una situación concreta del rubro', cta: '' }), caption: caption(resto) }; }
    return { id, titular: corto(resto, 40), destacado: resto.split(' ').slice(-1)[0], subtitulo: 'Una idea clara para que la guardes y se la mandes a alguien', cta: 'Escribinos', caption: caption(resto) };
  }) };
}
function preguntas() { return { preguntas: ['Qué es lo primero que revisás cuando algo falla?', 'Cuál de los dos consejos te sirvió más esta semana?', 'Qué duda te gustaría que resolvamos en el próximo reel?', 'Alguna vez dejaste esto para después y te salió caro?', 'Con cuál de los mitos te habías quedado?', 'Qué momento del día es el mejor para ver esto?', 'Qué pregunta le haces siempre a tu proveedor?', 'Cuál es tu mayor miedo con este tema?'].map((t, i) => ({ texto: t, tipo: ['abierta', 'encuesta', 'abierta', 'opinion'][i % 4], donde: ['historia', 'comentario', 'publicacion'][i % 3], relacionada_con: '', para_que: 'Alimenta el tema de la semana siguiente' })) }; }
function animaciones(prompt) {
  const lista = ids(prompt, '^- (a\\d+): plantilla (\\w+), destino (\\w+) · tema: (.*)$');
  const cant = { flujo: 4, esquema: 4, antes_despues: 2, checklist: 5, linea_tiempo: 4, numero_grande: 1 };
  const m = []; let x; const r = /^- (a\d+): plantilla (\w+), destino (\w+) · tema: (.*)$/gm; while ((x = r.exec(prompt))) m.push({ id: x[1], pl: x[2], tema: x[4] });
  return { animaciones: m.map(({ id, pl, tema }) => ({ id, titulo: corto(tema, 50), resumen: 'Animación explicativa: ' + corto(tema, 60), paleta: 'azul', bloques: Array.from({ length: cant[pl] }, (_, i) => ({ titulo: ['Primer paso', 'Segundo paso', 'Tercer paso', 'Cuarto paso', 'Quinto paso'][i], detalle: 'Qué pasa en esta parte' })), numero: '', unidad: '' })) };
}
function pauta(prompt) {
  const reels = []; let x; const r = /^- (r\d+) \(reel\): semana (\d+), (\w+)/gm; while ((x = r.exec(prompt))) reels.push({ id: x[1], semana: +x[2], dia: x[3] });
  const a = reels[0], b = reels[3], c = reels[3 + 1];
  const camp = (p, fin, pct, prueba) => ({ pieza_id: p.id, formato: 'reel', inicio: { semana: p.semana, dia: p.dia }, fin, pct, fase_prueba: prueba, publico: { zona: 'San José y Heredia', intereses: ['negocios locales', 'hogar'], edades: 'adultos' }, texto_anuncio: { texto: 'Mirá este reel y escribinos por WhatsApp', cta: 'Escribinos por WhatsApp' }, medir: ['mensajes recibidos', 'costo por mensaje', 'retención del video'], motivo: 'Es el reel con el gancho más claro del plan.' });
  return { campanas: [camp(a, { semana: a.semana, dia: 'domingo' }, 30, true), camp(b, { semana: b.semana + 1, dia: 'viernes' }, 70, false), camp(c, { semana: c.semana + 1, dia: 'jueves' }, 20, false)] };
}
const NOMBRES = { 'Pregunta y respuesta': 'pregunta_respuesta', '3 errores que…': 'tres_errores', 'Mito vs. realidad': 'mito_realidad', 'Antes / después': 'antes_despues', 'Paso a paso': 'paso_a_paso', 'Un dato, una explicación': 'un_dato', 'Lista guardable': 'lista_guardable', 'Una pregunta incómoda': 'pregunta_incomoda', 'Lo que nadie te dice': 'nadie_te_dice', 'Un día con y sin el bot': 'dia_con_sin' };
function reel(prompt) {
  const pn = prompt.match(/PLANTILLA «(.+?)»/)[1], pl = NOMBRES[pn], tema = (prompt.match(/Tema de ESTA pieza: (.+?)\. /) || [, 'el tema'])[1].toLowerCase();
  const t = corto(tema, 16);
  const E = (rol, etiqueta, texto, dur, extra) => Object.assign({ rol, etiqueta, texto, destacado: '', apoyo: '', dur: dur || 2.4, mockup: null }, extra || {});
  const G = (txt) => E('gancho', '', txt, 2.4);
  const C = E('cta', '', 'Escribinos por WhatsApp hoy', 2.4);
  const mk = (p) => ({ tipo: 'whatsapp', chat: [{ de: 'cliente', texto: p }, { de: 'asistente', texto: 'Te respondemos en el día' }] });
  const S = {
    tres_errores: [G('Tres errores con ' + t), E('desarrollo', 'Error 1', 'Dejarlo para después', 2.4), E('desarrollo', 'Error 2', 'No pedir revisión', 2.4), E('valor', 'Error 3', 'Ignorar las señales', 2.4), C],
    paso_a_paso: [G('Cuatro pasos: ' + t), E('desarrollo', 'Paso 1', 'Mirá lo básico', 2.4), E('desarrollo', 'Paso 2', 'Anotá lo raro', 2.4), E('valor', 'Paso 3', 'Compará con lo normal', 2.4), E('desarrollo', 'Paso 4', 'Agendá una revisión', 2.4), C],
    lista_guardable: [G('Lista sobre ' + t), E('desarrollo', '1', 'Primero lo visible', 2.4), E('valor', '2', 'Después lo que suena', 2.4), E('desarrollo', '3', 'Al final lo olvidado', 2.4), C],
    mito_realidad: [G('Lo que creés sobre ' + t), E('desarrollo', 'Mito', 'Si funciona, está bien', 2.4), E('valor', 'Realidad', 'Se revisa aunque funcione', 2.4), E('desarrollo', 'Mito', 'Esperar es más barato', 2.4), E('desarrollo', 'Realidad', 'Esperar sale más caro', 2.4), C],
    pregunta_respuesta: [G('¿Qué hago con ' + t + '?'), E('valor', 'Respuesta', 'Primero revisá lo básico', 2.4), E('desarrollo', 'Respuesta', 'Después sumá una visita', 2.4), C],
    un_dato: [G('Pocos miran ' + t), E('valor', 'Dato', 'Se revisa por partes', 2.4), E('desarrollo', 'Explicación', 'Cada parte falla distinto', 2.4), C],
    pregunta_incomoda: [G('¿Cuándo miraste ' + t + '?'), E('desarrollo', 'Incómodo', 'Casi nadie lo revisa', 2.4), E('valor', 'Salida', 'Ponelo en el calendario', 2.4), E('desarrollo', 'Salida', 'Buscá ayuda a tiempo', 2.4), C],
    nadie_te_dice: [G('Nadie cuenta ' + t), E('desarrollo', 'Verdad 1', 'Falla cuando menos esperás', 2.4), E('valor', 'Verdad 2', 'Se nota tarde', 2.4), E('desarrollo', 'Verdad 3', 'Se previene fácil', 2.4), C],
    dia_con_sin: [G('Un día con y sin plan'), E('desarrollo', 'Sin', 'Todo se enreda', 2.4, { apoyo: '8:00' }), E('valor', 'Con', 'Todo fluye', 2.4, { apoyo: '8:30' }), E('desarrollo', 'Sin', 'Sorpresa a media tarde', 2.4, { apoyo: '15:00' }), E('desarrollo', 'Con', 'Ya estaba previsto', 2.4, { apoyo: '15:30' }), C],
    antes_despues: [G('Antes y después: ' + t), E('desarrollo', 'Antes', 'Sin revisión', 2.4, { mockup: mk('Se dañó otra vez') }), E('valor', 'Después', 'Con revisión', 2.4, { mockup: mk('Todo en orden hoy') }), C],
  }[pl];
  return { titulo: corto('Reel ' + t, 55), compartible: 'Sirve para mandárselo a quien lo necesita', ganchos: [], gancho_elegido: 0, motivo_gancho: 'Abre con una situación reconocible', escenas: S, loop: { eco: 'Ya lo revisaste' }, caption: { primera_linea: corto('Esto pasa con ' + t, 90), cuerpo: 'Lo vemos seguido en el día a día. Te contamos qué revisar primero.', cta: 'Escribinos por WhatsApp', hashtags: ['#mantenimiento', '#costarica', '#prevencion'] }, audio: { sugerencia: 'Pista suave, ritmo medio, sin letra' } };
}
global.fetch = async function (url, opts) {
  if (!String(url).includes('api.openai.com')) return real(url, opts);
  const prompt = JSON.parse(opts.body).messages[0].content;
  let out, tipo;
  if (prompt.includes('Armá el CALENDARIO')) { tipo = 'calendario'; out = calendario(prompt); }
  else if (prompt.includes('DÍAS DE HISTORIAS A ESCRIBIR')) { tipo = 'historias'; out = historias(prompt); }
  else if (prompt.includes('PUBLICACIONES A ESCRIBIR')) { tipo = 'publicaciones'; out = publicaciones(prompt); }
  else if (prompt.includes('guionista senior de Reels')) { tipo = 'reel'; out = reel(prompt); }
  else if (prompt.includes('ANIMACIONES A ESCRIBIR')) { tipo = 'animaciones'; out = animaciones(prompt); }
  else if (prompt.includes('entre 8 y 12 preguntas')) { tipo = 'preguntas'; out = preguntas(); }
  else if (prompt.includes('DÓNDE poner el presupuesto')) { tipo = 'pauta'; out = pauta(prompt); }
  else throw new Error('prompt no reconocido por el stub');
  log.push({ tipo, chars: prompt.length });
  return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(out) } }] }) };
};
process.on('exit', () => { try { require('fs').writeFileSync(process.env.LLAMADAS_LOG || '/dev/null', JSON.stringify(log)); } catch (e) {} });
