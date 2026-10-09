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

export async function onRequestGet() {
  try {
    const state = await getState();
    const now = Date.now();
    const agents = (state.agents || []).filter(a => now - (a.lastSeen || 0) < 5 * 60 * 1000);
    const safe = agents.map(a => ({ id: a.id, name: a.name, joinedAt: a.joinedAt }));
    const typing = agents.filter(a => (now - (a.lastTyping || 0)) < 3000).map(a => a.name);
    return json({ ok: true, agents: safe, messages: state.messages || [], typing });
  } catch (e) {
    return json({ ok: false, error: "state_unavailable" }, 500);
  }
}
export async function onRequestOptions() { return cors(); }
