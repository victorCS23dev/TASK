/* ============================================================
 * app.js — Mi Hub: Ruta SQL+PowerBI + Tasklist (+ futuras apps)
 * ------------------------------------------------------------
 * CÓMO AGREGAR UNA APP NUEVA (sin tocar el inicio):
 *  1. Crea su <section id="view-miapp" class="hidden"> en index.html
 *     (hay una plantilla comentada al final de las vistas).
 *  2. Registra UNA entrada en APPS (abajo): { id:'miapp', name,
 *     emoji, desc, accent, view:'view-miapp', sub, status, render }.
 *  3. Listo: aparece sola en el Hub, con router #/miapp incluido.
 *
 * CAPAS:
 *  DATA   -> ruta-data.js (currículo, solo lectura)
 *  STORE  -> LocalStorage 'rutaTaskDashboard.v2' (+ migra v1 sola)
 *  ROUTER -> hash #/ / #/ruta / #/tareas (+ las que agregues)
 *  RENDER -> renderHome() + renderRuta() + renderTareas() + stats
 * ============================================================ */
const KEY_V2 = 'rutaTaskDashboard.v2';
const KEY_V1 = 'tareasDiarias.v1';
const $ = id => document.getElementById(id);

let store = loadOrMigrate();
let deferredPrompt = null;

