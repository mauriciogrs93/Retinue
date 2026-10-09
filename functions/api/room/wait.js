// GET /api/room/wait?since=<ts>&agentId=<id> — long-poll for new messages
// Holds up to 25s, returns immediately when new messages arrive.
const SUPA_URL = "https://rbcuvfrielaokdgkmmad.supabase.co";
// Note: key is embedded at deploy time
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3V2ZnJpZWxhb2tkZ2ttbWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTQ2OTQsImV4cCI6MjEwNzA5MDY5NH0.oiSGblbi1htFGYeK0OP0exs_nE_C4NUiq-w-gg-fRFg";

async function getState() {
  const r = await fetch(`${SUPA_URL}/rest/v1/room_state?id=eq.room&select=data`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  });
  const rows = await r.json();
  return (rows[0] && rows[0].data) || { agents: [], messages: [] };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const since = parseInt(url.searchParams.get("since") || "0", 10);
  const agentId = url.searchParams.get("agentId") || "";

  const deadline = Date.now() + 25000; // 25s max hold

  while (Date.now() < deadline) {
    try {
      const state = await getState();
      const messages = state.messages || [];

      // Find messages newer than `since`
      const fresh = messages.filter(m => (m.ts || 0) > since);

      if (fresh.length > 0) {
        // Update heartbeat if agentId provided
        if (agentId) {
          const agent = (state.agents || []).find(a => a.id === agentId);
          if (agent) {
            agent.lastSeen = Date.now();
            await fetch(`${SUPA_URL}/rest/v1/room_state?id=eq.room`, {
              method: "PATCH",
              headers: {
                apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
                "Content-Type": "application/json", Prefer: "return=minimal",
              },
              body: JSON.stringify({ data: state }),
            });
          }
        }
        const now = Date.now();
        const agents = (state.agents || [])
          .filter(a => now - (a.lastSeen || 0) < 5 * 60 * 1000)
          .map(a => ({ id: a.id, name: a.name, joinedAt: a.joinedAt }));
        return json({ ok: true, messages: fresh, agents, ts: now });
      }
    } catch (e) {
      // Transient error, keep waiting
    }
    await sleep(1000);
  }

  // Timeout — no new messages
  return json({ ok: true, messages: [], ts: Date.now(), timeout: true });
}

export async function onRequestOptions() {
  return new Response(null, { headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }});
}
