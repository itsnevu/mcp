export async function GET() {
  return Response.json({ ok: true, service: "ranger-backend", mode: "demo" });
}
