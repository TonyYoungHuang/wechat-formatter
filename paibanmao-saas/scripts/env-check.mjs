import "dotenv/config";

const production = process.env.NODE_ENV === "production";

const checks = [];

function configured(key) {
  return Boolean(process.env[key]?.trim());
}

function addCheck({ key, ok, level = "error", message }) {
  checks.push({ key, ok, level, message });
}

function requireEnv(key, message = `${key} is required.`) {
  addCheck({ key, ok: configured(key), message });
}

function warnEnv(key, message = `${key} is not configured.`) {
  addCheck({ key, ok: configured(key), level: "warn", message });
}

function configuredAny(keys) {
  return keys.some((key) => configured(key));
}

requireEnv("DATABASE_URL", "PostgreSQL DATABASE_URL is required.");
requireEnv("REDIS_URL", production ? "REDIS_URL is required in production for queues and health checks." : "REDIS_URL is recommended for queued generation.");
addCheck({
  key: "REQUESTY_BASE_URL",
  ok: configuredAny(["REQUESTY_BASE_URL", "AI_OPENAI_COMPATIBLE_BASE_URL"]),
  level: "warn",
  message: "REQUESTY_BASE_URL is recommended; default is https://router.requesty.ai/v1 when omitted.",
});
addCheck({
  key: "REQUESTY_API_KEY",
  ok: configuredAny(["REQUESTY_API_KEY", "AI_OPENAI_COMPATIBLE_API_KEY"]),
  message: "REQUESTY_API_KEY is required for Requesty text and image generation.",
});
warnEnv("REQUESTY_TEXT_MODEL", "REQUESTY_TEXT_MODEL is optional; default is openai/gpt-4o-mini.");
warnEnv("REQUESTY_IMAGE_MODEL", "REQUESTY_IMAGE_MODEL is optional; default is openai/gpt-image-2.");

if (!configured("SITE_ADMIN_EMAIL") && !configured("SITE_ADMIN_EMAILS")) {
  addCheck({
    key: "SITE_ADMIN_EMAIL",
    ok: false,
    message: "SITE_ADMIN_EMAIL or SITE_ADMIN_EMAILS is required for pricing, quota, model, and payment settings.",
  });
}

const authSecret = process.env.AUTH_SECRET || "";
addCheck({
  key: "AUTH_SECRET",
  ok: configured("AUTH_SECRET") && authSecret.length >= 32 && authSecret !== "replace-with-a-long-random-secret",
  message: "AUTH_SECRET is required, should be at least 32 characters, and must not use the example placeholder.",
});

const appUrl = process.env.APP_URL || "";
addCheck({
  key: "APP_URL",
  ok: configured("APP_URL") && (!production || appUrl.startsWith("https://")),
  message: production ? "APP_URL is required and must use HTTPS in production." : "APP_URL is required for sitemap, payment callbacks, and auth redirects.",
});

const wechatCheckoutKeys = ["WECHAT_PAY_APP_ID", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_MCH_SERIAL_NO", "WECHAT_PAY_PRIVATE_KEY_PEM"];
const wechatCallbackKeys = ["WECHAT_PAY_API_V3_KEY", "WECHAT_PAY_PLATFORM_CERT_PEM"];
const alipayCheckoutKeys = ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY_PEM"];
const alipayCallbackKeys = ["ALIPAY_PUBLIC_KEY_PEM"];

function addPaymentGroup(provider, purpose, keys) {
  const missing = keys.filter((key) => !configured(key));
  const ok = missing.length === 0;

  addCheck({
    key: `${provider}:${purpose}`,
    ok,
    level: production ? "error" : ok ? "ok" : "warn",
    message: ok ? `${provider} ${purpose} configuration is complete.` : `${provider} ${purpose} missing: ${missing.join(", ")}`,
  });
}

addPaymentGroup("WeChat Pay", "checkout", wechatCheckoutKeys);
addPaymentGroup("WeChat Pay", "callback", wechatCallbackKeys);
addPaymentGroup("Alipay", "checkout", alipayCheckoutKeys);
addPaymentGroup("Alipay", "callback", alipayCallbackKeys);

if (!configured("ALIPAY_GATEWAY_URL")) {
  warnEnv("ALIPAY_GATEWAY_URL", "ALIPAY_GATEWAY_URL is optional; production default is https://openapi.alipay.com/gateway.do.");
}

const errors = checks.filter((check) => !check.ok && check.level === "error");
const warnings = checks.filter((check) => !check.ok && check.level === "warn");

for (const check of checks) {
  const status = check.ok ? "ok" : check.level;
  console.log(`[${status}] ${check.key}: ${check.ok ? "configured" : check.message}`);
}

if (warnings.length) {
  console.warn(`Environment warnings: ${warnings.length}`);
}

if (errors.length) {
  console.error(`Environment errors: ${errors.length}`);
  process.exitCode = 1;
} else {
  console.log("Environment check passed.");
}
