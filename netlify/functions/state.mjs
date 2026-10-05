// netlify/functions/state.mjs
// Puerta de acceso a TU base de datos (Netlify Blobs, incluida en tu hosting).
// Sin cuentas externas: la protege tu clave HUB_TOKEN (variable de entorno
// en Netlify). La app la envía como Bearer y aquí se compara. Sin la clave,
// nadie puede leer ni escribir.
//
// Rutas: GET  /.netlify/functions/state  → { data, updated_at }
//        PUT  /.netlify/functions/state  → guarda { data } y devuelve { data, updated_at }
// `data` es { days, ruta, activity }. Gana el último en escribir.
import { getStore } from "@netlify/blobs";

const KEY = "hub-state";

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  const expected = process.env.HUB_TOKEN || "";
  if (!expected) return json(500, { error: "Falta configurar HUB_TOKEN en Netlify (Site settings → Environment variables)." });

  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!got || got !== expected) return json(401, { error: "no autorizado" });

  // Lectura/escritura fuertemente consistente: lo que se escribe se lee al instante.
  const store = getStore({ name: "hub", consistency: "strong" });

  if (req.method === "GET") {
    const current = await store.get(KEY, { type: "json" });
    return json(200, current || { data: null, updated_at: 0 });
  }

  if (req.method === "PUT") {
    let payload;
    try {
      payload = await req.json();
    } catch {
      return json(400, { error: "json inválido" });
    }
    if (!payload || typeof payload.data !== "object") return json(400, { error: "falta data" });
    const record = { data: payload.data, updated_at: Date.now() };
    await store.setJSON(KEY, record);
    return json(200, record);
  }

  return json(405, { error: "método no permitido" });
};