/* ---------------- utils ---------------- */
function todayStr(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function norm(t) { return (t || '').trim().toLowerCase().replace(/\s+/g, ' '); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(s) { return (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ---------------- store + migración ---------------- */
function blankStore() {
  return {
    theme: null, view: 'home', selectedDate: todayStr(),
    days: {}, ruta: { topicsDone: {}, weekState: {}, habits: {}, notes: {}, openMod: { m1: true }, openSem: {} },
    activity: {}, filters: { cat: '', estado: '', prio: '' }, ui: { showStats: true },
  };
}
function loadOrMigrate() {
  try {
    const raw = localStorage.getItem(KEY_V2);
    if (raw) {
      const s = Object.assign(blankStore(), JSON.parse(raw));
      if (s.days && s.ruta) { if (!s.view) s.view = s.tab || 'home'; delete s.tab; if (!s.ui || typeof s.ui.showStats !== 'boolean') s.ui = { showStats: true }; return s; }
    }
  } catch {}
  const s = blankStore();
  try {
    const old = JSON.parse(localStorage.getItem(KEY_V1) || 'null');
    if (old && old.days) { s.days = old.days; s.theme = old.theme || null; }
  } catch {}
  return s;
}
function save() { try { localStorage.setItem(KEY_V2, JSON.stringify(store)); } catch {} }
function markActivity() { store.activity[todayStr()] = 1; }

/* ============================================================
 * REGISTRO DE APPS — el Hub se dibuja desde aquí.
 * ============================================================ */
const APPS = [
  {
    id: 'ruta', name: 'Ruta de Aprendizaje', emoji: '🎓',
    desc: 'SQL + Power BI en 3 módulos y 8 semanas, con hábitos y bitácora.',
    accent: '#4f46e5', view: 'viewRuta', sub: 'SQL · Power BI · DAX',
    status: () => {
      const g = globalProgress();
      return g.pct === 100 ? '🏁 ¡Completada!' : `${g.pct}% · ${g.total - g.done} temas por ver`;
    },
    render: renderRuta,
  },
  {
    id: 'tareas', name: 'Tasklist Personal', emoji: '✅',
    desc: 'Tareas diarias de trabajo, proyecto y vida. Se arrastran sin duplicarse.',
    accent: '#16a34a', view: 'viewTareas', sub: 'Trabajo · Proyecto · Personal',
    status: () => {
      const hoy = tasksOf(todayStr());
      const p = hoy.filter(t => !t.done).length;
      return p === 0 ? (hoy.length ? '🎉 Día al día' : 'Sin tareas hoy') : `${p} pendiente${p === 1 ? '' : 's'} hoy`;
    },
    render: renderTareas,
  },
  // Ejemplo futura app:
  // { id:'finanzas', name:'Finanzas', emoji:'💰', desc:'Gastos del mes.',
  //   accent:'#d97706', view:'view-miapp', sub:'Personal',
  //   status:()=>'—', render:()=>{} },
];
const appById = id => APPS.find(a => a.id === id);

/* ---------------- router por hash ---------------- */
const VIEWS = ['viewHome', ...APPS.map(a => a.view)];
function go(id) {
  const valid = id === 'home' || appById(id);
  location.hash = '#/' + (valid ? id : 'home');
}
function currentRoute() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  return h === '' ? 'home' : h;
}
function syncRoute() {
  let r = currentRoute();
  if (r !== 'home' && !appById(r)) r = 'home';
  store.view = r; save();
  VIEWS.forEach(v => $(v)?.classList.add('hidden'));
  if (r === 'home') {
    $('viewHome').classList.remove('hidden');
    $('appbar').classList.add('hidden');
    renderHome();
  } else {
    const app = appById(r);
    $('appbar').classList.remove('hidden');
    $('appbarName').textContent = `${app.emoji} ${app.name}`;
    $('appbarSub').textContent = app.sub || '';
    $(app.view).classList.remove('hidden');
    document.querySelectorAll(`#${app.view} .switcher button`).forEach(b =>
      b.classList.toggle('active', b.dataset.go === r));
    app.render();
  }
  renderHubHeader();
  window.scrollTo({ top: 0 });
}
window.addEventListener('hashchange', syncRoute);
$('btnHome').onclick = () => go('home');
document.querySelectorAll('.switcher button').forEach(b => b.onclick = () => go(b.dataset.go));

/* ---------------- Hub / inicio ---------------- */
function renderHubHeader() {
  $('fechaLabel').textContent = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  $('streakTop').textContent = `🔥 ${streak()}`;
}
function renderHome() {
  renderHubHeader();
  const g = globalProgress();
  const hoy = tasksOf(todayStr());
  const pend = hoy.filter(t => !t.done).length;
  const r = streak();
  $('hubRuta').textContent = g.pct + '%';
  $('hubPend').textContent = pend;
  $('hubRacha').textContent = r;
  const cw = currentWeek();
  $('hubMsg').textContent = g.pct === 100
    ? '🏁 Ruta completada. Hoy toca sostener con tareas.'
    : pend > 0
      ? `Tienes ${pend} pendiente${pend === 1 ? '' : 's'} hoy. ¿Estudiamos un poco?`
      : 'Día despejado. Buen momento para avanzar la ruta.';
  $('hubSub').textContent = cw ? `📌 Siguiente: ${cw.titulo} · ${g.done}/${g.total} temas` : '🎓 Ruta al 100%';

  const grid = $('appGrid');
  grid.innerHTML = '';
  APPS.forEach(app => {
    const b = document.createElement('button');
    b.className = 'app-card';
    b.style.setProperty('--accent', app.accent);
    b.innerHTML = `<span class="app-emoji">${app.emoji}</span>
      <span class="grow"><h3>${esc(app.name)}</h3><p>${esc(app.desc)}</p>
      <span class="app-meta"><span class="app-status">${esc(app.status())}</span>
      <span class="app-open">Abrir ›</span></span></span>`;
    b.onclick = () => go(app.id);
    grid.appendChild(b);
  });
}

/* ---------------- RUTA: progreso ---------------- */
function weekProgress(w) {
  const st = store.ruta.weekState[w.id];
  if (st === 'dominado') return { done: w.topics.length, total: w.topics.length, pct: 100 };
  if (st === 'omitido') return { done: 0, total: 0, pct: 100, omitida: true };
  const done = w.topics.filter(t => store.ruta.topicsDone[t.id]).length;
  return { done, total: w.topics.length, pct: w.topics.length ? Math.round(done / w.topics.length * 100) : 100 };
}
function moduleProgress(m) {
  let done = 0, total = 0;
  m.semanas.forEach(w => { const p = weekProgress(w); done += p.done; total += p.total; });
  return { done, total, pct: total ? Math.round(done / total * 100) : 100 };
}
function globalProgress() {
  let done = 0, total = 0;
  RUTA.modulos.forEach(m => { const p = moduleProgress(m); done += p.done; total += p.total; });
  return { done, total, pct: total ? Math.round(done / total * 100) : 100 };
}
function currentWeek() {
  for (const m of RUTA.modulos) for (const w of m.semanas) {
    if (store.ruta.weekState[w.id] === 'omitido') continue;
    if (weekProgress(w).pct < 100) return w;
  }
  return null;
}
function streak() {
  const dates = new Set(Object.keys(store.activity));
  Object.keys(store.days).forEach(ds => {
    const a = store.days[ds] || [];
    if (a.length && a.every(t => t.done)) dates.add(ds);
  });
  let n = 0, d = new Date();
  if (!dates.has(todayStr(d))) d = new Date(d.getTime() - 864e5);
  while (dates.has(todayStr(d))) { n++; d = new Date(d.getTime() - 864e5); }
  return n;
}

/* ---------------- RUTA: render ---------------- */
function renderRuta() {
  const g = globalProgress(), cw = currentWeek(), racha = streak();
  $('rutaContador').textContent = `${g.pct}% completado`;
  $('rutaDetalle').textContent = `${g.done}/${g.total} temas`;
  $('rutaFill').style.width = g.pct + '%';
  $('rachaCard').textContent = `🔥 Racha: ${racha} día${racha === 1 ? '' : 's'}`;
  $('semanaActual').textContent = cw ? `📌 Vas en: ${cw.titulo}` : '🏁 ¡Ruta completada!';
  $('rutaMsg').textContent = g.pct === 100 ? '🎉 Ruta dominada. Súbela a tu portafolio.' : cw ? `Siguiente paso: ${cw.objetivo}` : '';

  const wrap = $('modulos');
  wrap.innerHTML = '';
  RUTA.modulos.forEach(m => {
    const mp = moduleProgress(m);
    const open = store.ruta.openMod[m.id] !== false;
    const mod = document.createElement('div');
    mod.className = 'modulo';
    mod.innerHTML = `
      <button class="mod-head">
        <span class="grow"><h2>${esc(m.titulo)}</h2><p>${esc(m.desc)}</p>
        <div class="mini-bar"><i style="width:${mp.pct}%"></i></div></span>
        <span style="font-size:.75rem;font-weight:800">${mp.pct}%</span>
        <span class="chev">${open ? '▾' : '▸'}</span>
      </button>
      <div class="${open ? '' : 'hidden'}"></div>`;
    mod.querySelector('.mod-head').onclick = () => { store.ruta.openMod[m.id] = !open; save(); renderRuta(); };
    const body = mod.children[1];
    m.semanas.forEach(w => body.appendChild(weekCard(w)));
    wrap.appendChild(mod);
  });
}

function weekCard(w) {
  const p = weekProgress(w);
  const st = store.ruta.weekState[w.id];
  const open = store.ruta.openSem[w.id] === true || (store.ruta.openSem[w.id] === undefined && p.pct < 100);
  const el = document.createElement('div');
  el.className = 'semana';
  el.innerHTML = `
    <button class="sem-head">
      <span class="grow"><strong>${esc(w.titulo)}</strong>
      <small>${p.omitida ? 'Omitida (no cuenta)' : p.done + '/' + p.total + ' temas · ' + p.pct + '%'} · ${esc(w.objetivo)}</small></span>
      ${st === 'dominado' ? '<span class="tag dom">★ Dominado</span>' : st === 'omitido' ? '<span class="tag omi">Omitida</span>' : ''}
      <span class="chev">${open ? '▾' : '▸'}</span>
    </button>
    <div class="sem-body ${open ? '' : 'hidden'}"></div>`;
  el.querySelector('.sem-head').onclick = () => { store.ruta.openSem[w.id] = !open; save(); renderRuta(); };
  const body = el.querySelector('.sem-body');
  if (st === 'omitido') {
    const msg = document.createElement('p');
    msg.className = 'objetivo'; msg.textContent = 'Semana omitida: excluida del progreso. Reármala cuando quieras.';
    body.appendChild(msg);
  } else {
    w.topics.forEach(t => {
      const done = !!store.ruta.topicsDone[t.id] || st === 'dominado';
      const lab = document.createElement('label');
      lab.className = 'topic' + (done ? ' done' : '');
      lab.innerHTML = `<input type="checkbox" ${done ? 'checked' : ''} ${st === 'dominado' ? 'disabled' : ''}/><span>${esc(t.text)}</span>`;
      lab.querySelector('input').onchange = ev => {
        if (ev.target.checked) { store.ruta.topicsDone[t.id] = todayStr(); markActivity(); }
        else delete store.ruta.topicsDone[t.id];
        save(); refresh();
      };
      body.appendChild(lab);
    });
  }
  const acts = document.createElement('div');
  acts.className = 'week-actions';
  acts.innerHTML = `
    <button class="chip-btn ${st === 'dominado' ? 'on' : ''}">★ ${st === 'dominado' ? 'Dominado ✓' : 'Marcar dominado'}</button>
    <button class="chip-btn ${st === 'omitido' ? 'on' : ''}">${st === 'omitido' ? 'Reactivar semana' : 'Omitir semana'}</button>`;
  acts.children[0].onclick = () => {
    if (st === 'dominado') delete store.ruta.weekState[w.id];
    else { store.ruta.weekState[w.id] = 'dominado'; markActivity(); w.topics.forEach(t => store.ruta.topicsDone[t.id] = store.ruta.topicsDone[t.id] || todayStr()); }
    save(); refresh();
  };
  acts.children[1].onclick = () => {
    if (st === 'omitido') delete store.ruta.weekState[w.id];
    else store.ruta.weekState[w.id] = 'omitido';
    save(); refresh();
  };
  body.appendChild(acts);
  body.appendChild(habitBlock(w));
  body.appendChild(noteBlock(w));
  return el;
}

function habitBlock(w) {
  const box = document.createElement('div');
  box.className = 'subblock';
  box.innerHTML = `<h4>✈️ Micro-hábitos de viaje</h4>`;
  const list = document.createElement('div');
  const habits = store.ruta.habits[w.id] || [];
  if (!habits.length) {
    const s = document.createElement('p');
    s.className = 'objetivo'; s.textContent = `Sugerido: ${w.habitoSugerido}. Agrega el tuyo 👇`;
    box.appendChild(s);
  }
  habits.forEach(h => {
    const row = document.createElement('label');
    row.className = 'habit' + (h.done ? ' done' : '');
    row.innerHTML = `<input type="checkbox" ${h.done ? 'checked' : ''}/><span>${esc(h.text)}</span><button class="del icon-mini">✕</button>`;
    row.querySelector('input').onchange = ev => { h.done = ev.target.checked; if (h.done) markActivity(); save(); refresh(); };
    row.querySelector('.del').onclick = ev => {
      ev.preventDefault();
      store.ruta.habits[w.id] = (store.ruta.habits[w.id] || []).filter(x => x.id !== h.id);
      save(); renderRuta();
    };
    list.appendChild(row);
  });
  box.appendChild(list);
  const f = document.createElement('div');
  f.className = 'habit-form';
  f.innerHTML = `<input placeholder="Ej: SoloLearn: 10 min" maxlength="80"/><button class="chip-btn">＋</button>`;
  const inp = f.querySelector('input');
  f.querySelector('button').onclick = () => {
    const t = inp.value.trim(); if (!t) return;
    (store.ruta.habits[w.id] = store.ruta.habits[w.id] || []).push({ id: uid(), text: t, done: false });
    save(); renderRuta();
  };
  inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); f.querySelector('button').click(); } };
  box.appendChild(f);
  return box;
}

