/* ============================================================
 * fit-data.js — Biblioteca de ejercicios + demos animadas
 * Solo datos y dibujo (SVG inline, funciona offline).
 * Cada ejercicio: patrón de movimiento → demoSVG(patron) dibuja
 * una figura animada con CSS (keyframes en styles.css).
 * Para agregar un ejercicio, añade un objeto a EJERCICIOS.
 * Campos: id, nombre, musculo, equipo, patron, sets, reps,
 *          peso (kg, 0 = peso corporal), unit ('reps'|'seg'),
 *          cue (consejo de 1 línea).
 * Equipos: 'casa' (sin equipo) | 'mancuerna' | 'gym' (máquina/barra)
 * ------------------------------------------------------------
 * FUENTES DE IMÁGENES (vendorizadas en img/fit, funcionan offline):
 *  - RepDB/exercise-dataset (CC: uso en apps con atribución visible)
 *    26 ejercicios: ilustraciones start/peak que se alternan con
 *    crossfade CSS = efecto "gif" sin salir del dispositivo.
 *  - yuhonas/free-exercise-db (Unlicense = dominio público):
 *    lagartijas (foto Push-Up_Wide 0/1.jpg).
 *  - omercotkd/exercises-gifs: NO vendorizado (su propio README
 *    aclara que no posee los derechos de esos GIFs).
 * Atribución visible exigida por RepDB en el footer de index.html.
 * ============================================================ */
const EQUIPOS = { casa: '🏠 Sin equipo', mancuerna: '🏋️ Mancuernas', rusa: '🔔 Pesa rusa', barra: '🏋️‍♂️ Barra larga', polea: '🪢 Polea alta', pullup: '🧗 Barra dominadas', cardio: '🏃 Trotadora', gym: '🏢 Máquinas gym' };
const MUSCULOS = ['Pecho', 'Espalda', 'Pierna', 'Hombro', 'Brazo', 'Core', 'Cardio'];

