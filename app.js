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
    activity: {}, filters: { cat: '', estado: '', prio: '' }, ui: { showStats: true }, meta: { cloudUpdatedAt: 0 },
    fit: blankFit(),
  };
}
function loadOrMigrate() {
  try {
    const raw = localStorage.getItem(KEY_V2);
    if (raw) {
      const s = Object.assign(blankStore(), JSON.parse(raw));
      if (s.days && s.ruta) { if (!s.view) s.view = s.tab || 'home'; delete s.tab; if (!s.ui || typeof s.ui.showStats !== 'boolean') s.ui = { showStats: true }; if (!s.meta) s.meta = { cloudUpdatedAt: 0 }; if (!s.fit || !s.fit.routine) s.fit = Object.assign(blankFit(), s.fit || {}); return s; }
    }
  } catch {}
  const s = blankStore();
  try {
    const old = JSON.parse(localStorage.getItem(KEY_V1) || 'null');
    if (old && old.days) { s.days = old.days; s.theme = old.theme || null; }
  } catch {}
  return s;
}
function save() { try { localStorage.setItem(KEY_V2, JSON.stringify(store)); } catch {} if (window.HubCloud) window.HubCloud.onLocalChange(); }
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
  {
    id: 'fit', name: 'Rutina Fitness', emoji: '💪',
    desc: 'Rutina semanal, demos animadas y récords para superarte.',
    accent: '#f59e0b', view: 'viewFit', sub: 'Fuerza · Casa / Gym',
    status: fitStatus, render: renderFit,
  },
  // Ejemplo futura app:
  // { id:'finanzas', name:'Finanzas', emoji:'💰', desc:'Gastos del mes.',
  //   accent:'#d97706', view:'view-miapp', sub:'Personal',
  //   status:()=>'—', render:()=>{} },
];
/* Estado inicial de fitness (definido aquí; datos en fit-data.js) */
function diaHoy() { return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][new Date().getDay()]; }
function blankFit() {
  return { routine: rutinaInicial(), log: {}, records: {}, body: { height: 0, weights: [] }, ui: { tab: 'hoy', day: diaHoy(), libEquip: '', libMuscle: '', libQ: '' } };
}
function fitStatus() {
  const items = ((store.fit && store.fit.routine && store.fit.routine[diaHoy()]) || []);
  if (!items.length) return 'Hoy descanso 😌';
  const lg = store.fit.log[todayStr()];
  const done = lg ? Object.keys(lg.items).filter(k => (lg.items[k].setsDone || []).every(Boolean)).length : 0;
  return (lg && lg.finished) || done >= items.length ? '🎉 Hoy completo' : `${items.length - done} ejercicios hoy`;
}
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
document.querySelectorAll('.switcher button:not([data-ftab])').forEach(b => b.onclick = () => go(b.dataset.go));
document.querySelectorAll('[data-ftab]').forEach(b => b.onclick = () => { store.fit.ui.tab = b.dataset.ftab; save(); renderFit(); });

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

/* ============================================================
 * FIT — Rutina semanal + sesiones + récords
 * Modelo store.fit: { routine:{Dia:[{ex,sets,reps,peso}]},
 *   log:{date:{day,items:{exId:{setsDone[],reps[],weight}},finished,volume}},
 *   records:{exId:{w,r,v,date}}, ui:{tab,day,libEquip,libMuscle,libQ} }
 * ============================================================ */
let fitTimerInt = null;

/* Número seguro: NaN/undefined/infinito nunca entran al estado */
function num(v, dflt = 0) { v = parseFloat(v); return Number.isFinite(v) ? v : dflt; }

function fitDayItems(d) { return (store.fit.routine[d] || []); }

/* Log de hoy: nace de la rutina y SE SINCRONIZA con ella.
   - Si cambias series en Rutina, Hoy ajusta las bolitas.
   - Si no tocaste nada hoy, adopta reps/peso nuevos de la rutina.
   - Si ya marcaste o editaste algo (touched), se respeta tu trabajo
     y solo se ajusta el largo. */