function noteBlock(w) {
  const box = document.createElement('div');
  box.className = 'subblock';
  box.innerHTML = `<h4>📝 Bitácora — pega SQL / DAX aquí</h4>`;
  const ta = document.createElement('textarea');
  ta.className = 'bitacora';
  ta.placeholder = 'Ej:\nSELECT categoria, SUM(total) FROM ventas GROUP BY 1;\nVentas YTD = TOTALYTD(SUM(Ventas[Total]), Calendario[Fecha])';
  ta.value = store.ruta.notes[w.id] || '';
  let t = null;
  ta.oninput = () => { clearTimeout(t); t = setTimeout(() => { store.ruta.notes[w.id] = ta.value; save(); }, 400); };
  box.appendChild(ta);
  const row = document.createElement('div');
  row.className = 'bit-row';
  row.innerHTML = `<button class="chip-btn">📋 Copiar</button><button class="chip-btn">🗑 Limpiar</button>`;
  row.children[0].onclick = () => { navigator.clipboard?.writeText(ta.value || '').then(() => row.children[0].textContent = '✓ Copiado').catch(() => {}); setTimeout(() => row.children[0].textContent = '📋 Copiar', 1500); };
  row.children[1].onclick = () => { if (confirm('¿Limpiar bitácora de esta semana?')) { ta.value = ''; store.ruta.notes[w.id] = ''; save(); } };
  box.appendChild(row);
  return box;
}