const EJERCICIOS = [
  // Pecho
  { id: 'lagartijas', nombre: 'Lagartijas', musculo: 'Pecho', equipo: 'casa', patron: 'push', sets: 3, reps: 12, peso: 0, unit: 'reps', cue: 'Cuerpo recto, baja hasta rozar el suelo.' },
  { id: 'press-banca', nombre: 'Press de banca', musculo: 'Pecho', equipo: 'gym', patron: 'push', sets: 4, reps: 10, peso: 40, unit: 'reps', cue: 'Escápulas juntas, barra al pecho.' },
  { id: 'aperturas', nombre: 'Aperturas con mancuerna', musculo: 'Pecho', equipo: 'mancuerna', patron: 'push', sets: 3, reps: 12, peso: 8, unit: 'reps', cue: 'Codos semiflexionados, abre lento.' },
  { id: 'fondos', nombre: 'Fondos en banco', musculo: 'Pecho', equipo: 'casa', patron: 'push', sets: 3, reps: 10, peso: 0, unit: 'reps', cue: 'Codos hacia atrás, no encojas hombros.' },
  // Espalda
  { id: 'dominadas', nombre: 'Dominadas', musculo: 'Espalda', equipo: 'pullup', patron: 'pull', sets: 3, reps: 6, peso: 0, unit: 'reps', cue: 'Pecho a la barra, baja controlado.' },
  { id: 'remo-manc', nombre: 'Remo a una mano', musculo: 'Espalda', equipo: 'mancuerna', patron: 'row', sets: 3, reps: 12, peso: 10, unit: 'reps', cue: 'Espalda recta, codo pegado al cuerpo.' },
  { id: 'jalon', nombre: 'Jalón a un brazo', musculo: 'Espalda', equipo: 'polea', patron: 'pull', sets: 3, reps: 12, peso: 15, unit: 'reps', cue: 'Con el manubrio, un brazo a la vez.' },
  { id: 'superman', nombre: 'Superman', musculo: 'Espalda', equipo: 'casa', patron: 'hinge', sets: 3, reps: 12, peso: 0, unit: 'reps', cue: 'Eleva pecho y piernas 2 seg arriba.' },
  // Pierna
  { id: 'sentadilla', nombre: 'Sentadilla', musculo: 'Pierna', equipo: 'casa', patron: 'squat', sets: 3, reps: 15, peso: 0, unit: 'reps', cue: 'Rodillas siguen la punta del pie.' },
  { id: 'goblet', nombre: 'Sentadilla goblet', musculo: 'Pierna', equipo: 'mancuerna', patron: 'squat', sets: 3, reps: 12, peso: 10, unit: 'reps', cue: 'Pesa al pecho: vale mancuerna o rusa.' },
  { id: 'peso-muerto', nombre: 'Peso muerto', musculo: 'Pierna', equipo: 'barra', patron: 'hinge', sets: 4, reps: 10, peso: 40, unit: 'reps', cue: 'Cadera atrás, barra pegada a tibias.' },
  { id: 'zancadas', nombre: 'Zancadas', musculo: 'Pierna', equipo: 'casa', patron: 'lunge', sets: 3, reps: 10, peso: 0, unit: 'reps', cue: 'Paso largo, rodilla trasera casi al suelo.' },
  { id: 'pantorrilla', nombre: 'Pantorrilla de pie', musculo: 'Pierna', equipo: 'casa', patron: 'calf', sets: 3, reps: 20, peso: 0, unit: 'reps', cue: 'Sube lento, pausa 1 seg arriba.' },
  // Hombro
  { id: 'press-militar', nombre: 'Press militar', musculo: 'Hombro', equipo: 'mancuerna', patron: 'press', sets: 3, reps: 10, peso: 8, unit: 'reps', cue: 'Core apretado, mancuernas sobre hombros.' },
  { id: 'laterales', nombre: 'Elevaciones laterales', musculo: 'Hombro', equipo: 'mancuerna', patron: 'press', sets: 3, reps: 12, peso: 5, unit: 'reps', cue: 'Sube hasta la altura del hombro.' },
  { id: 'press-maquina', nombre: 'Press en máquina', musculo: 'Hombro', equipo: 'gym', patron: 'press', sets: 3, reps: 10, peso: 20, unit: 'reps', cue: 'Espalda pegada al respaldo.' },
  // Brazo
  { id: 'curl', nombre: 'Curl de bíceps', musculo: 'Brazo', equipo: 'mancuerna', patron: 'curl', sets: 3, reps: 12, peso: 8, unit: 'reps', cue: 'Codos fijos, sin balancear.' },
  { id: 'curl-barra', nombre: 'Curl con barra', musculo: 'Brazo', equipo: 'barra', patron: 'curl', sets: 3, reps: 10, peso: 15, unit: 'reps', cue: 'Agarre al ancho de hombros.' },
  { id: 'triceps-banco', nombre: 'Fondos de tríceps', musculo: 'Brazo', equipo: 'casa', patron: 'push', sets: 3, reps: 10, peso: 0, unit: 'reps', cue: 'Manos al borde del banco.' },
  { id: 'jalon-tri', nombre: 'Tríceps a un brazo en polea', musculo: 'Brazo', equipo: 'polea', patron: 'push', sets: 3, reps: 12, peso: 10, unit: 'reps', cue: 'Con el manubrio, codo fijo pegado.' },
  // Core
  { id: 'plancha', nombre: 'Plancha', musculo: 'Core', equipo: 'casa', patron: 'plank', sets: 3, reps: 45, peso: 0, unit: 'seg', cue: 'Glúteos y abdomen apretados.' },
  { id: 'crunch', nombre: 'Abdominales', musculo: 'Core', equipo: 'casa', patron: 'crunch', sets: 3, reps: 15, peso: 0, unit: 'reps', cue: 'Sube hombros, no tires del cuello.' },
  { id: 'climbers', nombre: 'Mountain climbers', musculo: 'Core', equipo: 'casa', patron: 'jack', sets: 3, reps: 30, peso: 0, unit: 'seg', cue: 'Cadera baja, rodillas al pecho.' },
  // Cardio
  { id: 'jacks', nombre: 'Jumping jacks', musculo: 'Cardio', equipo: 'casa', patron: 'jack', sets: 3, reps: 30, peso: 0, unit: 'seg', cue: 'Ritmo constante, respira.' },
  { id: 'burpees', nombre: 'Burpees', musculo: 'Cardio', equipo: 'casa', patron: 'jack', sets: 3, reps: 10, peso: 0, unit: 'reps', cue: 'Pecho al suelo, salto arriba.' },
  { id: 'cuerda', nombre: 'Saltar la cuerda', musculo: 'Cardio', equipo: 'casa', patron: 'jack', sets: 3, reps: 60, peso: 0, unit: 'seg', cue: 'Saltos bajos, muñecas giran.' },
  // Pesa rusa
  { id: 'kb-swing', nombre: 'Swing con pesa rusa', musculo: 'Pierna', equipo: 'rusa', patron: 'hinge', sets: 4, reps: 15, peso: 12, unit: 'reps', cue: 'Cadera explosiva, brazos solo guían.' },
  { id: 'kb-peso', nombre: 'Peso muerto con rusa', musculo: 'Pierna', equipo: 'rusa', patron: 'hinge', sets: 3, reps: 12, peso: 12, unit: 'reps', cue: 'Rusa entre pies, cadera atrás.' },
  { id: 'kb-remo', nombre: 'Remo con rusa a un brazo', musculo: 'Espalda', equipo: 'rusa', patron: 'row', sets: 3, reps: 10, peso: 12, unit: 'reps', cue: 'Apoya la otra mano y cambia de brazo.' },
  { id: 'kb-press', nombre: 'Press de hombro con rusa', musculo: 'Hombro', equipo: 'rusa', patron: 'press', sets: 3, reps: 8, peso: 8, unit: 'reps', cue: 'Un brazo a la vez, core apretado.' },
  // Barra larga
  { id: 'peso-manc', nombre: 'Peso muerto con mancuernas', musculo: 'Pierna', equipo: 'mancuerna', patron: 'hinge', sets: 3, reps: 12, peso: 10, unit: 'reps', cue: 'Igual que con barra, espalda recta.' },
  { id: 'remo-barra', nombre: 'Remo inclinado con barra', musculo: 'Espalda', equipo: 'barra', patron: 'row', sets: 4, reps: 10, peso: 30, unit: 'reps', cue: 'Torso a 45°, barra al ombligo.' },
  { id: 'sentadilla-barra', nombre: 'Sentadilla frontal con barra', musculo: 'Pierna', equipo: 'barra', patron: 'squat', sets: 4, reps: 8, peso: 30, unit: 'reps', cue: 'Codos altos, tronco vertical.' },
  { id: 'press-militar-barra', nombre: 'Press militar con barra', musculo: 'Hombro', equipo: 'barra', patron: 'press', sets: 3, reps: 8, peso: 20, unit: 'reps', cue: 'Barra del mentón hacia arriba, core apretado.' },
  // Mancuernas (sin banco)
  { id: 'press-suelo', nombre: 'Press de suelo con mancuernas', musculo: 'Pecho', equipo: 'mancuerna', patron: 'push', sets: 3, reps: 12, peso: 10, unit: 'reps', cue: 'Tumbado en el suelo, codos a 45°.' },
  { id: 'martillo', nombre: 'Curl martillo', musculo: 'Brazo', equipo: 'mancuerna', patron: 'curl', sets: 3, reps: 12, peso: 8, unit: 'reps', cue: 'Palmas enfrentadas, sin balanceo.' },
  { id: 'patada-tri', nombre: 'Patada de tríceps', musculo: 'Brazo', equipo: 'mancuerna', patron: 'push', sets: 3, reps: 12, peso: 5, unit: 'reps', cue: 'Torso inclinado, estira hacia atrás.' },
  { id: 'zancada-manc', nombre: 'Zancada con mancuernas', musculo: 'Pierna', equipo: 'mancuerna', patron: 'lunge', sets: 3, reps: 10, peso: 8, unit: 'reps', cue: 'Mancuernas a los lados, paso largo.' },
  { id: 'frontales', nombre: 'Elevaciones frontales', musculo: 'Hombro', equipo: 'mancuerna', patron: 'press', sets: 3, reps: 12, peso: 5, unit: 'reps', cue: 'Sube al frente hasta los hombros.' },
  { id: 'arnold', nombre: 'Press Arnold', musculo: 'Hombro', equipo: 'mancuerna', patron: 'press', sets: 3, reps: 10, peso: 7, unit: 'reps', cue: 'Gira las palmas al subir.' },
  { id: 'press-banca-manc', nombre: 'Press de banca con mancuernas', musculo: 'Pecho', equipo: 'gym', patron: 'push', sets: 3, reps: 10, peso: 12, unit: 'reps', cue: 'Necesita banco; baja hasta el pecho.' },
  // Polea alta
  { id: 'chins', nombre: 'Dominadas supinas', musculo: 'Espalda', equipo: 'pullup', patron: 'pull', sets: 3, reps: 6, peso: 0, unit: 'reps', cue: 'Palmas hacia ti, pecho a la barra.' },
  { id: 'jalon-cerrado', nombre: 'Apertura en polea a un brazo', musculo: 'Pecho', equipo: 'polea', patron: 'push', sets: 3, reps: 12, peso: 10, unit: 'reps', cue: 'Un brazo a la vez con el manubrio.' },
  { id: 'pullover-polea', nombre: 'Face pull en polea', musculo: 'Hombro', equipo: 'polea', patron: 'pull', sets: 3, reps: 12, peso: 15, unit: 'reps', cue: 'Codos altos; sirve el agarre de tela.' },
  // Peso corporal + trotadora
  { id: 'puente', nombre: 'Puente de glúteo', musculo: 'Pierna', equipo: 'casa', patron: 'hinge', sets: 3, reps: 15, peso: 0, unit: 'reps', cue: 'Sube cadera 2 seg, apoya talones.' },
  { id: 'bulgaras', nombre: 'Sentadilla búlgara', musculo: 'Pierna', equipo: 'casa', patron: 'lunge', sets: 3, reps: 10, peso: 0, unit: 'reps', cue: 'Apoya el pie trasero en una silla.' },
  { id: 'trotadora', nombre: 'Caminata en trotadora', musculo: 'Cardio', equipo: 'cardio', patron: 'jack', sets: 1, reps: 20, peso: 0, unit: 'reps', cue: 'Minutos: camina en inclinación 5-8.' },
  { id: 'trote', nombre: 'Correr en trotadora', musculo: 'Cardio', equipo: 'cardio', patron: 'jack', sets: 1, reps: 15, peso: 0, unit: 'reps', cue: 'Minutos trotando a ritmo cómodo.' },
];
const exById = id => EJERCICIOS.find(e => e.id === id);

