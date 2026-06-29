export async function GET() {
  return Response.json({
    status: "ok",
    service: "paibanmao-saas",
    timestamp: new Date().toISOString(),
  });
}