/* ---------------- TAREAS ---------------- */
function tasksOf(ds) { if (!store.days[ds]) store.days[ds] = []; return store.days[ds]; }
function ensureToday() {
  const hoy = todayStr();
  if (!store.days[hoy]) store.days[hoy] = [];
  const anteriores = Object.keys(store.days).filter(d => d < hoy).sort();
  if (anteriores.length && store.days[hoy].length === 0) {
    const vistos = new Set();
    for (let i = anteriores.length - 1; i >= 0; i--) {
      for (const t of (store.days[anteriores[i]] || [])) {
        if (!t.done) {
          const n = norm(t.text);
          if (n && !vistos.has(n)) {
            vistos.add(n);
            store.days[hoy].push({ id: uid(), text: t.text.trim(), done: false, carried: true, cat: t.cat || 'Personal', prio: t.prio || 'Media' });
          }
        }
      }
    }
    save();
  }
}
function fmtCorto(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  if (ds === todayStr()) return 'Hoy';
  if (ds === todayStr(new Date(Date.now() - 864e5))) return 'Ayer';
  return new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'short' });
}
const PRIO_ORD = { Alta: 0, Media: 1, Baja: 2 };

function filteredTasks() {
  const arr = tasksOf(store.selectedDate);
  const f = store.filters;
  return arr.filter(t =>
    (!f.cat || (t.cat || 'Personal') === f.cat) &&
    (!f.prio || (t.prio || 'Media') === f.prio) &&
    (!f.estado || (f.estado === 'done' ? t.done : !t.done)));
}

