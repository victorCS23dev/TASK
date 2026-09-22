// Tareas Diarias — lógica principal
// Modelo: days = { "YYYY-MM-DD": [{id, text, done, carried}] }
const KEY = 'tareasDiarias.v1';
const $ = id => document.getElementById(id);
const lista = $('lista'), input = $('inputTask'), form = $('formAdd');

let store = load();
let selectedDate = todayStr();
let deferredPrompt = null;

function todayStr(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); if (s.days) return s; }
  } catch {}
  return { days: {}, theme: null };
}
function save() { localStorage.setItem(KEY, JSON.stringify(store)); }
function norm(t) { return t.trim().toLowerCase().replace(/\s+/g, ' '); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function sortedDates() { return Object.keys(store.days).sort(); }
function prevDate(dateStr) {
  const ds = sortedDates().filter(d => d < dateStr);
  return ds.length ? ds[ds.length - 1] : null;
}

// Núcleo pedido: al llegar un día nuevo, crear su espacio y arrastrar
// pendientes no completadas, SIN mostrar repetidos.
function ensureToday() {
  const hoy = todayStr();
  if (!store.days[hoy]) store.days[hoy] = [];
  // Buscar el día anterior más cercano con contenido (por si pasaron varios días)
  // y arrastrar todo lo pendiente acumulado.
  const anteriores = sortedDates().filter(d => d < hoy);
  if (anteriores.length && store.days[hoy].length === 0) {
    // Recolectar pendientes de TODOS los días anteriores no completadas,
    // para no perder nada si la app no se abrió en días.
    const vistos = new Set(store.days[hoy].map(t => norm(t.text)));
    // Recorremos de más reciente a más antiguo para priorizar lo reciente
    for (let i = anteriores.length - 1; i >= 0; i--) {
      const arr = store.days[anteriores[i]] || [];
      for (const t of arr) {
        if (!t.done) {
          const n = norm(t.text);
          if (n && !vistos.has(n)) {
            vistos.add(n);
            store.days[hoy].push({ id: uid(), text: t.text.trim(), done: false, carried: true });
          }
        }
      }
    }
    save();
  }
  // Limpieza suave: conservar historia (no se borra nada automáticamente)
}

function tasksOf(dateStr) {
  if (!store.days[dateStr]) store.days[dateStr] = [];
  return store.days[dateStr];
}

// ---------- Render ----------
function fmtFecha(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  return f.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}
function fmtCorto(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  const hoy = todayStr();
  if (dateStr === hoy) return 'Hoy';
  const ayer = todayStr(new Date(Date.now() - 864e5));
  if (dateStr === ayer) return 'Ayer';
  return f.toLocaleDateString('es', { weekday: 'short' });
}

function render() {
  ensureToday();
  const tasks = tasksOf(selectedDate);
  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const pct = total ? Math.round(done / total * 100) : 0;

  $('fechaLabel').textContent = fmtFecha(selectedDate) + (selectedDate === todayStr() ? ' • hoy' : '');
  $('contador').textContent = total ? `${done} de ${total} completadas` : 'Sin tareas';
  $('porcentaje').textContent = pct + '%';
  $('progressFill').style.width = pct + '%';
  $('mensaje').textContent =
    !total ? 'Agrega tu primer pendiente 👇' :
    pct === 100 ? '🎉 ¡Día completado! Excelente.' :
    selectedDate !== todayStr() ? '📁 Estás viendo historial (solo lectura del pasado).' :
    done === 0 ? `Tienes ${total} pendiente(s). ¡Tú puedes! 💪` :
    `¡Bien! Te faltan ${total - done}.`;

  // Lista
  lista.innerHTML = '';
  $('vacio').classList.toggle('hidden', total > 0);
  // Pendientes primero, hechas después
  [...tasks].sort((a, b) => (a.done - b.done)).forEach(t => {
    const li = document.createElement('li');
    li.className = 'task' + (t.done ? ' done' : '');
    const b = document.createElement('button');
    b.className = 'check'; b.textContent = '✓';
    b.setAttribute('aria-label', t.done ? 'Marcar pendiente' : 'Marcar completada');
    b.onclick = () => { t.done = !t.done; save(); render(); };
    const s = document.createElement('span');
    s.className = 'task-text'; s.textContent = t.text;
    s.onclick = () => { t.done = !t.done; save(); render(); };
    li.appendChild(b); li.appendChild(s);
    if (t.carried && !t.done) {
      const tag = document.createElement('span');
      tag.className = 'badge'; tag.textContent = '↩ ayer';
      li.appendChild(tag);
    }
    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '🗑'; del.title = 'Eliminar';
    del.onclick = () => {
      if (confirm('¿Eliminar "' + t.text + '"?')) {
        const arr = tasksOf(selectedDate);
        const i = arr.findIndex(x => x.id === t.id);
        if (i >= 0) arr.splice(i, 1);
        save(); render();
      }
    };
    li.appendChild(del);
    lista.appendChild(li);
  });

  renderStrip();
  renderStats();
  save();
}

function renderStrip() {
  const strip = $('dayStrip');
  strip.innerHTML = '';
  // Mostrar últimos 7 días incluyendo hoy + fecha seleccionada si es vieja
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    dias.push(todayStr(d));
  }
  if (!dias.includes(selectedDate)) dias.push(selectedDate);
  dias.sort().forEach(ds => {
    const arr = store.days[ds] || [];
    const pend = arr.filter(t => !t.done).length;
    const c = document.createElement('button');
    c.className = 'day-chip' + (ds === selectedDate ? ' active' : '') + (pend > 0 ? ' has-pending' : '');
    const [,, dd] = ds.split('-');
    c.innerHTML = `<small>${parseInt(dd, 10)}</small>${fmtCorto(ds)}${pend ? ` •${pend}` : ''}`;
    c.title = `${fmtFecha(ds)} — ${arr.length - pend}/${arr.length}`;
    c.onclick = () => { selectedDate = ds; render(); };
    strip.appendChild(c);
  });
  $('btnNext').disabled = selectedDate >= todayStr();
  $('btnNext').style.opacity = selectedDate >= todayStr() ? .35 : 1;
}

