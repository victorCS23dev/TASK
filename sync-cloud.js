/* ============================================================
 * sync-cloud.js — Sincronización PC ↔ celular con TU Netlify
 * ------------------------------------------------------------
 * Sin cuentas externas: los datos viven en Netlify Blobs
 * (base de datos incluida en tu hosting) y los protege una
 * clave que solo tú conoces (HUB_TOKEN en Netlify).
 * En cada dispositivo escribes la clave UNA vez y queda
 * guardada en ese navegador.
 *
 * DISEÑO (offline-first, sin dependencias, solo fetch):
 *  - Todo se sigue guardando en LocalStorage al instante.
 *  - Cada cambio programa un push (debounce 2.5s).
 *  - Al abrir, cada 45s y con el botón "Sincronizar" hace pull.
 *  - Conflictos: gana el último en escribir. No uses PC y
 *    celular al mismo tiempo; pulsa Sincronizar al cambiar.
 *  - En localhost no hay función → la barra se oculta sola
 *    (el sync solo vive en tu URL de Netlify).
 * ============================================================ */
const CLOUD_ENDPOINT = '/.netlify/functions/state';
const KEY_SLOT = 'hubCloud.key.v1';

const HubCloud = {
  muted: false,        // en true: save() no programa push (aplica remoto)
  localDirtyAt: 0,     // último cambio local pendiente de subir
  _timer: null,
  _checked: false,     // ya se probó si hay backend
  _online: false,      // hay función disponible

  key() { try { return localStorage.getItem(KEY_SLOT) || ''; } catch { return ''; } },

  /* Llamado desde save() en app.js tras cada cambio local */
  onLocalChange() {
    if (this.muted || !this._online || !this.key()) return;
    this.localDirtyAt = Date.now();
    setStatus('⏳ Subiendo cambios…');
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.pushNow(), 2500);
  },

  async _call(method, body) {
    const r = await fetch(CLOUD_ENDPOINT, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.key() },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 404) throw new Error('no-backend');
    if (r.status === 401) throw new Error('clave');
    if (r.status === 500) throw new Error('config');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  },

  /* ---------- Push: subir estado local ---------- */
  async pushNow() {
    if (!this._online || !this.key() || !this.localDirtyAt) return;
    setStatus('⏳ Subiendo cambios…');
    try {
      const record = await this._call('PUT', { data: { days: store.days, ruta: store.ruta, activity: store.activity } });
      this.muted = true;
      store.meta.cloudUpdatedAt = record.updated_at || Date.now();
      this.localDirtyAt = 0;
      save();
      this.muted = false;
      setStatus('☁️ Sincronizado ✓');
    } catch (err) {
      this._syncError(err);
      if (err.message !== 'clave' && err.message !== 'config') {
        clearTimeout(this._timer);
        this._timer = setTimeout(() => this.pushNow(), 15000);
      }
    }
  },

  /* ---------- Pull: bajar estado remoto ---------- */
  async pullNow() {
    if (!this._online || !this.key()) return;
    setStatus('⬇️ Revisando cambios…');
    try {
      const remote = await this._call('GET');
      const remoteTime = remote.updated_at || 0;
      const base = store.meta.cloudUpdatedAt || 0;
      if (!remote.data) { // nube vacía: primera vez → subir lo local
        this.localDirtyAt = this.localDirtyAt || Date.now();
        await this.pushNow();
        return;
      }
      if (remoteTime > base + 1000 && remoteTime > this.localDirtyAt) {
        // La nube trae algo más nuevo → adoptar (solo datos, no tema/filtros)
        this.muted = true;
        if (remote.data.days) store.days = remote.data.days;
        if (remote.data.ruta) store.ruta = Object.assign(blankStore().ruta, remote.data.ruta);
        if (remote.data.activity) store.activity = remote.data.activity;
        store.meta.cloudUpdatedAt = remoteTime;
        store.selectedDate = todayStr();
        this.localDirtyAt = 0;
        save();
        this.muted = false;
        refresh();
        setStatus('☁️ Actualizado desde el otro dispositivo ✓');
      } else if (this.localDirtyAt > base) {
        await this.pushNow();
      } else {
        setStatus('☁️ Sincronizado ✓');
      }
    } catch (err) {
      this._syncError(err);
    }
  },

  _syncError(err) {
    const m = (err && err.message) || '';
    if (m === 'clave') { paintAuth(); setStatus('🔑 Clave incorrecta, revísala'); }
    else if (m === 'config') setStatus('⚠️ Falta HUB_TOKEN en Netlify');
    else if (m !== 'no-backend') setStatus('⚠️ Sin conexión, reintento luego');
  },

  /* ---------- Arranque: detectar backend y pintar ---------- */
  boot() {
    $('btnCloudSync').onclick = async () => { await this.pullNow(); await this.pushNow(); };
    $('btnCloudOut').onclick = () => { try { localStorage.removeItem(KEY_SLOT); } catch {} paintAuth(); setStatus('🔑 Clave olvidada en este dispositivo'); };
    $('btnCloudConnect').onclick = () => this.connect();
    $('cloudKey').onkeydown = e => { if (e.key === 'Enter') this.connect(); };
    // Sonda: ¿existe la función? (en localhost no → modo local silencioso)
    fetch(CLOUD_ENDPOINT, { headers: { Authorization: 'Bearer ' + this.key() } })
      .then(r => {
        if (r.status === 404) return; // sin backend: barra oculta, todo igual que antes
        this._online = true;
        this._checked = true;
        $('cloudBar').classList.remove('hidden');
        paintAuth();
        if (this.key()) this.pullNow();
        setInterval(() => { if (!document.hidden && this.key()) this.pullNow(); }, 45000);
        document.addEventListener('visibilitychange', () => { if (!document.hidden && this.key()) this.pullNow(); });
      })
      .catch(() => { /* sin red: silencioso, sigue local */ });
  },

  async connect() {
    const k = ($('cloudKey').value || '').trim();
    const errBox = $('cloudError');
    errBox.classList.add('hidden');
    if (!k) { errBox.textContent = '⚠️ Escribe tu clave de sincronización.'; errBox.classList.remove('hidden'); return; }
    try { localStorage.setItem(KEY_SLOT, k); } catch {}
    $('cloudKey').value = '';
    paintAuth();
    this.localDirtyAt = this.localDirtyAt || Date.now();
    try {
      await this.pullNow();
    } catch (e) {
      errBox.textContent = '⚠️ ' + (e.message === 'clave' ? 'Clave incorrecta.' : 'No se pudo conectar.');
      errBox.classList.remove('hidden');
    }
  },
};

/* Pintar tarjeta clave / botón salir según haya clave guardada */
function paintAuth() {
  if (!HubCloud._online && !HubCloud.key()) return;
  const has = !!HubCloud.key();
  $('cloudBar').classList.toggle('hidden', !HubCloud._online);
  $('cloudCard').classList.toggle('hidden', !HubCloud._online || has);
  $('btnCloudOut').classList.toggle('hidden', !has);
  if (has && HubCloud._online) setStatus('☁️ Conectado');
}
function setStatus(t) { const el = $('cloudStatus'); if (el) el.textContent = t; }

window.HubCloud = HubCloud;