function renderTareas() {
  ensureToday();
  const all = tasksOf(store.selectedDate);
  const done = all.filter(t => t.done).length;
  const pct = all.length ? Math.round(done / all.length * 100) : 0;
  $('contador').textContent = all.length ? `${done} de ${all.length} completadas` : 'Sin tareas';
  $('porcentaje').textContent = pct + '%';
  $('progressFill').style.width = pct + '%';
  $('mensaje').textContent =
    !all.length ? 'Trabajo, proyecto u organización personal. Lo pendiente se arrastra a mañana.' :
    pct === 100 ? '🎉 ¡Día completado!' :
    store.selectedDate !== todayStr() ? '📁 Historial (los pendientes ya viven en hoy).' :
    `Te faltan ${all.length - done}. Las de Alta van primero 🔺`;

  const list = filteredTasks()
    .sort((a, b) => (a.done - b.done) || (PRIO_ORD[a.prio || 'Media'] - PRIO_ORD[b.prio || 'Media']));
  const ul = $('lista');
  ul.innerHTML = '';
  $('vacio').classList.toggle('hidden', list.length > 0);
  list.forEach(t => {
    const li = document.createElement('li');
    li.className = 'task' + (t.done ? ' done' : '');
    li.innerHTML = `
      <button class="check">✓</button>
      <span class="task-text">${esc(t.text)}</span>
      <span class="meta"><span class="cat">${esc(t.cat || 'Personal')}</span><span class="prio prio-${esc(t.prio || 'Media')}">${esc(t.prio || 'Media')}</span></span>
      ${t.carried && !t.done ? '<span class="badge">↩ ayer</span>' : ''}
      <button class="icon-mini btn-edit" title="Editar">✏️</button>
      <button class="icon-mini btn-del" title="Eliminar">🗑</button>`;
    const toggle = () => { t.done = !t.done; if (t.done) markActivity(); save(); refresh(); };
    li.querySelector('.check').onclick = toggle;
    li.querySelector('.task-text').onclick = toggle;
    li.querySelector('.btn-edit').onclick = () => {
      const nt = prompt('Editar tarea:', t.text);
      if (nt === null) return;
      const v = nt.trim(); if (!v) return;
      if (all.some(x => x.id !== t.id && norm(x.text) === norm(v))) { alert('Ya existe una tarea igual hoy.'); return; }
      t.text = v; save(); refresh();
    };
    li.querySelector('.btn-del').onclick = () => {
      if (confirm(`¿Eliminar "${t.text}"?`)) {
        const a = tasksOf(store.selectedDate);
        a.splice(a.findIndex(x => x.id === t.id), 1);
        save(); refresh();
      }
    };
    ul.appendChild(li);
  });
  $('fCat').value = store.filters.cat; $('fEstado').value = store.filters.estado; $('fPrio').value = store.filters.prio;
  renderStrip();
  renderStats();
  applyStatsVisibility();
}

