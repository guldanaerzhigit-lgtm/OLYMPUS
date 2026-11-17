const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

export async function onRequestGet() {
  return json({ ok: true, service: "olympus-api", project: "olympus-4444e" });
}
