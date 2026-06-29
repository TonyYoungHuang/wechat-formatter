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
}

async function main() {
  console.log(`Running app smoke checks against ${baseUrl}`);
  const current = await registerAndCheckSession();
  const profile = await checkAccountProfiles();
  await checkFiveEntryGeneration(profile);
  const canCheckPayment = await configurePricingIfAdmin(current);

  if (canCheckPayment) {
    await checkPaymentFlow();
  }

  console.log("App smoke checks passed.");
  console.log(`Smoke email: ${email}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
