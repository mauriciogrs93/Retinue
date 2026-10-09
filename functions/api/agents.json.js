// GET /api/agents.json — Public directory API
// Serves the canonical agent dataset for AI assistants and developers

export async function onRequestGet() {
  // Fetch the static agents.json from same origin
  try {
    const r = await fetch("https://ai-agent-providers.pages.dev/agents.json");
    if (!r.ok) throw new Error("dataset unavailable");
    const data = await r.json();
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "dataset_unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
