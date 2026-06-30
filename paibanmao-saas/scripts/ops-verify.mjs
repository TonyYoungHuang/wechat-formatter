import "dotenv/config";

const baseUrl = process.env.OPS_BASE_URL || process.env.SMOKE_BASE_URL || process.env.APP_URL || "http://127.0.0.1:3001";
const alertWebhookUrl = process.env.HEALTH_ALERT_WEBHOOK_URL || process.env.OPS_ALERT_WEBHOOK_URL || "";
const timeoutMs = Number(process.env.OPS_VERIFY_TIMEOUT_MS || 8000);

function withTimeout(promise, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);

  return Promise.resolve(promise(controller.signal)).finally(() => clearTimeout(timeout));
}

async function request(path) {
  const url = new URL(path, baseUrl).toString();
  const response = await withTimeout((signal) => fetch(url, { signal, headers: { "User-Agent": "paibanmao-ops-verify/1.0" } }), path);
  const text = await response.text();
  return { response, text, url };
}

async function sendAlert(summary, details) {
  if (!alertWebhookUrl) {
    return;
  }

  await fetch(alertWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service: "paibanmao-saas",
      summary,
      details,
      checkedAt: new Date().toISOString(),
      baseUrl,
    }),
  }).catch((error) => {
    console.error(`Alert webhook failed: ${error instanceof Error ? error.message : String(error)}`);
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const checks = [];

  const health = await request("/api/health");
  checks.push({ path: "/api/health", status: health.response.status });
  assert(health.response.ok, `/api/health returned ${health.response.status}: ${health.text}`);

  const payload = JSON.parse(health.text);
  assert(payload.status === "ok", `/api/health status was ${payload.status}`);
  assert(payload.checks?.database?.status === "ok", "Database health check is not ok.");
  assert(payload.checks?.redis?.status === "ok", "Redis health check is not ok.");

  const robots = await request("/robots.txt");
  checks.push({ path: "/robots.txt", status: robots.response.status });
  assert(robots.response.ok && robots.text.includes("Sitemap:"), "/robots.txt is missing sitemap.");

  const sitemap = await request("/sitemap.xml");
  checks.push({ path: "/sitemap.xml", status: sitemap.response.status });
  assert(sitemap.response.ok && sitemap.text.includes("/use-cases/"), "/sitemap.xml is missing use-case SEO pages.");

  console.log(JSON.stringify({ status: "ok", service: "paibanmao-saas", baseUrl, checks }, null, 2));
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  await sendAlert("Paibanmao ops verification failed", { message });
  console.error(message);
  process.exit(1);
});