/* Fotos locales: convención img/fit/<id>-a|b.webp (a=inicio,b=fin),
   salvo plancha/burpees/cuerda (una sola) y lagartijas (.jpg yuhonas) */
(function () {
  const SINGLE = { plancha: 1, burpees: 1, cuerda: 1, trotadora: 1, trote: 1 };
  EJERCICIOS.forEach(e => {
    if (e.id === 'lagartijas') { e.img = 'img/fit/lagartijas-a.jpg'; e.img2 = 'img/fit/lagartijas-b.jpg'; }
    else if (SINGLE[e.id]) e.img = `img/fit/${e.id}.webp`;
    else { e.img = `img/fit/${e.id}-a.webp`; e.img2 = `img/fit/${e.id}-b.webp`; }
  });
})();

/* Demo con foto real: alterna inicio/fin (efecto movimiento, offline).
   Si la foto falla, cae al SVG animado. */
function demoEx(e, sm) {
  const cls = 'demo photo' + (sm ? ' sm' : '');
  if (!e || !e.img) return `<span class="${cls}">${demoSVG(e ? e.patron : 'squat')}</span>`;
  const b = e.img2 ? `<img class="ph b" src="${e.img2}" alt="" loading="lazy" onerror="this.remove()">` : '';
  return `<span class="${cls}"><img class="ph a" src="${e.img}" alt="${escAttr(e.nombre)}" loading="lazy" onerror="fitImgFB(this,'${e.patron}')">` + b + `</span>`;
}
function escAttr(s) { return (s || '').replace(/"/g, '&quot;'); }
function fitImgFB(img, patron) {
  const d = img.closest('.demo');
  if (d) d.innerHTML = demoSVG(patron);
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/* Rutina inicial de ejemplo (casa, 3 días). El usuario la edita libremente. */
function rutinaInicial() {
  const pick = (id, sets, reps, peso) => ({ ex: id, sets, reps, peso });
  return {
    Lun: [pick('lagartijas', 3, 10, 0), pick('sentadilla', 3, 12, 0), pick('plancha', 3, 30, 0), pick('crunch', 3, 12, 0)],
    Mar: [],
    Mié: [pick('zancadas', 3, 10, 0), pick('fondos', 3, 8, 0), pick('superman', 3, 10, 0), pick('jacks', 3, 30, 0)],
    Jue: [],
    Vie: [pick('sentadilla', 3, 12, 0), pick('lagartijas', 3, 10, 0), pick('climbers', 3, 30, 0), pick('plancha', 3, 30, 0)],
    Sáb: [],
    Dom: [],
  };
}

/* ---------- Demos animadas (stick figures SVG + CSS) ---------- */
function demoSVG(patron) {
  const S = 'stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"';
  const H = '<circle cx="32" cy="10" r="5" fill="currentColor"/>';
  const figs = {
    squat: `${H}<g class="a-squat"><line x1="32" y1="16" x2="32" y2="34" ${S}/><line x1="32" y1="34" x2="22" y2="50" ${S}/><line x1="32" y1="34" x2="42" y2="50" ${S}/><line x1="32" y1="22" x2="20" y2="30" ${S}/><line x1="32" y1="22" x2="44" y2="30" ${S}/></g>`,
    push: `${H}<g class="a-push"><line x1="14" y1="40" x2="46" y2="40" ${S}/><line x1="20" y1="40" x2="20" y2="54" ${S}/><line x1="40" y1="40" x2="40" y2="54" ${S}/><line x1="46" y1="40" x2="54" y2="46" ${S}/></g>`,
    hinge: `${H}<g class="a-hinge"><line x1="32" y1="16" x2="32" y2="36" ${S}/><line x1="32" y1="36" x2="24" y2="54" ${S}/><line x1="32" y1="36" x2="40" y2="54" ${S}/><line x1="32" y1="24" x2="18" y2="44" ${S}/></g>`,
    row: `${H}<line x1="32" y1="16" x2="32" y2="36" ${S}/><g class="a-row"><line x1="32" y1="24" x2="50" y2="30" ${S}/><rect x="48" y="26" width="8" height="8" fill="currentColor"/></g><line x1="32" y1="36" x2="24" y2="54" ${S}/><line x1="32" y1="36" x2="40" y2="54" ${S}/>`,
    pull: `${H}<line x1="8" y1="6" x2="56" y2="6" ${S}/><g class="a-press"><line x1="24" y1="6" x2="24" y2="24" ${S}/><line x1="40" y1="6" x2="40" y2="24" ${S}/><line x1="24" y1="24" x2="40" y2="24" ${S}/><line x1="32" y1="24" x2="32" y2="42" ${S}/></g>`,
    press: `${H}<line x1="32" y1="16" x2="32" y2="38" ${S}/><g class="a-press"><line x1="32" y1="22" x2="16" y2="12" ${S}/><line x1="32" y1="22" x2="48" y2="12" ${S}/></g><line x1="32" y1="38" x2="24" y2="56" ${S}/><line x1="32" y1="38" x2="40" y2="56" ${S}/>`,
    curl: `${H}<line x1="32" y1="16" x2="32" y2="38" ${S}/><line x1="32" y1="24" x2="18" y2="24" ${S}/><g class="a-curl"><line x1="32" y1="24" x2="46" y2="24" ${S}/><circle cx="48" cy="24" r="4" fill="currentColor"/></g><line x1="32" y1="38" x2="24" y2="56" ${S}/><line x1="32" y1="38" x2="40" y2="56" ${S}/>`,
    lunge: `${H}<g class="a-lunge"><line x1="32" y1="16" x2="30" y2="34" ${S}/><line x1="30" y1="34" x2="16" y2="44" ${S}/><line x1="16" y1="44" x2="16" y2="56" ${S}/><line x1="30" y1="34" x2="46" y2="48" ${S}/><line x1="46" y1="48" x2="46" y2="56" ${S}/></g>`,
    plank: `${H}<g class="a-plank"><line x1="12" y1="42" x2="50" y2="34" ${S}/><line x1="20" y1="41" x2="20" y2="55" ${S}/><line x1="30" y1="39" x2="30" y2="53" ${S}/></g>`,
    crunch: `<circle cx="14" cy="48" r="5" fill="currentColor"/><g class="a-crunch"><line x1="18" y1="46" x2="40" y2="40" ${S}/><circle cx="46" cy="38" r="5" fill="currentColor"/></g><line x1="20" y1="52" x2="44" y2="52" ${S}/>`,
    jack: `${H}<g class="a-jack"><line x1="32" y1="16" x2="32" y2="36" ${S}/><line x1="32" y1="22" x2="18" y2="30" ${S}/><line x1="32" y1="22" x2="46" y2="30" ${S}/><line x1="32" y1="36" x2="24" y2="54" ${S}/><line x1="32" y1="36" x2="40" y2="54" ${S}/></g>`,
    calf: `${H}<line x1="32" y1="16" x2="32" y2="36" ${S}/><g class="a-calf"><line x1="32" y1="36" x2="26" y2="56" ${S}/><line x1="32" y1="36" x2="38" y2="56" ${S}/></g>`,
  };
  return `<svg viewBox="0 0 64 64" class="demo-svg" aria-hidden="true">${figs[patron] || figs.squat}</svg>`;
}
