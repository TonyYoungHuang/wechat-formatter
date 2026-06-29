const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const timestamp = Date.now();
const email = process.env.SMOKE_EMAIL || `smoke+${timestamp}@paibanmao.local`;
const password = process.env.SMOKE_PASSWORD || "paibanmao-smoke-123";
const requireAdmin = process.env.SMOKE_REQUIRE_ADMIN === "1";
const topic = "\u666e\u901a\u4eba\u505a\u516c\u4f17\u53f7\u526f\u4e1a\u8fd8\u6709\u673a\u4f1a\u5417";

const cookieJar = new Map();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readSetCookies(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }

  const header = response.headers.get("set-cookie");
  return header ? [header] : [];
}

function storeCookies(response) {
  for (const item of readSetCookies(response)) {
    const cookie = item.split(";")[0];
    const separator = cookie.indexOf("=");
    if (separator > 0) {
      cookieJar.set(cookie.slice(0, separator), cookie.slice(separator + 1));
    }
  }
}

function cookieHeader() {
  return Array.from(cookieJar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (cookieJar.size && !headers.has("Cookie")) {
    headers.set("Cookie", cookieHeader());
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });
  storeCookies(response);
  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  return { response, text, payload };
}

async function jsonRequest(path, body, options = {}) {
  return request(path, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
  });
}

async function checkDashboardRequiresValidSession() {
  const response = await fetch(`${baseUrl}/dashboard`, {
    headers: {
      Cookie: "paibanmao_session=invalid-smoke-session",
    },
    redirect: "manual",
  });
  const location = response.headers.get("location") || "";

  assert([303, 307, 308].includes(response.status), `/dashboard with invalid session returned ${response.status}, expected redirect`);
  assert(location.includes("/login"), "dashboard invalid-session redirect does not point to login");
}

async function registerAndCheckSession() {
  const registration = await jsonRequest("/api/auth/register", {
    name: "Smoke User",
    email,
    password,
  });

  assert(registration.response.ok, `/api/auth/register returned ${registration.response.status}: ${registration.text}`);
  assert(registration.payload?.user?.email === email, "registered user email mismatch");

  const me = await request("/api/auth/me");
  assert(me.response.ok, `/api/auth/me returned ${me.response.status}: ${me.text}`);
  assert(me.payload?.user?.email === email, "session user missing after registration");

  return me.payload;
}

async function checkAccountProfiles() {
  const profiles = await request("/api/account-profiles");
  assert(profiles.response.ok, `/api/account-profiles returned ${profiles.response.status}: ${profiles.text}`);
  assert(Array.isArray(profiles.payload?.profiles) && profiles.payload.profiles.length >= 1, "starter account profile missing");
  return profiles.payload.profiles[0];
}

async function checkFiveEntryGeneration(profile) {
  const generation = await jsonRequest("/api/generate/five-entry", {
    accountProfileId: profile.id,
    topic,
    goal: "growth",
  });

  assert(generation.response.ok, `/api/generate/five-entry returned ${generation.response.status}: ${generation.text}`);
  assert(generation.payload?.project?.id, "generated project id missing");
  assert(Array.isArray(generation.payload.project.variants) && generation.payload.project.variants.length === 5, "five-entry variants missing");

  const jobs = await request("/api/generation-jobs");
  assert(jobs.response.ok, `/api/generation-jobs returned ${jobs.response.status}: ${jobs.text}`);
  assert(Array.isArray(jobs.payload?.jobs) && jobs.payload.jobs.length >= 1, "generation job log missing");

  return generation.payload;
}