function renderStrip() {
  const strip = $('dayStrip');
  strip.innerHTML = '';
  const dias = [];
  for (let i = 6; i >= 0; i--) dias.push(todayStr(new Date(Date.now() - i * 864e5)));
  if (!dias.includes(store.selectedDate)) dias.push(store.selectedDate);
  dias.sort().forEach(ds => {
    const arr = store.days[ds] || [];
    const pend = arr.filter(t => !t.done).length;
    const c = document.createElement('button');
    c.className = 'day-chip' + (ds === store.selectedDate ? ' active' : '') + (pend ? ' has-pending' : '');
    c.innerHTML = `<small>${parseInt(ds.slice(8, 10), 10)}</small>${fmtCorto(ds)}${pend ? ` •${pend}` : ''}`;
    c.onclick = () => { store.selectedDate = ds; save(); refresh(); };
    strip.appendChild(c);
  });
  $('btnNext').disabled = store.selectedDate >= todayStr();
  $('btnNext').style.opacity = store.selectedDate >= todayStr() ? .35 : 1;
}

function renderStats() {
  const g = globalProgress();
  let totalDone = Object.keys(store.ruta.topicsDone).length;
  Object.keys(store.days).sort().slice(-30).forEach(ds => totalDone += (store.days[ds] || []).filter(t => t.done).length);
  $('stRacha').textContent = streak();
  $('stTotal').textContent = totalDone;
  const hoy = store.days[todayStr()] || [];
  $('stHoy').textContent = (hoy.length ? Math.round(hoy.filter(t => t.done).length / hoy.length * 100) : 0) + '%';
  $('stRuta').textContent = g.pct + '%';
  const ch = $('chart'); ch.innerHTML = '';
  for (let i = 6; i >= 0; i--) {
    const ds = todayStr(new Date(Date.now() - i * 864e5));
    const a = store.days[ds] || [];
    const pct = a.length ? Math.round(a.filter(t => t.done).length / a.length * 100) : (store.activity[ds] ? 100 : 0);
    const div = document.createElement('div');
    div.className = 'bar'; div.title = `${ds}: ${pct}%`;
    div.innerHTML = `<div class="bar-fill" style="height:${Math.max(4, pct)}px;opacity:${pct ? 1 : .3}"></div><span>${ds.slice(8, 10)}/${ds.slice(5, 7)}</span>`;
    ch.appendChild(div);
  }
}

/* Refresca la vista actual sin tocar el router */
function refresh() {
  if (store.view === 'home') renderHome();
  else appById(store.view)?.render();
  save();
}

