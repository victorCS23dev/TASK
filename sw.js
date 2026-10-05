const CACHE = 'mi-hub-v16';
const FILES = ['./', './index.html', './styles.css', './app.js', './ruta-data.js', './fit-data.js', './sync-cloud.js', './manifest.json', './icon.svg',
'./img/fit/aperturas-a.webp', './img/fit/aperturas-b.webp', './img/fit/burpees.webp',
'./img/fit/climbers-a.webp', './img/fit/climbers-b.webp', './img/fit/crunch-a.webp', './img/fit/crunch-b.webp',
'./img/fit/cuerda.webp', './img/fit/curl-a.webp', './img/fit/curl-b.webp',
'./img/fit/curl-barra-a.webp', './img/fit/curl-barra-b.webp', './img/fit/dominadas-a.webp', './img/fit/dominadas-b.webp',
'./img/fit/fondos-a.webp', './img/fit/fondos-b.webp', './img/fit/goblet-a.webp', './img/fit/goblet-b.webp',
'./img/fit/jacks-a.webp', './img/fit/jacks-b.webp', './img/fit/jalon-a.webp', './img/fit/jalon-b.webp',
'./img/fit/jalon-tri-a.webp', './img/fit/jalon-tri-b.webp', './img/fit/lagartijas-a.jpg', './img/fit/lagartijas-b.jpg',
'./img/fit/laterales-a.webp', './img/fit/laterales-b.webp', './img/fit/pantorrilla-a.webp', './img/fit/pantorrilla-b.webp',
'./img/fit/peso-muerto-a.webp', './img/fit/peso-muerto-b.webp', './img/fit/plancha.webp',
'./img/fit/press-banca-a.webp', './img/fit/press-banca-b.webp',
'./img/fit/press-maquina-a.webp', './img/fit/press-maquina-b.webp', './img/fit/press-militar-a.webp', './img/fit/press-militar-b.webp',
'./img/fit/remo-manc-a.webp', './img/fit/remo-manc-b.webp', './img/fit/sentadilla-a.webp', './img/fit/sentadilla-b.webp',
'./img/fit/superman-a.webp', './img/fit/superman-b.webp', './img/fit/triceps-banco-a.webp', './img/fit/triceps-banco-b.webp',
'./img/fit/zancadas-a.webp', './img/fit/zancadas-b.webp',
'./img/fit/kb-swing-a.webp', './img/fit/kb-swing-b.webp', './img/fit/peso-manc-a.webp', './img/fit/peso-manc-b.webp',
'./img/fit/remo-barra-a.webp', './img/fit/remo-barra-b.webp', './img/fit/sentadilla-barra-a.webp', './img/fit/sentadilla-barra-b.webp',
'./img/fit/press-militar-barra-a.webp', './img/fit/press-militar-barra-b.webp', './img/fit/press-suelo-a.webp', './img/fit/press-suelo-b.webp',
'./img/fit/martillo-a.webp', './img/fit/martillo-b.webp', './img/fit/patada-tri-a.webp', './img/fit/patada-tri-b.webp',
'./img/fit/chins-a.webp', './img/fit/chins-b.webp', './img/fit/jalon-cerrado-a.webp', './img/fit/jalon-cerrado-b.webp',
'./img/fit/pullover-polea-a.webp', './img/fit/pullover-polea-b.webp', './img/fit/puente-a.webp', './img/fit/puente-b.webp',
'./img/fit/trotadora.webp', './img/fit/zancada-manc-a.webp', './img/fit/zancada-manc-b.webp',
'./img/fit/frontales-a.webp', './img/fit/frontales-b.webp', './img/fit/arnold-a.webp', './img/fit/arnold-b.webp',
'./img/fit/press-banca-manc-a.webp', './img/fit/press-banca-manc-b.webp',
'./img/fit/kb-peso-a.webp', './img/fit/kb-peso-b.webp', './img/fit/kb-remo-a.webp', './img/fit/kb-remo-b.webp',
'./img/fit/kb-press-a.webp', './img/fit/kb-press-b.webp',
'./img/fit/trote.webp', './img/fit/bulgaras-a.webp', './img/fit/bulgaras-b.webp'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Los datos del sync siempre en vivo: jamás cachear la función.
  try { if (new URL(e.request.url).pathname.startsWith('/.netlify/functions/')) return; } catch {}
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
