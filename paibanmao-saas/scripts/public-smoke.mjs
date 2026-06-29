const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const brandText = "\u6392\u7248\u732b";
const previewInput = "\u666e\u901a\u4eba\u505a\u516c\u4f17\u53f7\u526f\u4e1a\u8fd8\u6709\u673a\u4f1a\u5417";

const publicPages = [
  "/",
  "/pricing",
  "/templates",
  "/tutorials",
  "/tools/topic-generator",
  "/tools/wechat-title-generator",
  "/tools/green-note-generator",
  "/tools/search-keyword-helper",
  "/tools/question-answer-generator",
  "/tools/moments-copy-generator",
  "/tools/compliance-checker",
];

const toolPages = publicPages.filter((path) => path.startsWith("/tools/"));
const usageHeading = "\u600e\u4e48\u4f7f\u7528\u8fd9\u4e2a\u5de5\u5177";
const faqHeading = "\u5e38\u89c1\u95ee\u9898";

const sitemapPaths = [
  "/tools/topic-generator",
  "/tools/wechat-title-generator",
  "/tools/green-note-generator",
  "/tools/search-keyword-helper",
  "/tools/question-answer-generator",
  "/tools/moments-copy-generator",
  "/tools/compliance-checker",
  "/pricing",
  "/templates",
  "/tutorials",
  "/tutorials/wechat-topic-to-five-entries",
];

const protectedGetPaths = [
  "/api/account-profiles",
  "/api/admin/ai-providers",
  "/api/admin/entitlements",
  "/api/admin/payment-settings",
  "/api/admin/pricing",
  "/api/admin/prompts",
  "/api/billing/invoices",
  "/api/billing/orders",
  "/api/calendar-items",
  "/api/content-templates",
  "/api/cta-snippets",
  "/api/generation-jobs",
  "/api/projects",
  "/api/topics",
  "/api/usage/summary",
];

const protectedPostChecks = [
  {
    path: "/api/admin/ai-providers",
    method: "PATCH",
    body: {},
  },
  {
    path: "/api/admin/entitlements",
    method: "PATCH",
    body: {},
  },
  {
    path: "/api/admin/pricing",
    method: "PATCH",
    body: {},
  },
  {
    path: "/api/admin/prompts",
    method: "PATCH",
    body: {},
  },
  {
    path: "/api/generate/five-entry",
    body: {
      topic: previewInput,
    },
  },
  {
    path: "/api/generate/five-entry/queue",
    body: {
      topic: previewInput,
    },
  },
  {
    path: "/api/generate/wechat-article",
    body: {
      topic: previewInput,
    },
  },
  {
    path: "/api/generate/green-note",
    body: {
      topic: previewInput,
    },
  },
  {
    path: "/api/generate/search",
    body: {
      topic: previewInput,
    },
  },
  {
    path: "/api/generate/question",
    body: {
      topic: previewInput,
    },
  },
  {
    path: "/api/generate/moments",
    body: {
      topic: previewInput,
    },
  },
  {
    path: "/api/generate/image-prompts",
    body: {
      topic: previewInput,
      style: "\u5c0f\u7eff\u4e66\u5c01\u9762",
    },
  },
  {
    path: "/api/generate/rewrite",
    body: {
      content: `${previewInput}\u3002\u8fd9\u662f\u4e00\u6bb5\u7528\u4e8e\u9a8c\u8bc1\u672a\u767b\u5f55\u62e6\u622a\u7684\u6d4b\u8bd5\u6587\u672c\u3002`,
      tone: "clear",
    },
  },
  {
    path: "/api/topics/generate",
    body: {
      seed: previewInput,
    },
  },
];

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  return { response, text };
}

function visitorHeaders(name, headers = {}) {
  return {
    "User-Agent": `paibanmao-public-smoke/${name}`,
    "X-Forwarded-For": `203.0.113.${name.length}`,
    ...headers,
  };
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

async function checkToolSeoSections() {
  for (const path of toolPages) {
    const { response, text } = await request(path);
    assert(response.ok, `${path} returned ${response.status}`);
    assert(text.includes(usageHeading), `${path} missing usage guide section`);
    assert(text.includes(faqHeading), `${path} missing FAQ section`);
    assert(text.includes("FAQPage"), `${path} missing FAQPage structured data`);
  }
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

async function checkProtectedApiAuth() {
  for (const path of protectedGetPaths) {
    const { response } = await request(path);
    assert(response.status === 401, `${path} returned ${response.status}, expected 401`);
  }

  for (const check of protectedPostChecks) {
    const { response, text } = await request(check.path, {
      method: check.method ?? "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(check.body),
    });
    assert(response.status === 401, `${check.path} returned ${response.status}, expected 401: ${text}`);
  }
}

async function checkToolPreview() {
  const { response, text } = await request("/api/tools/preview", {
    method: "POST",
    headers: visitorHeaders("tool-preview", { "Content-Type": "application/json" }),
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

async function checkPublicPreviewLimit() {
  const title = await request("/api/tools/wechat-title-generator", {
    method: "POST",
    headers: visitorHeaders("preview-limit", { "Content-Type": "application/json" }),
    body: JSON.stringify({
      topic: previewInput,
      audience: "\u516c\u4f17\u53f7\u526f\u4e1a\u65b0\u624b",
      goal: "growth",
      tone: "\u6e05\u6670\u3001\u5177\u4f53\u3001\u6709\u70b9\u51fb\u6b32\u671b",
    }),
  });
  assert(title.response.ok, `/api/tools/wechat-title-generator returned ${title.response.status}: ${title.text}`);
  const titlePayload = JSON.parse(title.text);
  assert(Array.isArray(titlePayload.suggestions) && titlePayload.suggestions.length === 12, "title suggestions missing");

  const setCookie = title.response.headers.get("set-cookie") || "";
  const cookieHeader = setCookie.split(";")[0];
  assert(cookieHeader.includes("paibanmao_public_preview_used=1"), "title preview did not set public preview cookie");

  const blocked = await request("/api/tools/preview", {
    method: "POST",
    headers: visitorHeaders("preview-limit", {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      kind: "topic",
      input: previewInput,
    }),
  });
  assert(blocked.response.status === 429, `/api/tools/preview with used cookie returned ${blocked.response.status}, expected 429`);
}

async function main() {
  console.log(`Running public smoke checks against ${baseUrl}`);
  await checkPublicPages();
  await checkSitemapAndRobots();
  await checkToolSeoSections();
  await checkDashboardRedirect();
  await checkProtectedApiAuth();
  await checkToolPreview();
  await checkPublicPreviewLimit();
  console.log("Public smoke checks passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
