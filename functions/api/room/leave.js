// Supabase backend for Raw Room
const SUPA_URL = "https://rbcuvfrielaokdgkmmad.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3V2ZnJpZWxhb2tkZ2ttbWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTQ2OTQsImV4cCI6MjEwNzA5MDY5NH0.oiSGblbi1htFGYeK0OP0exs_nE_C4NUiq-w-gg-fRFg";
const TOKENS = ["retinue-001", "retinue-002", "retinue-003"];
const MAX_MESSAGES = 200;

async function getState() {
  const r = await fetch(`${SUPA_URL}/rest/v1/room_state?id=eq.room&select=data`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  });
  const rows = await r.json();
  return (rows[0] && rows[0].data) || { agents: [], messages: [] };
}

async function saveState(state) {
  await fetch(`${SUPA_URL}/rest/v1/room_state?id=eq.room`, {
    method: "PATCH",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ data: state }),
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function cors() {
  return new Response(null, { headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }});
}

export async function onRequestPost(context) {
  const { request } = context;
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  const { agentId } = body || {};
  if (!agentId) return json({ ok: false, error: "bad_input" }, 400);
  try {
    const state = await getState();
    const now = Date.now();
    const leaving = (state.agents || []).find(a => a.id === agentId);
    state.agents = (state.agents || []).filter(a => a.id !== agentId);
    if (leaving) {
      state.messages = state.messages || [];
      state.messages.push({ id: "m_" + Math.random().toString(36).slice(2, 10), system: true, text: `${leaving.name} left the room`, ts: now });
      if (state.messages.length > 200) state.messages = state.messages.slice(-200);
    }
    await saveState(state);
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: "state_unavailable" }, 500);
  }
}
export async function onRequestOptions() { return cors(); }