function todayFitLog() {
  const ds = todayStr(), day = diaHoy();
  let lg = store.fit.log[ds];
  if (!lg || lg.day !== day) {
    lg = { day, items: {}, finished: false, volume: 0 };
    store.fit.log[ds] = lg;
  }
  fitDayItems(day).forEach(r => {
    const ex = exById(r.ex);
    if (!ex) return;
    const sets = Math.max(1, Math.round(num(r.sets, 3)));
    const defReps = Math.max(1, Math.round(num(r.reps, 10)));
    let it = lg.items[r.ex];
    if (!it) {
      lg.items[r.ex] = { setsDone: Array(sets).fill(false), reps: Array(sets).fill(defReps), weight: num(r.peso), touched: false };
      return;
    }
    it.setsDone = Array.from({ length: sets }, (_, i) => !!it.setsDone[i]);
    if (!it.touched) {
      it.reps = Array(sets).fill(defReps);
      it.weight = num(r.peso);
    } else {
      it.reps = Array.from({ length: sets }, (_, i) => num(it.reps[i], defReps));
      it.weight = num(it.weight);
    }
  });
  return lg;
}
function fitVolume(exId, it) {
  const ex = exById(exId);
  const factor = w => ex && ex.unit === 'seg' ? 1 : Math.max(num(w), 1);
  return it.setsDone.reduce((s, d, i) => s + (d ? num(it.reps[i]) * factor(it.weight) : 0), 0);
}
/* Limpia récords/logs viejos con NaN (de versiones anteriores) */
function sanitizeFit() {
  Object.values(store.fit.records).forEach(r => { r.w = num(r.w); r.r = num(r.r); r.v = num(r.v); if (r.s != null) r.s = Math.max(1, Math.round(num(r.s, 1))); });
  if (!store.fit.body || !Array.isArray(store.fit.body.weights)) store.fit.body = { height: num(store.fit.body && store.fit.body.height), weights: [] };
  store.fit.body.weights = store.fit.body.weights.filter(w => w && w.d && Number.isFinite(+w.w)).map(w => ({ d: w.d, w: +w.w }));
  Object.values(store.fit.log).forEach(lg => Object.values(lg.items || {}).forEach(it => {
    it.setsDone = (it.setsDone || []).map(Boolean);
    it.reps = (it.reps || []).map(x => num(x, 1));
    it.weight = num(it.weight);
  }));
}

function renderFit() {
  sanitizeFit();
  document.querySelectorAll('#viewFit [data-ftab]').forEach(b =>
    b.classList.toggle('active', b.dataset.ftab === store.fit.ui.tab));
  const t = store.fit.ui.tab;
  if (t === 'hoy') renderFitHoy();
  else if (t === 'rutina') renderFitRutina();
  else if (t === 'ejercicios') renderFitLib();
  else if (t === 'cuerpo') renderFitCuerpo();
  else if (t === 'stats') renderFitStats();
  else renderFitRecords();
}

