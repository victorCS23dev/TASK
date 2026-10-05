/* ============================================================
 * sync-cloud.js — Sincronización PC ↔ celular vía Supabase
 * ------------------------------------------------------------
 * CÓMO ACTIVARLO (una sola vez, ~5 min):
 *  1. Crea un proyecto gratis en https://supabase.com → copia el
 *     "Project URL" y la "anon public key" (Project Settings → API).
 *  2. Pégalos abajo en CLOUD_CONFIG y sube el cambio a GitHub.
 *  3. En Supabase → SQL Editor, ejecuta el script TABLA_SQL que está
 *     al final de este archivo (crea la tabla + permisos: solo tú
 *     puedes leer/escribir tu fila, vía tu login).
 *  4. Abre tu sitio, crea tu cuenta (Crear cuenta) e inicia sesión
 *     con LA MISMA cuenta en PC y celular. Listo.
 *
 * DISEÑO (offline-first, sin dependencias, solo fetch):
 *  - Todo se sigue guardando en LocalStorage al instante.
 *  - Cada cambio programa un push (debounce 2.5s) con tu sesión.
 *  - Al abrir, cada 45s y con "Sincronizar" hace pull.
 *  - Conflictos: gana el último en escribir (last-write-wins).
 *    Si editas en los 2 a la vez, uno sobrescribe al otro: evita
 *    usar ambos al mismo tiempo y usa "Sincronizar" al cambiar.
 * ============================================================ */
const CLOUD_CONFIG = {
  url: 'https://TU-PROYECTO.supabase.co', // ← PASO 2: pega tu Project URL
  anonKey: 'TU-ANON-PUBLIC-KEY',          // ← PASO 2: pega tu anon public key
};
const SESSION_KEY = 'hubCloud.session.v1';