// ---------- Stats ----------
function stats() {
  const fechas = sortedDates().slice(-30);
  let totalDone = 0, racha = 0;
  fechas.forEach(ds => { totalDone += (store.days[ds] || []).filter(t => t.done).length; });
  // Racha: días consecutivos terminando hoy/ayer con 100% (y al menos 1 tarea)
  let d = new Date();
  if (!((store.days[todayStr()] || []).length)) d = new Date(Date.now() - 864e5); // si hoy vacío, contar desde ayer
  while (true) {
    const ds = todayStr(d);
    const arr = store.days[ds] || [];
    if (arr.length && arr.every(t => t.done)) { racha++; d = new Date(d.getTime() - 864e5); }
    else break;
  }
  const hoyArr = store.days[todayStr()] || [];
  const pctHoy = hoyArr.length ? Math.round(hoyArr.filter(t => t.done).length / hoyArr.length * 100) : 0;
  const ult7 = [];
  for (let i = 6; i >= 0; i--) ult7.push(todayStr(new Date(Date.now() - i * 864e5)));
  const pcts = ult7.map(ds => {
    const a = store.days[ds] || [];
    return { ds, pct: a.length ? Math.round(a.filter(t => t.done).length / a.length * 100) : 0, n: a.length };
  });
  const prom = Math.round(pcts.reduce((s, x) => s + x.pct, 0) / 7);
  return { totalDone, racha, pctHoy, prom, pcts };
}
function renderStats() {
  const s = stats();
  $('stRacha').textContent = s.racha;
  $('stTotal').textContent = s.totalDone;
  $('stHoy').textContent = s.pctHoy + '%';
  $('stProm').textContent = s.prom + '%';
  const ch = $('chart'); ch.innerHTML = '';
  s.pcts.forEach(x => {
    const div = document.createElement('div');
    div.className = 'bar'; div.title = `${fmtFecha(x.ds)}: ${x.pct}% (${x.n} tareas)`;
    div.innerHTML = `<div class="bar-fill" style="height:${Math.max(4, x.pct)}px;opacity:${x.n ? 1 : .3}"></div><span>${x.ds.slice(8, 10)}/${x.ds.slice(5, 7)}</span>`;
    ch.appendChild(div);
  });
}

// ---------- Eventos ----------
form.addEventListener('submit', e => {
  e.preventDefault();
  // Solo permitir agregar en hoy (días pasados son historia)
  if (selectedDate !== todayStr()) {
    if (!confirm('Estás en un día pasado. ¿Ir a HOY para agregar?')) return;
    selectedDate = todayStr();
  }
  const txt = input.value.trim();
  if (!txt) return;
  const arr = tasksOf(todayStr());
  if (arr.some(t => norm(t.text) === norm(txt))) {
    const a = $('avisoDuplicado');
    a.classList.remove('hidden');
    setTimeout(() => a.classList.add('hidden'), 2500);
    input.select();
    return;
  }
  arr.push({ id: uid(), text: txt, done: false, carried: false });
  input.value = '';
  save(); render();
  input.focus();
});

$('btnPrev').onclick = () => {
  const d = new Date(selectedDate + 'T12:00:00');
  selectedDate = todayStr(new Date(d.getTime() - 864e5));
  render();
};
$('btnNext').onclick = () => {
  if (selectedDate >= todayStr()) return;
  const d = new Date(selectedDate + 'T12:00:00');
  selectedDate = todayStr(new Date(d.getTime() + 864e5));
  render();
};
$('btnToday').onclick = () => { selectedDate = todayStr(); render(); };
$('btnStats').onclick = () => $('panelStats').classList.toggle('hidden');
$('btnExport').onclick = () => {
  const blob = new Blob([JSON.stringify(store.days, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'mis-tareas.json'; a.click();
};
$('btnClear').onclick = () => {
  if (confirm('¿Borrar TODAS las tareas e historial? No se puede deshacer.')) {
    store = { days: {}, theme: store.theme };
    selectedDate = todayStr();
    save(); render();
  }
};

// Tema
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('btnTheme').textContent = t === 'dark' ? '☀️' : '🌙';
  document.querySelector('meta[name="theme-color"]').content = t === 'dark' ? '#0f1222' : '#4f46e5';
}
function initTheme() {
  const g = store.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(g);
}
$('btnTheme').onclick = () => {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  store.theme = cur; save(); applyTheme(cur);
};

// Install prompt
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  $('btnInstall').classList.remove('hidden');
});
$('btnInstall').onclick = async () => {
  if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('btnInstall').classList.add('hidden'); }
  else alert('En tu celular: abre el menú ⋮ del navegador > "Agregar a pantalla principal" o "Instalar app".');
};

// Rollover a medianoche
setInterval(() => { const h = todayStr(); if (!store.days[h]) { selectedDate = h; render(); } }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

initTheme();
render();