/* ---------- HOY: entrenar ---------- */
function renderFitHoy() {
  const day = diaHoy(), items = fitDayItems(day), lg = todayFitLog();
  const box = $('fitBody');
  if (!items.length) {
    box.innerHTML = `<div class="progress-card hero"><div class="progress-top"><span>😌 Hoy (${day}) es descanso</span></div>
      <p class="mensaje">Arma tu semana en 🗓️ Rutina. El descanso también entrena.</p></div>`;
    return;
  }
  const totalSets = items.reduce((s, r) => s + r.sets, 0);
  const doneSets = Object.values(lg.items).reduce((s, it) => s + it.setsDone.filter(Boolean).length, 0);
  const pct = totalSets ? Math.round(doneSets / totalSets * 100) : 0;
  let h = `<div class="progress-card hero"><div class="progress-top"><span>🔥 Entreno de hoy (${day})</span><span>${pct}%</span></div>
    <div class="progress-bar big"><div style="width:${pct}%"></div></div>
    <p class="mensaje">${lg.finished ? '✅ Entrenamiento terminado. ¡Bien hecho!' : `${items.length} ejercicios · ${totalSets - doneSets} series pendientes`}</p></div>
    <div class="subblock rest-box"><h4>⏱️ Descanso</h4>
      <div class="rest-time" id="restTime">--:--</div>
      <div class="week-actions"><button class="chip-btn" data-rest="30">30s</button><button class="chip-btn" data-rest="60">60s</button><button class="chip-btn" data-rest="90">90s</button><button class="chip-btn" data-rest="0">⏹</button></div></div>
    <div class="ex-grid">`;
  items.forEach(r => {
    const ex = exById(r.ex);
    if (!ex) return;
    const it = lg.items[r.ex];
    const rec = store.fit.records[r.ex];
    const dots = it.setsDone.map((d, i) => `<button class="set-dot ${d ? 'done' : ''}" data-ex="${r.ex}" data-set="${i}">${i + 1}</button>`).join('');
    h += `<div class="card ex-card"><div class="ex-top"><span class="demo">${demoEx(ex)}</span>
      <span class="grow"><h3>${esc(ex.nombre)}</h3>
      <p>${esc(ex.musculo)} · ${EQUIPOS[ex.equipo]}${rec && rec.w ? ` · 🏆 ${rec.w}kg` : ''}</p>
      <p class="objetivo">${esc(ex.cue)}</p></span></div>
      <div class="set-dots">${dots}</div>
      <div class="num-row"><label>${ex.unit === 'seg' ? 'Seg' : 'Reps'} <input type="number" min="1" value="${num(it.reps[0], num(r.reps, 1))}" data-rreps="${r.ex}"></label>
      <label>Peso <input type="number" min="0" value="${num(it.weight)}" data-rweight="${r.ex}"> kg</label>
      <small class="mensaje">meta: ${r.sets}×${r.reps}${ex.unit === 'seg' ? 's' : ''}${r.peso ? ` · ${r.peso}kg` : ''}</small></div></div>`;
  });
  h += `</div><button id="btnFinishFit" class="add-btn finish-btn">${lg.finished ? '↩️ Reabrir entrenamiento' : '✅ Terminar entrenamiento'}</button>
    <p class="mensaje" style="margin-top:6px">Marca cada serie al completarla. Al terminar se calculan tus récords y suma a tu racha 🔥.</p>`;
  box.innerHTML = h;

  box.querySelectorAll('.set-dot').forEach(b => b.onclick = () => {
    const it = todayFitLog().items[b.dataset.ex];
    it.setsDone[+b.dataset.set] = !it.setsDone[+b.dataset.set];
    it.touched = true;
    save(); renderFit();
  });
  box.querySelectorAll('[data-rreps]').forEach(inp => inp.onchange = () => {
    const it = todayFitLog().items[inp.dataset.rreps];
    const v = Math.max(1, parseInt(inp.value, 10) || 1);
    it.reps = it.reps.map(() => v); it.touched = true; save();
  });
  box.querySelectorAll('[data-rweight]').forEach(inp => inp.onchange = () => {
    const it = todayFitLog().items[inp.dataset.rweight];
    it.weight = Math.max(0, parseFloat(inp.value) || 0); it.touched = true; save();
  });
  box.querySelectorAll('[data-rest]').forEach(b => b.onclick = () => startRest(+b.dataset.rest));
  $('btnFinishFit').onclick = finishFitDay;
}

function startRest(s) {
  clearInterval(fitTimerInt);
  const el = $('restTime');
  if (!s || !el) { if (el) el.textContent = '--:--'; return; }
  let left = s;
  el.textContent = '0:' + String(left).padStart(2, '0');
  fitTimerInt = setInterval(() => {
    left--;
    const e2 = $('restTime');
    if (!e2) { clearInterval(fitTimerInt); return; }
    if (left <= 0) { clearInterval(fitTimerInt); e2.textContent = '¡Vamos! 💪'; try { navigator.vibrate && navigator.vibrate(200); } catch {} return; }
    e2.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
  }, 1000);
}

