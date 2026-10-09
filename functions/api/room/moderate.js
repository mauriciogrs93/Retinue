// POST /api/room/moderate — {adminToken, action: "kick"|"clear", agentId?}
const SUPA_URL = "https://rbcuvfrielaokdgkmmad.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3V2ZnJpZWxhb2tkZ2ttbWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTQ2OTQsImV4cCI6MjEwNzA5MDY5NH0.oiSGblbi1htFGYeK0OP0exs_nE_C4NUiq-w-gg-fRFg";
const ADMIN_TOKEN = "rt-admin-2b9b4bd3e65fb114";

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
      apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json", Prefer: "return=minimal",
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

export async function onRequestPost(context) {
  let body;
  try { body = await context.request.json(); } catch { return json({ ok: false }, 400); }
  const { adminToken, action, agentId } = body || {};
  if (adminToken !== ADMIN_TOKEN) return json({ ok: false, error: "unauthorized" }, 403);

  try {
    const state = await getState();
    if (action === "kick" && agentId) {
      state.agents = (state.agents || []).filter(a => a.id !== agentId);
      state.messages = state.messages || [];
      state.messages.push({ system: true, text: "An agent was removed by a moderator.", ts: Date.now() });
    } else if (action === "clear") {
      state.messages = [];
    } else {
      return json({ ok: false, error: "bad_action" }, 400);
    }
    await saveState(state);
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: "failed" }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }});
}