async function checkRewrite(profile, generated) {
  const source =
    generated.project.variants.find((variant) => variant.entry === "wechat_article")?.body ||
    "\u8fd9\u662f\u4e00\u6bb5\u7528\u4e8e\u9a8c\u8bc1\u964d\u4f4e AI \u5473\u7684\u516c\u4f17\u53f7\u6b63\u6587\uff0c\u9700\u8981\u4fdd\u7559\u6838\u5fc3\u89c2\u70b9\uff0c\u4f46\u8ba9\u8868\u8fbe\u66f4\u50cf\u771f\u5b9e\u521b\u4f5c\u8005\u5199\u7ed9\u8bfb\u8005\u7684\u5185\u5bb9\u3002";
  const rewrite = await jsonRequest("/api/generate/rewrite", {
    accountProfileId: profile.id,
    title: topic,
    content: source.slice(0, 2000),
    goal: "lower_ai_tone",
  });

  assert(rewrite.response.ok, `/api/generate/rewrite returned ${rewrite.response.status}: ${rewrite.text}`);
  assert(rewrite.payload?.job?.type === "ai_tone_rewrite", "rewrite generation job type mismatch");
  assert(rewrite.payload?.output?.body, "rewrite output body missing");
}

async function checkTopicSuggestions(profile) {
  const topics = await jsonRequest("/api/topics/generate", {
    accountProfileId: profile.id,
    theme: "\u516c\u4f17\u53f7\u526f\u4e1a\u51b7\u542f\u52a8",
    monetizationGoal: "\u8d44\u6599\u5305\u548c\u54a8\u8be2\u8f6c\u5316",
    avoid: "\u5938\u5927\u6536\u76ca\u627f\u8bfa",
    count: 3,
  });

  assert(topics.response.ok, `/api/topics/generate returned ${topics.response.status}: ${topics.text}`);
  assert(Array.isArray(topics.payload?.suggestions) && topics.payload.suggestions.length >= 3, "topic suggestions missing");
  assert(topics.payload?.job?.type === "topic_generation", "topic generation job type mismatch");
}

async function checkImagePrompts() {
  const imagePrompts = await jsonRequest("/api/generate/image-prompts", {
    topic,
    scene: "green_note_pages",
    pageCount: 3,
    style: "\u6e05\u723d\u5fae\u4fe1\u7eff\u8272\u5de5\u4f5c\u53f0\u98ce\u683c",
  });

  assert(imagePrompts.response.ok, `/api/generate/image-prompts returned ${imagePrompts.response.status}: ${imagePrompts.text}`);
  assert(Array.isArray(imagePrompts.payload?.output?.prompts) && imagePrompts.payload.output.prompts.length === 3, "image prompt output missing");
  assert(imagePrompts.payload?.job?.type === "image_prompt_generation", "image prompt generation job type mismatch");
}

async function checkQueuedGeneration(profile) {
  const queued = await jsonRequest("/api/generate/five-entry/queue", {
    accountProfileId: profile.id,
    topic: `${topic}\uff1a\u5f02\u6b65\u751f\u6210\u56de\u5f52`,
    goal: "search",
  });

  assert([200, 202].includes(queued.response.status), `/api/generate/five-entry/queue returned ${queued.response.status}: ${queued.text}`);

  if (queued.response.status === 202) {
    assert(queued.payload?.queued === true, "queued generation did not mark queued=true");
    assert(queued.payload?.job?.id, "queued generation job id missing");
    return;
  }

  assert(queued.payload?.queued === false, "queue fallback did not mark queued=false");
  assert(queued.payload?.project?.id, "queue fallback project id missing");
  assert(Array.isArray(queued.payload.project.variants) && queued.payload.project.variants.length === 5, "queue fallback variants missing");
}

async function configurePricingIfAdmin(currentUser) {
  if (!currentUser?.user?.isSiteAdmin) {
    const message = `Smoke user ${email} is not a site admin. Set SITE_ADMIN_EMAIL to this email before starting the server to test pricing and payment.`;
    if (requireAdmin) {
      throw new Error(message);
    }
    console.warn(`Skipping admin/payment checks: ${message}`);
    return false;
  }

  const pricing = await jsonRequest(
    "/api/admin/pricing",
    {
      plans: {
        starter: {
          name: "Starter",
          description: "Smoke test starter plan",
          priceCents: 9900,
          accountProfileLimit: 3,
          dailyGenerationLimit: null,
          monthlyGenerationLimit: 100,
          advancedChecks: false,
        },
      },
    },
    { method: "PATCH" },
  );

  assert(pricing.response.ok, `/api/admin/pricing returned ${pricing.response.status}: ${pricing.text}`);
  return true;
}