function finishFitDay() {
  const lg = todayFitLog();
  if (lg.finished) { lg.finished = false; save(); renderFit(); return; }
  const doneAny = Object.values(lg.items).some(it => it.setsDone.some(Boolean));
  if (!doneAny && !confirm('No marcaste ninguna serie. ¿Terminar igual?')) return;
  // volumen + récords
  let vol = 0;
  const nuevos = [];
  Object.keys(lg.items).forEach(exId => {
    const ex = exById(exId);
    if (!ex) return;
    const it = lg.items[exId];
    const idx = it.setsDone.map((d, i) => d ? i : -1).filter(i => i >= 0);
    if (!idx.length) return;
    const doneCount = idx.length;
    const maxW = Math.max(0, ...idx.map(i => num(it.weight)));
    const maxR = Math.max(0, ...idx.map(i => num(it.reps[i])));
    const v = fitVolume(exId, it);
    vol += v;
    const prev = store.fit.records[exId];
    if (!prev) {
      store.fit.records[exId] = { w: maxW, r: maxR, v: Math.round(v), s: doneCount, date: todayStr() };
      if (ex.unit !== 'seg' && maxW > 0) nuevos.push(`${ex.nombre}: ${maxW}kg 🏆`);
      if (maxR > 0) nuevos.push(`${ex.nombre}: ${maxR}${ex.unit === 'seg' ? 's' : ' reps'} 🏆`);
    } else {
      let imp = false;
      if (ex.unit !== 'seg' && maxW > prev.w && maxW > 0) { nuevos.push(`${ex.nombre}: ${maxW}kg 🏆`); imp = true; }
      if (maxR > prev.r) { nuevos.push(`${ex.nombre}: ${maxR}${ex.unit === 'seg' ? 's' : ' reps'} 🏆`); imp = true; }
      if (v > prev.v && v > 0) imp = true;
      store.fit.records[exId] = {
        w: Math.max(prev.w, maxW), r: Math.max(prev.r, maxR), v: Math.max(prev.v, Math.round(v)),
        s: imp ? doneCount : (num(prev.s) || doneCount), date: imp ? todayStr() : (prev.date || todayStr()),
      };
    }
  });
  lg.finished = true;
  lg.volume = Math.round(vol);
  markActivity();
  save(); refresh();
  alert(nuevos.length ? '🎉 ¡Nuevos récords!\n\n' + nuevos.join('\n') : '✅ Entrenamiento guardado. La constancia gana.');
}

/* ---------- RUTINA semanal ---------- */
function renderFitRutina() {
  const ui = store.fit.ui;
  if (!store.fit.routine[ui.day]) ui.day = diaHoy();
  const items = fitDayItems(ui.day);
  let h = `<div class="filters day-chips">${DIAS.map(d => `<button class="day-chip ${d === ui.day ? 'active' : ''}" data-day="${d}">${d}<small>${(store.fit.routine[d] || []).length}</small></button>`).join('')}</div>`;
  if (!items.length) h += `<div class="vacio"><p>📭 ${ui.day} sin ejercicios.</p><small>Agrega desde 📚 Ejercicios.</small></div>`;
  h += '<div class="ex-grid">';
  items.forEach((r, i) => {
    const ex = exById(r.ex);
    if (!ex) return;
    h += `<div class="card ex-card"><div class="ex-top"><span class="demo">${demoEx(ex)}</span>
      <span class="grow"><h3>${esc(ex.nombre)}</h3><p>${esc(ex.musculo)} · ${EQUIPOS[ex.equipo]}</p></span>
      <span class="col-btns"><button class="icon-mini" data-mv="${i}|-1">▲</button><button class="icon-mini" data-mv="${i}|1">▼</button><button class="icon-mini" data-del="${i}">🗑</button></span></div>
      <div class="num-row"><label>Series <input type="number" min="1" max="10" value="${r.sets}" data-tsets="${i}"></label>
      <label>${ex.unit === 'seg' ? 'Seg' : 'Reps'} <input type="number" min="1" value="${r.reps}" data-treps="${i}"></label>
      <label>Peso <input type="number" min="0" value="${r.peso}" data-tpeso="${i}"> kg</label></div></div>`;
  });
  h += `</div><button id="btnGoLib" class="ghost-btn">📚 ＋ Agregar ejercicios al ${ui.day}</button>`;
  $('fitBody').innerHTML = h;
  const box = $('fitBody');
  box.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { ui.day = b.dataset.day; save(); renderFit(); });
  box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (confirm('¿Quitar de la rutina?')) { fitDayItems(ui.day).splice(+b.dataset.del, 1); save(); renderFit(); }
  });
  box.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => {
    const [i, d] = b.dataset.mv.split('|').map(Number);
    const arr = fitDayItems(ui.day), j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; save(); renderFit();
  });
  const upd = (attr, fn) => box.querySelectorAll(`[data-${attr}]`).forEach(inp => inp.onchange = () => {
    const v = Math.max(attr === 'tsets' ? 1 : 0, parseFloat(inp.value) || 0);
    fn(fitDayItems(ui.day)[+inp.dataset[attr]], v); save();
  });
  upd('tsets', (r, v) => r.sets = Math.min(10, Math.round(v)));
  upd('treps', (r, v) => r.reps = Math.round(v));
  upd('tpeso', (r, v) => r.peso = v);
  $('btnGoLib').onclick = () => { ui.tab = 'ejercicios'; save(); renderFit(); };
}

