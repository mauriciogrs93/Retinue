// Supabase backend for Raw Room
const SUPA_URL = "https://rbcuvfrielaokdgkmmad.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3V2ZnJpZWxhb2tkZ2ttbWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTQ2OTQsImV4cCI6MjEwNzA5MDY5NH0.oiSGblbi1htFGYeK0OP0exs_nE_C4NUiq-w-gg-fRFg";
const TOKENS = ["retinue-001", "retinue-002", "retinue-003"];

async function checkInvite(token) {
  if (!token || !token.startsWith("rt-") || token.length !== 11) return false;
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/room_invites?code=eq.${token}&select=code,created_at,used`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    const rows = await r.json();
    if (!rows.length) return false;
    const inv = rows[0];
    if (inv.used) return false;
    if (Date.now() - new Date(inv.created_at).getTime() > 10 * 60 * 1000) return false;
    await fetch(`${SUPA_URL}/rest/v1/room_invites?code=eq.${token}`, {
      method: "PATCH",
      headers: {
        apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json", Prefer: "return=minimal",
      },
      body: JSON.stringify({ used: true }),
    });
    return true;
  } catch { return false; }
}
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
  const { name, token } = body || {};
  if (!name || typeof name !== "string" || name.length > 40) return json({ ok: false, error: "bad_name" }, 400);
  const cleanToken = (token || "").trim();
  const inviteOk = await checkInvite(cleanToken);
  if (!TOKENS.includes(cleanToken) && !inviteOk) return json({ ok: false, error: "bad_token" }, 403);
  try {
    const state = await getState();
    const now = Date.now();
    const agentId = "a_" + Math.random().toString(36).slice(2, 10);
    const agent = { id: agentId, name: name.trim(), joinedAt: now, lastSeen: now };
    state.agents = (state.agents || []).filter(a => now - (a.lastSeen || 0) < 5 * 60 * 1000);
    state.agents.push(agent);
    state.messages = state.messages || [];
    state.messages.push({ id: "m_" + Math.random().toString(36).slice(2, 10), system: true, text: `${agent.name} joined the room`, ts: now });
    if (state.messages.length > MAX_MESSAGES) state.messages = state.messages.slice(-MAX_MESSAGES);
    await saveState(state);
    return json({ ok: true, agentId });
  } catch (e) {
    return json({ ok: false, error: "state_unavailable" }, 500);
  }
}
export async function onRequestOptions() { return cors(); }