async function checkPaymentFlow() {
  const order = await jsonRequest("/api/billing/orders", {
    planCode: "starter",
    provider: "wechat",
  });

  assert(order.response.ok, `/api/billing/orders returned ${order.response.status}: ${order.text}`);
  assert(order.payload?.order?.id, "payment order id missing");
  assert(order.payload.order.amountCents === 9900, "payment order amount mismatch");

  const callback = await jsonRequest("/api/billing/callback/wechat", {
    orderId: order.payload.order.id,
    paid: true,
    amountCents: 9900,
    tradeNo: `SMOKE_${timestamp}`,
    providerOrderId: `SMOKE_PROVIDER_${timestamp}`,
  });

  assert(callback.response.ok, `/api/billing/callback/wechat returned ${callback.response.status}: ${callback.text}`);
  assert(callback.payload?.code === "SUCCESS", "wechat callback did not return success");

  const refreshed = await request(`/api/billing/orders/${order.payload.order.id}`);
  assert(refreshed.response.ok, `/api/billing/orders/:id returned ${refreshed.response.status}: ${refreshed.text}`);
  assert(refreshed.payload?.order?.status === "paid", "payment order was not marked paid");
  assert(Array.isArray(refreshed.payload.order.callbacks) && refreshed.payload.order.callbacks.length >= 1, "payment callback diagnostic missing");

  const me = await request("/api/auth/me");
  assert(me.payload?.workspace?.planCode === "starter", "workspace plan was not upgraded after payment callback");

  const invoicePayload = {
    paymentOrderId: order.payload.order.id,
    title: "\u6392\u7248\u732b\u6d4b\u8bd5\u53d1\u7968",
    email,
  };
  const invoice = await jsonRequest("/api/billing/invoices", invoicePayload);
  assert(invoice.response.status === 201, `/api/billing/invoices returned ${invoice.response.status}: ${invoice.text}`);
  assert(invoice.payload?.invoice?.paymentOrderId === order.payload.order.id, "invoice request payment order mismatch");

  const duplicateInvoice = await jsonRequest("/api/billing/invoices", invoicePayload);
  assert(duplicateInvoice.response.status === 409, `/api/billing/invoices duplicate returned ${duplicateInvoice.response.status}, expected 409`);
}

async function checkPaymentFailureFlow() {
  const order = await jsonRequest("/api/billing/orders", {
    planCode: "starter",
    provider: "wechat",
  });

  assert(order.response.ok, `/api/billing/orders for failed callback returned ${order.response.status}: ${order.text}`);
  assert(order.payload?.order?.id, "failed-payment order id missing");

  const callback = await jsonRequest("/api/billing/callback/wechat", {
    orderId: order.payload.order.id,
    paid: false,
    amountCents: 9900,
    tradeNo: `SMOKE_FAILED_${timestamp}`,
    providerOrderId: `SMOKE_FAILED_PROVIDER_${timestamp}`,
    status: "PAYERROR",
  });

  assert(callback.response.status >= 400, `/api/billing/callback/wechat failed callback returned ${callback.response.status}, expected failure`);

  const refreshed = await request(`/api/billing/orders/${order.payload.order.id}`);
  assert(refreshed.response.ok, `/api/billing/orders/:id for failed callback returned ${refreshed.response.status}: ${refreshed.text}`);
  assert(refreshed.payload?.order?.status === "failed", "payment order was not marked failed after failed callback");
  assert(Array.isArray(refreshed.payload.order.callbacks) && refreshed.payload.order.callbacks.length >= 1, "failed payment callback diagnostic missing");
}

async function main() {
  console.log(`Running app smoke checks against ${baseUrl}`);
  await checkDashboardRequiresValidSession();
  const current = await registerAndCheckSession();
  const profile = await checkAccountProfiles();
  const generated = await checkFiveEntryGeneration(profile);
  const canCheckPayment = await configurePricingIfAdmin(current);

  if (canCheckPayment) {
    await checkPaymentFlow();
    await checkPaymentFailureFlow();
    await checkQueuedGeneration(profile);
    await checkTopicSuggestions(profile);
    await checkImagePrompts();
    await checkRewrite(profile, generated);
  }

  console.log("App smoke checks passed.");
  console.log(`Smoke email: ${email}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