/* ---------- BIBLIOTECA ---------- */
function renderFitLib() {
  const ui = store.fit.ui;
  let h = `<div class="filters"><input id="libQ" class="field" placeholder="🔍 Buscar ejercicio…" value="${esc(ui.libQ)}" />
    <select id="libEquip"><option value="">Todo equipo</option>${Object.keys(EQUIPOS).map(k => `<option value="${k}" ${ui.libEquip === k ? 'selected' : ''}>${EQUIPOS[k]}</option>`).join('')}</select>
    <select id="libMuscle"><option value="">Todo músculo</option>${MUSCULOS.map(m => `<option ${ui.libMuscle === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
    <div id="exGrid" class="ex-grid"></div>`;
  $('fitBody').innerHTML = h;
  $('libQ').oninput = e => { ui.libQ = e.target.value; save(); renderExGrid(); };
  $('libEquip').onchange = e => { ui.libEquip = e.target.value; save(); renderFitLib(); };
  $('libMuscle').onchange = e => { ui.libMuscle = e.target.value; save(); renderFitLib(); };
  renderExGrid();
}
function renderExGrid() {
  const ui = store.fit.ui;
  const q = norm(ui.libQ);
  const list = EJERCICIOS.filter(e =>
    (!ui.libEquip || e.equipo === ui.libEquip) &&
    (!ui.libMuscle || e.musculo === ui.libMuscle) &&
    (!q || norm(e.nombre + ' ' + e.musculo).includes(q)));
  const g = $('exGrid');
  if (!list.length) { g.innerHTML = `<div class="vacio"><p>Sin resultados con esos filtros.</p></div>`; return; }
  g.innerHTML = '';
  list.forEach(e => {
    const card = document.createElement('div');
    card.className = 'card ex-card';
    card.innerHTML = `<div class="ex-top"><span class="demo">${demoEx(e)}</span>
      <span class="grow"><h3>${esc(e.nombre)}</h3><p>${esc(e.musculo)} · ${EQUIPOS[e.equipo]}</p>
      <p class="objetivo">${e.sets}×${e.reps}${e.unit === 'seg' ? 's' : ''}${e.peso ? ` · ${e.peso}kg` : ''} — ${esc(e.cue)}</p></span></div>
      <div class="num-row"><select data-dsel>${DIAS.map(d => `<option ${store.fit.ui.day === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
      <button class="chip-btn">＋ Agregar</button></div>`;
    const sel = card.querySelector('[data-dsel]');
    card.querySelector('.chip-btn').onclick = ev => {
      const btn = ev.target;
      const arr = store.fit.routine[sel.value] = store.fit.routine[sel.value] || [];
      if (arr.some(r => r.ex === e.id)) { btn.textContent = 'Ya está ese día'; setTimeout(() => btn.textContent = '＋ Agregar', 1500); return; }
      arr.push({ ex: e.id, sets: e.sets, reps: e.reps, peso: e.peso });
      save();
      btn.textContent = `✓ En ${sel.value}`;
      setTimeout(() => btn.textContent = '＋ Agregar', 1500);
    };
    g.appendChild(card);
  });
}

/* ---------- RÉCORDS ---------- */
function renderFitRecords() {
  const recs = store.fit.records;
  const ids = Object.keys(recs).filter(k => exById(k));
  const finishedDays = Object.values(store.fit.log).filter(l => l.finished).length;
  let weekVol = 0;
  for (let i = 0; i < 7; i++) {
    const ds = todayStr(new Date(Date.now() - i * 864e5));
    weekVol += (store.fit.log[ds] && store.fit.log[ds].volume) || 0;
  }
  let h = `<div class="progress-card hero"><div class="progress-top"><span>🏆 Mis marcas</span><span>${finishedDays} entrenos</span></div>
    <p class="mensaje">Volumen últimos 7 días: <strong>${Math.round(weekVol)} kg</strong> · Complétalos en 🔥 Hoy y se registran solos.</p></div>`;
  if (!ids.length) h += `<div class="vacio"><p>Aún no hay récords.</p><small>Termina tu primer entrenamiento y aparecerán aquí.</small></div>`;
  else {
    h += '<ul class="lista">';
    ids.sort((a, b) => exById(a).nombre.localeCompare(exById(b).nombre)).forEach(k => {
      const e = exById(k), r = recs[k];
      const wTxt = r.w > 0 ? `🏋️ ${r.w}kg` : '🏋️ peso corporal';
      const vTxt = e.unit === 'seg' ? `📦 ${Math.round(r.v)}s en total` : (r.w > 0 ? `📦 ${Math.round(r.v)}kg en total` : `📦 ${Math.round(r.v)} reps en total`);
      const sTxt = r.s ? `${r.s} series · ` : '';
      h += `<li class="task"><span class="demo sm">${demoEx(e)}</span>
        <span class="task-text">${esc(e.nombre)}<br><small class="mensaje">${wTxt} · ${sTxt}🔁 ${r.r}${e.unit === 'seg' ? 's' : ''} máx · ${vTxt} <span class="badge">${esc(r.date || '')}</span></small></span>
        <button class="icon-mini" title="Reiniciar récord" data-recdel="${k}">🗑</button></li>`;
    });
    h += '</ul>';
  }
  $('fitBody').innerHTML = h;
  $('fitBody').querySelectorAll('[data-recdel]').forEach(b => b.onclick = () => {
    const ex = exById(b.dataset.recdel);
    if (confirm(`¿Reiniciar el récord de "${ex ? ex.nombre : b.dataset.recdel}"? Se borrará su marca guardada.`)) {
      delete store.fit.records[b.dataset.recdel];
      save(); renderFit();
    }
  });
}

/* ---------- CUERPO: peso, altura, IMC ---------- */
function fitBody() {
  if (!store.fit.body || !Array.isArray(store.fit.body.weights)) store.fit.body = { height: 0, weights: [] };
  return store.fit.body;
}
function bmiCat(bmi) {
  if (!bmi) return null;
  if (bmi < 18.5) return ['Bajo peso', '#d97706'];
  if (bmi < 25) return ['Saludable ✅', '#16a34a'];
  if (bmi < 30) return ['Sobrepeso', '#d97706'];
  return ['Obesidad', '#dc2626'];
}
function renderFitCuerpo() {
  const b = fitBody(), box = $('fitBody');
  const ws = [...b.weights].sort((a, z) => a.d < z.d ? 1 : -1);
  const last = ws[0], first = ws[ws.length - 1];
  const h = num(b.height), bmi = h > 0 && last ? last.w / ((h / 100) ** 2) : 0;
  const cat = bmiCat(bmi);
  const delta = last && first && last !== first ? last.w - first.w : 0;
  const daysSince = last ? Math.round((Date.now() - new Date(last.d + 'T12:00:00').getTime()) / 864e5) : null;
  let html = `<div class="progress-card hero"><div class="progress-top"><span>⚖️ Mi cuerpo</span><span>${last ? last.w + ' kg' : 'sin registros'}</span></div>`;
  if (last && h > 0) html += `<p class="mensaje">IMC <strong>${bmi.toFixed(1)}</strong> · <strong style="color:${cat[1]}">${cat[0]}</strong> con ${h} cm</p>`;
  else if (!h) html += `<p class="mensaje">Pon tu altura para ver tu IMC 👇</p>`;
  if (last && first && ws.length > 1) html += `<p class="mensaje">Desde ${first.d}: <strong style="color:${delta <= 0 ? 'var(--ok)' : 'var(--warn)'}">${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg</strong> en ${ws.length} registros</p>`;
  if (daysSince != null && daysSince > 16) html += `<p class="mensaje">💡 Te toca pesarte (ideal 2 veces al mes). Último: hace ${daysSince} días.</p>`;
  html += `</div>
  <div class="subblock"><h4>📏 Altura</h4><div class="num-row"><input id="fitHeight" type="number" min="100" max="250" value="${h || ''}" placeholder="170"> cm
  <button id="btnSaveHeight" class="chip-btn">Guardar</button></div></div>
  <div class="subblock"><h4>⚖️ Registrar peso</h4><div class="num-row"><input id="fitWDate" type="date" value="${todayStr()}">
  <input id="fitWVal" type="number" min="20" max="400" step="0.1" placeholder="82.5"> kg
  <button id="btnAddWeight" class="chip-btn">＋</button></div></div>`;
  if (ws.length > 1) {
    const show = ws.slice(0, 12).reverse();
    const vals = show.map(w => w.w), lo = Math.min(...vals), hi = Math.max(...vals);
    html += `<div class="subblock"><h4>📈 Evolución (últimos ${show.length})</h4><div class="chart">` +
      show.map(w => {
        const pct = hi === lo ? 50 : 8 + Math.round((w.w - lo) / (hi - lo) * 92);
        return `<div class="bar" title="${w.d}: ${w.w} kg"><div class="bar-fill" style="height:${pct}px"></div><span>${w.w}</span></div>`;
      }).join('') + `</div></div>`;
  }
  html += `<div class="subblock"><h4>🗒️ Historial (${ws.length})</h4>`;
  if (!ws.length) html += `<p class="objetivo">Sin registros. Pésate 2 veces al mes y verás tu curva aquí.</p>`;
  ws.slice(0, 24).forEach((w, i) => {
    html += `<div class="wrow"><span class="grow">${w.d} — <strong>${w.w} kg</strong></span><button class="icon-mini" data-wdel="${i}">🗑</button></div>`;
  });
  html += `</div>`;
  box.innerHTML = html;
  $('btnSaveHeight').onclick = () => {
    b.height = Math.round(num($('fitHeight').value));
    if (b.height < 100 || b.height > 250) { alert('Altura entre 100 y 250 cm.'); return; }
    save(); renderFit();
  };
  $('btnAddWeight').onclick = () => {
    const d = $('fitWDate').value || todayStr(), w = num($('fitWVal').value);
    if (w < 20 || w > 400) { alert('Peso entre 20 y 400 kg.'); return; }
    const ix = b.weights.findIndex(x => x.d === d);
    if (ix >= 0) b.weights[ix].w = Math.round(w * 10) / 10;
    else b.weights.push({ d, w: Math.round(w * 10) / 10 });
    markActivity(); save(); renderFit();
  };
  box.querySelectorAll('[data-wdel]').forEach(btn => btn.onclick = () => {
    const target = ws[+btn.dataset.wdel];
    if (confirm(`¿Borrar registro ${target.d} (${target.w} kg)?`)) {
      b.weights = b.weights.filter(x => x !== target);
      save(); renderFit();
    }
  });
}

/* ---------- STATS: adherencia semanal ---------- */
function mondayOf(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return todayStr(dt);
}
function addDays(ds, n) {
  const [y, m, d] = ds.split('-').map(Number);
  return todayStr(new Date(y, m - 1, d + n));
}
function renderFitStats() {
  const hoy = todayStr(), box = $('fitBody');
  const weeks = [];
  const thisMon = mondayOf(hoy);
  for (let i = 7; i >= 0; i--) {
    const start = addDays(thisMon, -7 * i);
    weeks.push({ start, days: [0, 1, 2, 3, 4, 5, 6].map(k => addDays(start, k)).filter(d => d <= hoy) });
  }
  const planDays = DIAS.filter(d => (store.fit.routine[d] || []).length > 0);
  let weekVols = [], totalDone = 0, totalPlan = 0, streakW = 0;
  const perDay = DIAS.map(() => ({ done: 0, plan: 0 }));
  weeks.forEach((w, wi) => {
    let vol = 0, done = 0, plan = 0;
    w.days.forEach(ds => {
      const wd = (new Date(ds + 'T12:00:00').getDay() + 6) % 7; // 0=Lun
      const hasPlan = (store.fit.routine[DIAS[wd]] || []).length > 0;
      const lg = store.fit.log[ds];
      const fin = !!(lg && lg.finished);
      if (hasPlan && wi >= 2) { perDay[wd].plan++; totalPlan++; if (fin) { perDay[wd].done++; totalDone++; } }
      if (hasPlan) { plan++; if (fin) { done++; vol += num(lg.volume); } }
    });
    weekVols.push(vol);
  });
  // racha de semanas activas (≥1 entreno), hacia atrás (la semana en curso no rompe)
  for (let i = weeks.length - 1; i >= 0; i--) {
    const any = weeks[i].days.some(ds => store.fit.log[ds] && store.fit.log[ds].finished);
    if (any) { streakW++; continue; }
    if (weeks[i].start === thisMon && weeks[i].days.length < 7) continue;
    break;
  }
  const pct = totalPlan ? Math.round(totalDone / totalPlan * 100) : 0;
  let html = `<div class="progress-card hero"><div class="progress-top"><span>📊 Últimas 6 semanas: ${pct}%</span><span>🔥 ${streakW} sem. activas</span></div>
    <div class="progress-bar big"><div style="width:${pct}%"></div></div>
    <p class="mensaje">${totalDone}/${totalPlan} días de rutina completados · Plan actual: ${planDays.join(', ') || 'sin días'}</p></div>
  <div class="subblock"><h4>📦 Volumen por semana (kg)</h4><div class="chart">`;
  const mx = Math.max(1, ...weekVols);
  weeks.forEach((w, i) => {
    html += `<div class="bar" title="Sem ${w.start}: ${Math.round(weekVols[i])} kg"><div class="bar-fill" style="height:${Math.max(4, Math.round(weekVols[i] / mx * 96))}px"></div><span>${w.start.slice(8, 10)}/${w.start.slice(5, 7)}</span></div>`;
  });
  html += `</div></div><div class="subblock"><h4>📅 Adherencia por día (6 sem.)</h4>`;
  const rated = perDay.map((p, i) => ({ day: DIAS[i], rate: p.plan ? p.done / p.plan : null, ...p })).filter(x => x.rate !== null);
  const best = rated.length ? rated.reduce((a, b) => b.rate > a.rate ? b : a) : null;
  const worst = rated.length ? rated.reduce((a, b) => b.rate < a.rate ? b : a) : null;
  if (!rated.length) html += `<p class="objetivo">Arma tu rutina en 🗓️ Rutina y aparecerá aquí.</p>`;
  rated.forEach(x => {
    const pc = Math.round(x.rate * 100);
    const tag = best && x.day === best.day && rated.length > 1 ? ' 🏆' : (worst && x.day === worst.day && rated.length > 1 && x.rate < best.rate ? ' 🎯' : '');
    html += `<div class="wrow"><span style="min-width:38px"><strong>${x.day}</strong></span>
      <span class="grow"><span class="mini-bar"><i style="width:${pc}%"></i></span></span>
      <span>${x.done}/${x.plan}${tag}</span></div>`;
  });
  if (best && worst && rated.length > 1) html += `<p class="mensaje">🏆 Tu mejor día: <strong>${best.day}</strong> · 🎯 A reforzar: <strong>${worst.day}</strong></p>`;
  html += `<p class="mensaje">Se calcula con tu rutina actual; si la cambiaste hace poco, tómalo como aproximado.</p></div>`;
  box.innerHTML = html;
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
  const data = { exportado: new Date().toISOString(), ruta: store.ruta, days: store.days, activity: store.activity, fit: store.fit };
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
      if (d.fit && d.fit.routine) store.fit = Object.assign(blankFit(), d.fit);
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
if (window.HubCloud) HubCloud.boot();
