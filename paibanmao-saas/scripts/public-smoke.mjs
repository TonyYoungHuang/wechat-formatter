const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const brandText = "\u6392\u7248\u732b";
const previewInput = "\u666e\u901a\u4eba\u505a\u516c\u4f17\u53f7\u526f\u4e1a\u8fd8\u6709\u673a\u4f1a\u5417";

const publicPages = [
  "/",
  "/pricing",
  "/templates",
  "/tutorials",
  "/tools/topic-generator",
  "/tools/green-note-generator",
  "/tools/search-keyword-helper",
  "/tools/question-answer-generator",
  "/tools/moments-copy-generator",
  "/tools/compliance-checker",
];

const sitemapPaths = [
  "/tools/topic-generator",
  "/tools/compliance-checker",
  "/tutorials/wechat-topic-to-five-entries",
];

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  return { response, text };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function checkPublicPages() {
  for (const path of publicPages) {
    const { response, text } = await request(path);
    assert(response.ok, `${path} returned ${response.status}`);
    assert(text.includes(brandText), `${path} does not include brand text`);
  }
}

async function checkSitemapAndRobots() {
  const sitemap = await request("/sitemap.xml");
  assert(sitemap.response.ok, `/sitemap.xml returned ${sitemap.response.status}`);
  for (const path of sitemapPaths) {
    assert(sitemap.text.includes(path), `/sitemap.xml missing ${path}`);
  }

  const robots = await request("/robots.txt");
  assert(robots.response.ok, `/robots.txt returned ${robots.response.status}`);
  assert(robots.text.includes("Disallow: /dashboard"), "/robots.txt does not disallow dashboard");
  assert(robots.text.includes("Sitemap:"), "/robots.txt missing sitemap reference");
}

async function checkDashboardRedirect() {
  const response = await fetch(`${baseUrl}/dashboard/generate?topic=smoke`, {
    redirect: "manual",
  });
  const location = response.headers.get("location") || "";
  assert([307, 308].includes(response.status), `/dashboard/generate returned ${response.status}, expected redirect`);
  assert(location.includes("/login"), "dashboard redirect does not point to login");
  assert(location.includes("next="), "dashboard redirect does not preserve next parameter");
}

async function checkToolPreview() {
  const { response, text } = await request("/api/tools/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "topic",
      input: previewInput,
    }),
  });
  assert(response.ok, `/api/tools/preview returned ${response.status}: ${text}`);
  const payload = JSON.parse(text);
  assert(payload.preview?.title, "preview title missing");
  assert(Array.isArray(payload.preview?.blocks) && payload.preview.blocks.length > 0, "preview blocks missing");
}

async function main() {
  console.log(`Running public smoke checks against ${baseUrl}`);
  await checkPublicPages();
  await checkSitemapAndRobots();
  await checkDashboardRedirect();
  await checkToolPreview();
  console.log("Public smoke checks passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