const HubCloud = {
  muted: false,          // en true: save() no programa push (aplica remoto)
  localDirtyAt: 0,       // último cambio local pendiente de subir
  _timer: null,

  isConfigured() {
    return CLOUD_CONFIG.url.startsWith('https://')
      && !CLOUD_CONFIG.url.includes('TU-PROYECTO')
      && (CLOUD_CONFIG.anonKey || '').length > 20;
  },
  session() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  },
  _saveSession(s) {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  },

  /* Llamado desde save() en app.js tras cada cambio local */
  onLocalChange() {
    if (this.muted || !this.isConfigured() || !this.session()) return;
    this.localDirtyAt = Date.now();
    setStatus('⏳ Subiendo cambios…');
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.pushNow(), 2500);
  },

  /* ---------- Auth (email + contraseña, solo tú) ---------- */
  async _auth(path, body) {
    const r = await fetch(CLOUD_CONFIG.url + path, {
      method: 'POST',
      headers: { apikey: CLOUD_CONFIG.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.msg || d.error_description || d.message || ('HTTP ' + r.status));
    return d;
  },
  async signUp(email, password) {
    const d = await this._auth('/auth/v1/signup', { email, password });
    if (!d.access_token) throw new Error('Revisa tu correo: Supabase puede pedir confirmación (desactívala en Auth → Providers → Email → Confirm email).');
    this._saveSession({ access_token: d.access_token, refresh_token: d.refresh_token, user_id: d.user.id, email });
  },
  async signIn(email, password) {
    const d = await this._auth('/auth/v1/token?grant_type=password', { email, password });
    this._saveSession({ access_token: d.access_token, refresh_token: d.refresh_token, user_id: d.user.id, email });
  },
  signOut() { this._saveSession(null); paintAuth(); setStatus('🔑 Sesión cerrada (modo local)'); },
  async _token() {
    let s = this.session();
    if (!s) return null;
    if (s.expires_at && Date.now() < s.expires_at - 60000) return s.access_token;
    try { // refrescar token vencido
      const d = await this._auth('/auth/v1/token?grant_type=refresh_token', { refresh_token: s.refresh_token });
      s = { access_token: d.access_token, refresh_token: d.refresh_token || s.refresh_token, user_id: (d.user && d.user.id) || s.user_id, email: s.email, expires_at: Date.now() + (d.expires_in || 3600) * 1000 };
      this._saveSession(s);
      return s.access_token;
    } catch { this._saveSession(null); paintAuth(); return null; }
  },

  /* ---------- Push: subir estado local ---------- */
  async pushNow() {
    if (!this.isConfigured()) return;
    const token = await this._token();
    if (!token) { paintAuth(); return; }
    if ((store.meta.cloudUpdatedAt || 0) >= this.localDirtyAt && this.localDirtyAt !== 0) { /* nada nuevo */ }
    if (!this.localDirtyAt) return;
    setStatus('⏳ Subiendo cambios…');
    try {
      const r = await fetch(CLOUD_CONFIG.url + '/rest/v1/hub_state', {
        method: 'POST',
        headers: {
          apikey: CLOUD_CONFIG.anonKey, Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify([{
          user_id: this.session().user_id,
          data: { days: store.days, ruta: store.ruta, activity: store.activity },
          updated_at: new Date().toISOString(),
        }]),
      });
      if (r.status === 401) { this._saveSession(null); paintAuth(); throw new Error('sesión'); }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const rows = await r.json().catch(() => []);
      const serverTime = Date.parse((rows[0] && rows[0].updated_at) || '') || Date.now();
      this.muted = true;
      store.meta.cloudUpdatedAt = serverTime;
      this.localDirtyAt = 0;
      save();
      this.muted = false;
      setStatus('☁️ Sincronizado ✓');
    } catch (err) {
      if ((err.message || '') !== 'sesión') setStatus('⚠️ Sin conexión, reintento luego');
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.pushNow(), 15000);
    }
  },

  /* ---------- Pull: bajar estado remoto ---------- */
  async pullNow() {
    if (!this.isConfigured()) return;
    const token = await this._token();
    if (!token) { paintAuth(); return; }
    setStatus('⬇️ Revisando cambios…');
    try {
      const r = await fetch(
        CLOUD_CONFIG.url + '/rest/v1/hub_state?user_id=eq.' + this.session().user_id + '&select=data,updated_at',
        { headers: { apikey: CLOUD_CONFIG.anonKey, Authorization: 'Bearer ' + token } });
      if (r.status === 401) { this._saveSession(null); paintAuth(); throw new Error('sesión'); }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const rows = await r.json().catch(() => []);
      if (!rows.length) { // primera vez: no hay nada en la nube → subir lo local
        if (this.localDirtyAt || !store.meta.cloudUpdatedAt) { this.localDirtyAt = this.localDirtyAt || Date.now(); await this.pushNow(); }
        else setStatus('☁️ Sincronizado ✓');
        return;
      }
      const remoteTime = Date.parse(rows[0].updated_at) || 0;
      const base = store.meta.cloudUpdatedAt || 0;
      if (remoteTime > base + 1000 && remoteTime > this.localDirtyAt) {
        // La nube trae algo más nuevo → adoptar (solo datos, no tema/filtros)
        const d = rows[0].data || {};
        this.muted = true;
        if (d.days) store.days = d.days;
        if (d.ruta) store.ruta = Object.assign(blankStore().ruta, d.ruta);
        if (d.activity) store.activity = d.activity;
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
      if ((err.message || '') !== 'sesión') setStatus('⚠️ Sin conexión');
    }
  },

  /* ---------- Arranque ---------- */
  boot() {
    if (!this.isConfigured()) return; // sin configurar = modo solo-local
    $('cloudBar').classList.remove('hidden');
    paintAuth();
    if (this.session()) {
      this.pullNow();
      setInterval(() => { if (!document.hidden && this.session()) this.pullNow(); }, 45000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden && this.session()) this.pullNow(); });
    }
    $('btnCloudSync').onclick = async () => { await this.pullNow(); await this.pushNow(); };
    $('btnCloudOut').onclick = () => this.signOut();
    $('btnCloudLogin').onclick = () => this._doAuth(false);
    $('btnCloudSignup').onclick = () => this._doAuth(true);
  },
  async _doAuth(isSignup) {
    const email = ($('cloudEmail').value || '').trim();
    const pass = $('cloudPass').value || '';
    const errBox = $('cloudError');
    errBox.classList.add('hidden');
    if (!email || pass.length < 6) { errBox.textContent = '⚠️ Escribe tu correo y una contraseña de 6+ caracteres.'; errBox.classList.remove('hidden'); return; }
    try {
      if (isSignup) await this.signUp(email, pass);
      else await this.signIn(email, pass);
      paintAuth();
      setStatus('☁️ Conectado, sincronizando…');
      this.localDirtyAt = this.localDirtyAt || Date.now();
      await this.pullNow();
    } catch (e) {
      errBox.textContent = '⚠️ ' + (e.message || 'No se pudo conectar');
      errBox.classList.remove('hidden');
    }
  },
};

/* Pintar tarjeta login / botón salir según haya sesión */
function paintAuth() {
  if (!HubCloud.isConfigured()) return;
  const s = HubCloud.session();
  $('cloudCard').classList.toggle('hidden', !!s);
  $('btnCloudOut').classList.toggle('hidden', !s);
  if (s) setStatus('☁️ Conectado como ' + (s.email || ''));
}
function setStatus(t) { const el = $('cloudStatus'); if (el) el.textContent = t; }

window.HubCloud = HubCloud;

/* ============================================================
 * TABLA_SQL — ejecútalo UNA vez en Supabase → SQL Editor:
 *
 * create table if not exists public.hub_state (
 *   user_id uuid primary key references auth.users(id) on delete cascade,
 *   data jsonb not null default '{}',
 *   updated_at timestamptz not null default now()
 * );
 * alter table public.hub_state enable row level security;
 * drop policy if exists "own all" on public.hub_state;
 * create policy "own all" on public.hub_state for all to authenticated
 *   using (auth.uid() = user_id) with check (auth.uid() = user_id);
 * ============================================================ */
