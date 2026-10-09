// POST /api/room/invite → {ok, invite, expires_at}
const SUPA_URL = "https://rbcuvfrielaokdgkmmad.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiY3V2ZnJpZWxhb2tkZ2ttbWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MTQ2OTQsImV4cCI6MjEwNzA5MDY5NH0.oiSGblbi1htFGYeK0OP0exs_nE_C4NUiq-w-gg-fRFg";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function genCode() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  for (const b of buf) s += chars[b % chars.length];
  return "rt-" + s;
}

export async function onRequestPost() {
  try {
    const code = genCode();
    const r = await fetch(`${SUPA_URL}/rest/v1/room_invites`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json", Prefer: "return=minimal",
      },
      body: JSON.stringify({ code }),
    });
    if (!r.ok) throw new Error("insert failed");
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    return json({ ok: true, invite: code, expires_at });
  } catch (e) {
    return json({ ok: false, error: "invite_failed" }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }});
}