/* ---------------- eventos globales ---------------- */
$('formAdd').addEventListener('submit', e => {
  e.preventDefault();
  if (store.selectedDate !== todayStr()) {
    if (!confirm('Estás en un día pasado. ¿Ir a HOY para agregar?')) return;
    store.selectedDate = todayStr();
  }
  const txt = $('inputTask').value.trim();
  if (!txt) return;
  const arr = tasksOf(todayStr());
  if (arr.some(t => norm(t.text) === norm(txt))) {
    const a = $('avisoDuplicado');
    a.classList.remove('hidden');
    setTimeout(() => a.classList.add('hidden'), 2500);
    return;
  }
  arr.push({ id: uid(), text: txt, done: false, carried: false, cat: $('selCat').value, prio: $('selPrio').value });
  $('inputTask').value = '';
  save(); refresh();
  $('inputTask').focus();
});
$('fCat').onchange = e => { store.filters.cat = e.target.value; save(); renderTareas(); };
$('fEstado').onchange = e => { store.filters.estado = e.target.value; save(); renderTareas(); };
$('fPrio').onchange = e => { store.filters.prio = e.target.value; save(); renderTareas(); };
$('btnPrev').onclick = () => {
  const d = new Date(store.selectedDate + 'T12:00:00');
  store.selectedDate = todayStr(new Date(d.getTime() - 864e5)); save(); refresh();
};
$('btnNext').onclick = () => {
  if (store.selectedDate >= todayStr()) return;
  const d = new Date(store.selectedDate + 'T12:00:00');
  store.selectedDate = todayStr(new Date(d.getTime() + 864e5)); save(); refresh();
};
$('btnToday').onclick = () => { store.selectedDate = todayStr(); save(); refresh(); };
$('btnExport').onclick = () => {
  const data = { exportado: new Date().toISOString(), ruta: store.ruta, days: store.days, activity: store.activity };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'respaldo-mi-hub.json'; a.click();
};
$('btnClear').onclick = () => {
  if (confirm('¿Borrar TODA la ruta y tareas? No se puede deshacer.')) {
    const theme = store.theme, ui = store.ui;
    store = blankStore(); store.theme = theme; if (ui) store.ui = ui; save(); refresh();
  }
};
/* Mostrar / ocultar estadísticas (preferencia persistida) */
function applyStatsVisibility() {
  const show = !store.ui || store.ui.showStats !== false;
  $('panelStats').classList.toggle('hidden', !show);
  $('btnStatsToggle').textContent = show ? '📊 Ocultar estadísticas' : '📊 Mostrar estadísticas';
}
$('btnStatsToggle').onclick = () => {
  store.ui = store.ui || {};
  store.ui.showStats = (store.ui.showStats !== false) ? false : true;
  save(); applyStatsVisibility();
};
/* Importar respaldo JSON (el que genera 📤 Exportar) */
$('btnImport').onclick = () => $('fileImport').click();
$('fileImport').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      const days = d.days || (d.store && d.store.days);
      const ruta = d.ruta || (d.store && d.store.ruta);
      if (!days || typeof days !== 'object' || !ruta || typeof ruta !== 'object') throw new Error('formato');
      if (!ruta.topicsDone || !ruta.weekState) throw new Error('formato');
      store.days = days;
      store.ruta = Object.assign(blankStore().ruta, ruta);
      if (d.activity && typeof d.activity === 'object') store.activity = d.activity;
      store.selectedDate = todayStr();
      save(); refresh();
      alert('✅ Respaldo importado correctamente.');
    } catch { alert('⚠️ Ese archivo no es un respaldo válido de Mi Hub.'); }
    e.target.value = '';
  };
  r.readAsText(f);
};
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const icon = t === 'dark' ? '☀️' : '🌙';
  $('btnTheme').textContent = icon;
  const hb = $('btnThemeHome'); if (hb) hb.textContent = icon;
  document.querySelector('meta[name="theme-color"]').content = t === 'dark' ? '#111318' : '#4f46e5';
}
function toggleTheme() {
  store.theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  save(); applyTheme(store.theme);
}
$('btnTheme').onclick = toggleTheme;
$('btnThemeHome').onclick = toggleTheme;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  $('btnInstall').classList.remove('hidden');
});
$('btnInstall').onclick = async () => {
  if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('btnInstall').classList.add('hidden'); }
  else alert('En tu celular: menú ⋮ > "Agregar a pantalla principal".');
};
setInterval(() => { if (!store.days[todayStr()]) { store.selectedDate = todayStr(); refresh(); } }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

/* ---------------- init ---------------- */
applyTheme(store.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
if (!location.hash) {
  // Usuarios existentes entraban directo a su tab: respétalo una vez.
  const legacy = store.view && store.view !== 'home' ? store.view : 'home';
  location.hash = '#/' + legacy;
}
syncRoute();
