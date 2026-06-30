import { createHmac } from "node:crypto";

const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const timestamp = Date.now();
const email = process.env.SMOKE_EMAIL || `smoke+${timestamp}@paibanmao.local`;
const normalizedEmail = email.trim().toLowerCase();
const password = process.env.SMOKE_PASSWORD || "paibanmao-smoke-123";
let currentPassword = password;
const requireAdmin = process.env.SMOKE_REQUIRE_ADMIN === "1";
const paymentCallbackSmokeSecret = process.env.PAYMENT_CALLBACK_SMOKE_SECRET;
const topic = "\u666e\u901a\u4eba\u505a\u516c\u4f17\u53f7\u526f\u4e1a\u8fd8\u6709\u673a\u4f1a\u5417";

const cookieJar = new Map();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const mojibakePattern = /[�]|鎺|鐢|閫|鈥|俙|歿|绂|鍥|绠/;

function assertNoMojibake(value, label) {
  const text = String(value ?? "");
  assert(!mojibakePattern.test(text), `${label} contains mojibake: ${text.slice(0, 120)}`);
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

async function paymentCallbackRequest(path, provider, body, options = {}) {
  const rawBody = JSON.stringify(body);
  const headers = {
    "Content-Type": "application/json",
  };

  if (paymentCallbackSmokeSecret) {
    const signedAt = options.signedAt ?? Math.floor(Date.now() / 1000).toString();
    const nonce = `smoke-${timestamp}-${provider}`;
    const message = `${provider}\n${signedAt}\n${nonce}\n${rawBody}`;
    headers["x-paibanmao-timestamp"] = signedAt;
    headers["x-paibanmao-nonce"] = nonce;
    headers["x-paibanmao-signature"] = createHmac("sha256", paymentCallbackSmokeSecret).update(message).digest("base64");
  }

  return request(path, {
    method: "POST",
    headers,
    body: rawBody,
  });
}

function accountProfilePayload(name) {
  return {
    name,
    type: "wechat_official",
    niche: "WeChat creator side business",
    persona: "A practical solo creator writing for small WeChat creators.",
    audience: "Small WeChat creators who want repeatable topic and publishing workflows.",
    audiencePainPoints: "They do not know what to write, how to repurpose one topic, or how to make content feel trustworthy.",
    productOrService: "Templates, consulting, and lightweight courses",
    monetizationMethods: ["consulting", "templates"],
    tone: "Clear, specific, and grounded.",
    commonCta: "Save this workflow and adapt it to your own account profile.",
    forbiddenWords: ["guaranteed", "get rich"],
    sampleText: "",
    isDefault: false,
  };
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

async function checkAuthPagesIgnoreInvalidSessionCookie() {
  for (const path of ["/login", "/register"]) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        Cookie: "paibanmao_session=invalid-smoke-session",
      },
      redirect: "manual",
    });
    const text = await response.text();

    assert(response.status === 200, `${path} with invalid session returned ${response.status}, expected 200`);
    assert(text.includes(path === "/login" ? "登录排版猫" : "注册排版猫"), `${path} did not render the auth form with invalid session`);
  }
}

async function registerAndCheckSession() {
  const registration = await jsonRequest("/api/auth/register", {
    name: "Smoke User",
    email,
    password: currentPassword,
  });

  assert(registration.response.ok, `/api/auth/register returned ${registration.response.status}: ${registration.text}`);
  assert(registration.payload?.user?.email === normalizedEmail, "registered user email mismatch");

  const me = await request("/api/auth/me");
  assert(me.response.ok, `/api/auth/me returned ${me.response.status}: ${me.text}`);
  assert(me.payload?.user?.email === normalizedEmail, "session user missing after registration");

  return { ...me.payload, verificationLink: registration.payload?.verificationLink };
}

async function checkAuthRejections() {
  const duplicate = await jsonRequest("/api/auth/register", {
    name: "Duplicate Smoke User",
    email: email.toUpperCase(),
    password,
  });

  assert(duplicate.response.status === 409, `/api/auth/register duplicate returned ${duplicate.response.status}, expected 409`);

  const wrongPassword = await jsonRequest("/api/auth/login", {
    email: email.toUpperCase(),
    password: "definitely-the-wrong-password",
  });

  assert(wrongPassword.response.status === 401, `/api/auth/login wrong password returned ${wrongPassword.response.status}, expected 401`);
}

async function checkEmailVerification(current) {
  assert(current.verificationLink, "registration did not return a local verification link");
  const token = new URL(current.verificationLink).searchParams.get("token");
  assert(token, "verification link missing token");

  const verified = await jsonRequest("/api/auth/verify-email", { token });
  assert(verified.response.ok, `/api/auth/verify-email returned ${verified.response.status}: ${verified.text}`);
  assert(verified.payload?.user?.emailVerifiedAt, "email verification timestamp missing");

  const me = await request("/api/auth/me");
  assert(me.response.ok, `/api/auth/me after email verification returned ${me.response.status}: ${me.text}`);
  assert(me.payload?.user?.emailVerifiedAt, "current user is not marked email verified");

  const resend = await jsonRequest("/api/auth/verify-email/request", {});
  assert(resend.response.ok, `/api/auth/verify-email/request returned ${resend.response.status}: ${resend.text}`);
  assert(resend.payload?.verified === true, "verified user should not receive another verification token");
}

async function checkLoginRateLimit() {
  const rateLimitEmail = `ratelimit+${timestamp}@paibanmao.local`;
  const rateLimitIp = `198.51.100.${timestamp % 200}`;

  for (let index = 0; index < 5; index += 1) {
    const failed = await jsonRequest(
      "/api/auth/login",
      { email: rateLimitEmail, password: `wrong-${index}` },
      { headers: { "x-forwarded-for": rateLimitIp } },
    );
    assert(failed.response.status === 401, `/api/auth/login rate setup returned ${failed.response.status}, expected 401`);
  }

  const limited = await jsonRequest(
    "/api/auth/login",
    { email: rateLimitEmail, password: "wrong-limited" },
    { headers: { "x-forwarded-for": rateLimitIp } },
  );
  assert(limited.response.status === 429, `/api/auth/login rate limit returned ${limited.response.status}, expected 429`);
}

async function checkPasswordResetFlow() {
  const resetRequest = await jsonRequest("/api/auth/password-reset/request", { email: normalizedEmail });
  assert(resetRequest.response.ok, `/api/auth/password-reset/request returned ${resetRequest.response.status}: ${resetRequest.text}`);
  assert(resetRequest.payload?.resetLink, "password reset request did not return local reset link");

  const token = new URL(resetRequest.payload.resetLink).searchParams.get("token");
  assert(token, "reset link missing token");

  const nextPassword = `paibanmao-reset-${timestamp}`;
  const reset = await jsonRequest("/api/auth/password-reset/confirm", { token, password: nextPassword });
  assert(reset.response.ok, `/api/auth/password-reset/confirm returned ${reset.response.status}: ${reset.text}`);
  assert(reset.payload?.reset === true, "password reset confirmation missing reset flag");
  currentPassword = nextPassword;

  const meAfterReset = await request("/api/auth/me");
  assert(meAfterReset.response.ok, `/api/auth/me after password reset returned ${meAfterReset.response.status}: ${meAfterReset.text}`);
  assert(meAfterReset.payload?.user === null, "password reset did not revoke the current session");
}

async function checkLogoutAndReloginFlow() {
  const logout = await request("/api/auth/logout", { method: "POST" });
  assert(logout.response.status === 204, `/api/auth/logout returned ${logout.response.status}, expected 204`);

  const meAfterLogout = await request("/api/auth/me");
  assert(meAfterLogout.response.ok, `/api/auth/me after logout returned ${meAfterLogout.response.status}: ${meAfterLogout.text}`);
  assert(meAfterLogout.payload?.user === null, "session user still present after logout");
  assert(meAfterLogout.payload?.workspace === null, "session workspace still present after logout");

  const protectedAfterLogout = await request("/api/account-profiles");
  assert(protectedAfterLogout.response.status === 401, `/api/account-profiles after logout returned ${protectedAfterLogout.response.status}, expected 401`);

  const relogin = await jsonRequest("/api/auth/login", {
    email: email.toUpperCase(),
    password: currentPassword,
  });

  assert(relogin.response.ok, `/api/auth/login after logout returned ${relogin.response.status}: ${relogin.text}`);
  assert(relogin.payload?.user?.email === normalizedEmail, "relogin user email mismatch");
}

async function checkAccountProfiles() {
  const profiles = await request("/api/account-profiles");
  assert(profiles.response.ok, `/api/account-profiles returned ${profiles.response.status}: ${profiles.text}`);
  assert(Array.isArray(profiles.payload?.profiles) && profiles.payload.profiles.length >= 1, "starter account profile missing");
  return profiles.payload.profiles[0];
}

async function checkDashboardOperatingView() {
  const dashboard = await request("/dashboard");
  assert(dashboard.response.ok, `/dashboard returned ${dashboard.response.status}: ${dashboard.text.slice(0, 200)}`);
  assert(dashboard.text.includes("最近内容项目"), "dashboard recent projects section missing");
  assert(dashboard.text.includes("待发布内容"), "dashboard upcoming content section missing");
  assert(dashboard.text.includes("账号档案完整度"), "dashboard account profile completeness section missing");
}

async function checkEditorFiveEntryView() {
  const editor = await request("/dashboard/editor");
  assert(editor.response.ok, `/dashboard/editor returned ${editor.response.status}: ${editor.text.slice(0, 200)}`);
  assert(editor.text.includes("五入口内容编辑器"), "editor page title missing");
  for (const label of ["公众号", "小绿书", "搜一搜", "问一问", "朋友圈"]) {
    assert(editor.text.includes(label), `editor entry label missing: ${label}`);
  }
}

async function checkFiveEntryGeneratorView() {
  const generator = await request("/dashboard/generate");
  assert(generator.response.ok, `/dashboard/generate returned ${generator.response.status}: ${generator.text.slice(0, 200)}`);
  assert(generator.text.includes("五入口生成器"), "generator page title missing");
  assert(generator.text.includes("生成五入口内容"), "generator primary action missing");
  assert(generator.text.includes("后台生成"), "generator queue action missing");
  for (const label of ["公众号", "小绿书", "搜一搜", "问一问", "朋友圈"]) {
    assert(generator.text.includes(label), `generator entry label missing: ${label}`);
  }
}

async function checkBillingWorkbenchView() {
  const billing = await request("/dashboard/billing");
  assert(billing.response.ok, `/dashboard/billing returned ${billing.response.status}: ${billing.text.slice(0, 200)}`);

  const plans = await request("/api/billing/plans");
  assert(plans.response.ok, `/api/billing/plans for billing page returned ${plans.response.status}: ${plans.text}`);
  assert(Array.isArray(plans.payload?.plans) && plans.payload.plans.some((plan) => plan.code === "starter"), "billing plans missing starter plan");

  const usage = await request("/api/usage/summary");
  assert(usage.response.ok, `/api/usage/summary for billing page returned ${usage.response.status}: ${usage.text}`);
  assert(usage.payload?.generation?.plan?.code, "billing usage summary missing current plan");
}

async function checkFreeAccountProfileLimit() {
  const blocked = await jsonRequest("/api/account-profiles", accountProfilePayload("Free extra profile"));
  assert(blocked.response.status === 409, `/api/account-profiles free extra returned ${blocked.response.status}, expected 409`);
}

async function checkQueuedGenerationScopeRejection() {
  const jobsBefore = await request("/api/generation-jobs");
  assert(jobsBefore.response.ok, `/api/generation-jobs before invalid queue returned ${jobsBefore.response.status}: ${jobsBefore.text}`);
  const beforeCount = jobsBefore.payload?.jobs?.length ?? 0;

  const invalid = await jsonRequest("/api/generate/five-entry/queue", {
    accountProfileId: "missing-account-profile-id",
    topic: `${topic}\uff1a\u5f02\u6b65\u751f\u6210\u574f\u6863\u6848\u56de\u5f52`,
    goal: "growth",
  });
  assert(invalid.response.status === 404, `/api/generate/five-entry/queue invalid account profile returned ${invalid.response.status}, expected 404`);

  const jobsAfter = await request("/api/generation-jobs");
  assert(jobsAfter.response.ok, `/api/generation-jobs after invalid queue returned ${jobsAfter.response.status}: ${jobsAfter.text}`);
  const afterCount = jobsAfter.payload?.jobs?.length ?? 0;
  assert(afterCount === beforeCount, "invalid queued generation created a pending job");
}

async function checkManualTopicCreation(profile) {
  const created = await jsonRequest("/api/topics", {
    accountProfileId: profile.id,
    title: `${topic}\uff1a\u624b\u52a8\u9009\u9898\u56de\u5f52`,
    reason: "\u9a8c\u8bc1\u9009\u9898\u53ef\u4ee5\u4fdd\u5b58\u5e76\u8fdb\u5165\u4e94\u5165\u53e3\u751f\u6210\u3002",
    goals: ["growth", "search"],
    entries: ["wechat_article", "green_note", "search", "question", "moments"],
  });

  assert(created.response.status === 201, `/api/topics returned ${created.response.status}: ${created.text}`);
  assert(created.payload?.topic?.id, "created topic id missing");

  const topics = await request("/api/topics");
  assert(topics.response.ok, `/api/topics list returned ${topics.response.status}: ${topics.text}`);
  assert(topics.payload?.topics?.some((item) => item.id === created.payload.topic.id), "created topic missing from topic list");

  return created.payload.topic;
}

async function checkStarterAccountProfileLimit() {
  const second = await jsonRequest("/api/account-profiles", accountProfilePayload("Starter profile two"));
  assert(second.response.status === 201, `/api/account-profiles starter second returned ${second.response.status}: ${second.text}`);

  const third = await jsonRequest("/api/account-profiles", accountProfilePayload("Starter profile three"));
  assert(third.response.status === 201, `/api/account-profiles starter third returned ${third.response.status}: ${third.text}`);

  const defaultSwitch = await request(`/api/account-profiles/${third.payload.profile.id}/set-default`, { method: "POST" });
  assert(defaultSwitch.response.ok, `/api/account-profiles/:id/set-default returned ${defaultSwitch.response.status}: ${defaultSwitch.text}`);

  const profiles = await request("/api/account-profiles");
  assert(profiles.response.ok, `/api/account-profiles after default switch returned ${profiles.response.status}: ${profiles.text}`);
  const defaultProfile = profiles.payload?.profiles?.find((profile) => profile.isDefault);
  assert(defaultProfile?.id === third.payload.profile.id, "default account profile was not switched");

  const blocked = await jsonRequest("/api/account-profiles", accountProfilePayload("Starter profile four"));
  assert(blocked.response.status === 409, `/api/account-profiles starter fourth returned ${blocked.response.status}, expected 409`);
}

async function checkFiveEntryGeneration(profile, savedTopic) {
  const generation = await jsonRequest("/api/generate/five-entry", {
    accountProfileId: profile.id,
    topicId: savedTopic?.id,
    topic,
    goal: "growth",
  });

  assert(generation.response.ok, `/api/generate/five-entry returned ${generation.response.status}: ${generation.text}`);
  assert(generation.payload?.project?.id, "generated project id missing");
  assert(Array.isArray(generation.payload.project.variants) && generation.payload.project.variants.length === 5, "five-entry variants missing");
  for (const variant of generation.payload.project.variants) {
    assertNoMojibake(variant.title, `${variant.entry} title`);
    assertNoMojibake(variant.body, `${variant.entry} body`);
    if (Array.isArray(variant.metadata?.imagePrompts)) {
      for (const [index, prompt] of variant.metadata.imagePrompts.entries()) {
        assertNoMojibake(prompt, `${variant.entry} image prompt ${index + 1}`);
      }
    }
  }

  const jobs = await request("/api/generation-jobs");
  assert(jobs.response.ok, `/api/generation-jobs returned ${jobs.response.status}: ${jobs.text}`);
  assert(Array.isArray(jobs.payload?.jobs) && jobs.payload.jobs.length >= 1, "generation job log missing");

  if (savedTopic?.id) {
    const topics = await request("/api/topics");
    assert(topics.response.ok, `/api/topics after generation returned ${topics.response.status}: ${topics.text}`);
    const refreshedTopic = topics.payload?.topics?.find((item) => item.id === savedTopic.id);
    assert(refreshedTopic?.status === "generated", "topic status was not updated after generation");
    assert((refreshedTopic?._count?.projects ?? 0) >= 1, "topic project count was not updated after generation");
  }

  return generation.payload;
}

async function checkFreeGenerationLimit(profile) {
  const blocked = await jsonRequest("/api/generate/five-entry", {
    accountProfileId: profile.id,
    topic: `${topic}\uff1a\u514d\u8d39\u989d\u5ea6\u56de\u5f52`,
    goal: "growth",
  });

  assert(blocked.response.status === 409, `/api/generate/five-entry second free generation returned ${blocked.response.status}, expected 409`);
}

async function checkComplianceReport(generated) {
  const variant =
    generated.project.variants.find((item) => item.entry === "wechat_article") ||
    generated.project.variants[0];

  assert(variant?.body, "generated variant body missing for compliance check");

  const check = await jsonRequest("/api/compliance/check", {
    projectId: generated.project.id,
    entry: variant.entry,
    title: variant.title,
    content: variant.body,
  });

  assert(check.response.ok, `/api/compliance/check returned ${check.response.status}: ${check.text}`);
  assert(check.payload?.report?.id, "compliance report id missing");
  assert(Array.isArray(check.payload?.issues), "compliance issues missing");

  const report = await request(`/api/compliance/reports/${check.payload.report.id}`);
  assert(report.response.ok, `/api/compliance/reports/:id returned ${report.response.status}: ${report.text}`);
  assert(report.payload?.report?.id === check.payload.report.id, "fetched compliance report id mismatch");
  assert(report.payload?.report?.project?.id === generated.project.id, "fetched compliance report project mismatch");
}

async function checkProjectEditingSave(generated) {
  const marker = `SMOKE_EDIT_${timestamp}`;
  const variants = generated.project.variants.map((variant) => {
    if (variant.entry === "wechat_article") {
      return {
        entry: variant.entry,
        title: variant.title,
        body: `${variant.body}\n\n${marker}`,
        metadata: {
          ...(variant.metadata || {}),
          html: `<h1>${variant.title}</h1><p>${marker}</p>`,
          editedAt: new Date().toISOString(),
        },
      };
    }

    if (variant.entry === "green_note") {
      return {
        entry: variant.entry,
        title: variant.title,
        body: `${variant.body}\n\n${marker} green note body`,
        metadata: {
          ...(variant.metadata || {}),
          pages: 3,
          imagePrompts: [`${marker} green note image prompt`],
          editedAt: new Date().toISOString(),
        },
      };
    }

    return {
      entry: variant.entry,
      title: variant.title,
      body: `${variant.body}\n\n${marker} ${variant.entry}`,
      metadata: {
        ...(variant.metadata || {}),
        editedAt: new Date().toISOString(),
      },
    };
  });

  const saved = await jsonRequest(
    `/api/projects/${generated.project.id}`,
    {
      title: generated.project.title,
      status: "editing",
      variants,
    },
    { method: "PATCH" },
  );

  assert(saved.response.ok, `/api/projects/:id PATCH returned ${saved.response.status}: ${saved.text}`);
  assert(saved.payload?.project?.status === "editing", "project status was not saved as editing");

  const fetched = await request(`/api/projects/${generated.project.id}`);
  assert(fetched.response.ok, `/api/projects/:id GET after save returned ${fetched.response.status}: ${fetched.text}`);

  const wechat = fetched.payload?.project?.variants?.find((variant) => variant.entry === "wechat_article");
  const greenNote = fetched.payload?.project?.variants?.find((variant) => variant.entry === "green_note");
  const search = fetched.payload?.project?.variants?.find((variant) => variant.entry === "search");
  const question = fetched.payload?.project?.variants?.find((variant) => variant.entry === "question");
  const moments = fetched.payload?.project?.variants?.find((variant) => variant.entry === "moments");

  assert(wechat?.body?.includes(marker), "saved wechat article body marker missing");
  assert(wechat?.metadata?.html?.includes(marker), "saved wechat article html metadata missing");
  assert(greenNote?.body?.includes(`${marker} green note body`), "saved green note body marker missing");
  assert(Array.isArray(greenNote?.metadata?.imagePrompts), "saved green note image prompts missing");
  assert(greenNote.metadata.imagePrompts.some((prompt) => String(prompt).includes(marker)), "saved green note image prompt marker missing");
  assert(search?.body?.includes(`${marker} search`), "saved search entry body marker missing");
  assert(question?.body?.includes(`${marker} question`), "saved question entry body marker missing");
  assert(moments?.body?.includes(`${marker} moments`), "saved moments entry body marker missing");
}

async function checkCalendarProjectSync(generated) {
  const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const publishedAt = new Date().toISOString();
  const created = await jsonRequest("/api/calendar-items", {
    projectId: generated.project.id,
    entry: "wechat_article",
    title: `${generated.project.title}\uff1a\u65e5\u5386\u56de\u5f52`,
    status: "ready",
    scheduledFor,
    note: "\u4ece\u5185\u5bb9\u9879\u76ee\u52a0\u5165\u65e5\u5386\u3002",
  });

  assert(created.response.status === 201, `/api/calendar-items returned ${created.response.status}: ${created.text}`);
  assert(created.payload?.item?.id, "calendar item id missing");
  assert(created.payload?.item?.accountProfile?.id, "calendar item did not inherit account profile from project");
  assert(created.payload?.item?.project?.status === "ready", "project status was not synced to ready from calendar item");

  const readyProject = await request(`/api/projects/${generated.project.id}`);
  assert(readyProject.response.ok, `/api/projects/:id after calendar ready returned ${readyProject.response.status}: ${readyProject.text}`);
  assert(readyProject.payload?.project?.status === "ready", "project status was not ready after calendar creation");

  const published = await jsonRequest(
    `/api/calendar-items/${created.payload.item.id}`,
    {
      status: "published",
      publishedAt,
    },
    { method: "PATCH" },
  );

  assert(published.response.ok, `/api/calendar-items/:id PATCH returned ${published.response.status}: ${published.text}`);
  assert(published.payload?.item?.status === "published", "calendar item status was not published");
  assert(published.payload?.item?.project?.status === "published", "project status was not synced to published from calendar item");

  const publishedProject = await request(`/api/projects/${generated.project.id}`);
  assert(publishedProject.response.ok, `/api/projects/:id after publish returned ${publishedProject.response.status}: ${publishedProject.text}`);
  assert(publishedProject.payload?.project?.status === "published", "project status was not published after calendar update");
  assert(publishedProject.payload?.project?.publishedAt, "project publishedAt missing after calendar publish");
}

async function checkProjectMetricsReview(generated) {
  const reviewNote = `SMOKE_REVIEW_${timestamp}`;
  const metric = await jsonRequest(`/api/projects/${generated.project.id}/metrics`, {
    entry: "wechat_article",
    readCount: 1280,
    likeCount: 36,
    watchCount: 12,
    favoriteCount: 18,
    commentCount: 9,
    followerGain: 7,
    consultationCount: 3,
    dealCount: 1,
    note: "\u624b\u52a8\u8bb0\u5f55\u516c\u4f17\u53f7\u53d1\u5e03\u540e\u6570\u636e\u3002",
    reviewNote,
    recordedAt: new Date().toISOString(),
  });

  assert(metric.response.status === 201, `/api/projects/:id/metrics returned ${metric.response.status}: ${metric.text}`);
  assert(metric.payload?.metric?.readCount === 1280, "project metric read count mismatch");

  const metrics = await request(`/api/projects/${generated.project.id}/metrics`);
  assert(metrics.response.ok, `/api/projects/:id/metrics GET returned ${metrics.response.status}: ${metrics.text}`);
  assert(Array.isArray(metrics.payload?.metrics) && metrics.payload.metrics.some((item) => item.id === metric.payload.metric.id), "project metric missing from list");

  const project = await request(`/api/projects/${generated.project.id}`);
  assert(project.response.ok, `/api/projects/:id after review returned ${project.response.status}: ${project.text}`);
  assert(project.payload?.project?.status === "reviewed", "project status was not reviewed after metric creation");
  assert(project.payload?.project?.reviewNote === reviewNote, "project review note was not saved");
}

async function checkTemplateAndCtaLibraries(profile) {
  const marker = `SMOKE_LIBRARY_${timestamp}`;
  const markerTag = `smoke-${String(timestamp).slice(-8)}`;
  const template = await jsonRequest("/api/content-templates", {
    accountProfileId: profile.id,
    title: `${marker} template`,
    category: "wechat_structure",
    entry: "wechat_article",
    content: "# Hook\n\n## Pain point\n\n## Solution\n\n## CTA",
    tags: [markerTag, "wechat"],
    active: true,
  });

  assert(template.response.status === 201, `/api/content-templates returned ${template.response.status}: ${template.text}`);
  assert(template.payload?.template?.id, "content template id missing");

  const foundTemplates = await request(`/api/content-templates?q=${encodeURIComponent(marker)}`);
  assert(foundTemplates.response.ok, `/api/content-templates search returned ${foundTemplates.response.status}: ${foundTemplates.text}`);
  assert(foundTemplates.payload?.templates?.some((item) => item.id === template.payload.template.id), "created template missing from search");

  const updatedTemplate = await jsonRequest(
    `/api/content-templates/${template.payload.template.id}`,
    { title: `${marker} template updated` },
    { method: "PATCH" },
  );
  assert(updatedTemplate.response.ok, `/api/content-templates/:id PATCH returned ${updatedTemplate.response.status}: ${updatedTemplate.text}`);
  assert(updatedTemplate.payload?.template?.title?.includes("updated"), "template update was not saved");

  const deletedTemplate = await request(`/api/content-templates/${template.payload.template.id}`, { method: "DELETE" });
  assert(deletedTemplate.response.status === 204, `/api/content-templates/:id DELETE returned ${deletedTemplate.response.status}`);
  const afterTemplateDelete = await request(`/api/content-templates?q=${encodeURIComponent(marker)}`);
  assert(!afterTemplateDelete.payload?.templates?.some((item) => item.id === template.payload.template.id), "deleted template is still visible");

  const cta = await jsonRequest("/api/cta-snippets", {
    accountProfileId: profile.id,
    title: `${marker} cta`,
    category: "lead_magnet",
    entry: "moments",
    content: "Reply with START and I will send you the checklist.",
    tags: [markerTag, "conversion"],
    active: true,
  });

  assert(cta.response.status === 201, `/api/cta-snippets returned ${cta.response.status}: ${cta.text}`);
  assert(cta.payload?.snippet?.id, "cta snippet id missing");

  const foundCtas = await request(`/api/cta-snippets?q=${encodeURIComponent(marker)}`);
  assert(foundCtas.response.ok, `/api/cta-snippets search returned ${foundCtas.response.status}: ${foundCtas.text}`);
  assert(foundCtas.payload?.snippets?.some((item) => item.id === cta.payload.snippet.id), "created CTA missing from search");

  const updatedCta = await jsonRequest(
    `/api/cta-snippets/${cta.payload.snippet.id}`,
    { content: "Reply with START and I will send you the updated checklist." },
    { method: "PATCH" },
  );
  assert(updatedCta.response.ok, `/api/cta-snippets/:id PATCH returned ${updatedCta.response.status}: ${updatedCta.text}`);
  assert(updatedCta.payload?.snippet?.content?.includes("updated checklist"), "CTA update was not saved");

  const deletedCta = await request(`/api/cta-snippets/${cta.payload.snippet.id}`, { method: "DELETE" });
  assert(deletedCta.response.status === 204, `/api/cta-snippets/:id DELETE returned ${deletedCta.response.status}`);
  const afterCtaDelete = await request(`/api/cta-snippets?q=${encodeURIComponent(marker)}`);
  assert(!afterCtaDelete.payload?.snippets?.some((item) => item.id === cta.payload.snippet.id), "deleted CTA is still visible");
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
  assert(imagePrompts.payload?.output?.source, "image prompt output source missing");
  assert(imagePrompts.payload?.output?.provider, "image prompt output provider missing");
  assert(imagePrompts.payload?.output?.model, "image prompt output model missing");
  assert(imagePrompts.payload.output.imageGenerationReady === false, "image prompt output should reserve but not enable image generation");
  assert(imagePrompts.payload.output.nextStep, "image prompt output missing future image-generation handoff note");
  for (const [index, prompt] of imagePrompts.payload.output.prompts.entries()) {
    assertNoMojibake(prompt, `image prompt output ${index + 1}`);
  }
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

async function checkSingleEntryGeneration(profile) {
  const checks = [
    { path: "/api/generate/wechat-article", entry: "wechat_article" },
    { path: "/api/generate/green-note", entry: "green_note" },
    { path: "/api/generate/search", entry: "search" },
    { path: "/api/generate/question", entry: "question" },
    { path: "/api/generate/moments", entry: "moments" },
  ];

  for (const check of checks) {
    const result = await jsonRequest(check.path, {
      accountProfileId: profile.id,
      topic: `${topic}\uff1a${check.entry} 单入口回归`,
      goal: "trust",
    });

    assert(result.response.ok, `${check.path} returned ${result.response.status}: ${result.text}`);
    assert(result.payload?.variant?.entry === check.entry, `${check.path} returned the wrong entry`);
    assert(result.payload?.project?.id, `${check.path} project id missing`);
    assert(Array.isArray(result.payload.project.variants) && result.payload.project.variants.length === 5, `${check.path} did not preserve full five-entry project`);
    assertNoMojibake(result.payload.variant.title, `${check.entry} single-entry title`);
    assertNoMojibake(result.payload.variant.body, `${check.entry} single-entry body`);
  }
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
  assert(pricing.payload?.plans?.some((plan) => plan.code === "starter" && plan.priceCents === 9900), "starter pricing update missing");
  assert(pricing.payload?.versions?.some((version) => version.planCode === "starter"), "starter pricing version missing");

  const entitlements = await jsonRequest(
    "/api/admin/entitlements",
    {
      plans: {
        pro: {
          name: "\u4e13\u4e1a\u7248",
          description: "Smoke test pro entitlement plan",
          priceCents: null,
          accountProfileLimit: 10,
          dailyGenerationLimit: null,
          monthlyGenerationLimit: 300,
          advancedChecks: true,
        },
      },
    },
    { method: "PATCH" },
  );

  assert(entitlements.response.ok, `/api/admin/entitlements returned ${entitlements.response.status}: ${entitlements.text}`);
  assert(entitlements.payload?.plans?.some((plan) => plan.code === "pro" && plan.accountProfileLimit === 10 && plan.monthlyGenerationLimit === 300), "pro entitlement update missing");
  assert(entitlements.payload?.versions?.some((version) => version.planCode === "pro"), "pro entitlement version missing");

  const adminPricing = await request("/api/admin/pricing");
  assert(adminPricing.response.ok, `/api/admin/pricing GET returned ${adminPricing.response.status}: ${adminPricing.text}`);
  assert(adminPricing.payload?.plans?.some((plan) => plan.code === "starter" && plan.priceCents === 9900), "admin pricing GET did not return starter price");
  assert(adminPricing.payload?.plans?.some((plan) => plan.code === "pro" && plan.monthlyGenerationLimit === 300), "admin pricing GET did not return pro quota");

  const publicPlans = await request("/api/billing/plans");
  assert(publicPlans.response.ok, `/api/billing/plans returned ${publicPlans.response.status}: ${publicPlans.text}`);
  assert(publicPlans.payload?.plans?.some((plan) => plan.code === "starter" && plan.priceCents === 9900), "public billing plans did not return starter price");
  assert(publicPlans.payload?.plans?.some((plan) => plan.code === "pro" && plan.monthlyGenerationLimit === 300), "public billing plans did not return pro quota");
  return true;
}

async function checkAdminSettingsFlow() {
  const providerName = `smoke-provider-${timestamp}`;
  const provider = await jsonRequest(
    "/api/admin/ai-providers",
    {
      name: providerName,
      type: "openai-compatible",
      baseUrl: "https://example-model-router.com/v1",
      apiKeyRef: "AI_OPENAI_COMPATIBLE_API_KEY",
      active: true,
      models: ["content", "topic", "rewrite", "image"].map((purpose) => ({
        name: `smoke ${purpose}`,
        modelId: `smoke-${purpose}-model`,
        purpose,
        active: true,
      })),
    },
    { method: "PATCH" },
  );

  assert(provider.response.ok, `/api/admin/ai-providers PATCH returned ${provider.response.status}: ${provider.text}`);
  assert(provider.payload?.provider?.name === providerName, "AI provider name was not saved");
  assert(Array.isArray(provider.payload?.provider?.models) && provider.payload.provider.models.length === 4, "AI provider models were not saved");

  const providerStatus = await request("/api/admin/ai-providers");
  assert(providerStatus.response.ok, `/api/admin/ai-providers GET returned ${providerStatus.response.status}: ${providerStatus.text}`);
  assert(providerStatus.payload?.provider?.baseUrlConfigured === true, "AI provider base URL status missing");
  assert(providerStatus.payload?.provider?.apiKeyRef === "AI_OPENAI_COMPATIBLE_API_KEY", "AI provider apiKeyRef mismatch");
  assert(["content", "topic", "rewrite", "image"].every((purpose) => providerStatus.payload?.provider?.models?.some((model) => model.purpose === purpose)), "AI provider purpose models missing");

  const promptContent = [
    `Smoke prompt ${timestamp}`,
    "账号：{{accountName}}",
    "内容：{{content}}",
    "请保持微信创作者语气，不要承诺收益、排名或审核通过。",
  ].join("\n");
  const prompt = await jsonRequest(
    "/api/admin/prompts",
    {
      prompts: {
        ai_tone_rewrite: {
          content: promptContent,
        },
      },
    },
    { method: "PATCH" },
  );

  assert(prompt.response.ok, `/api/admin/prompts PATCH returned ${prompt.response.status}: ${prompt.text}`);
  assert(prompt.payload?.prompts?.[0]?.key === "ai_tone_rewrite", "prompt update key mismatch");

  const prompts = await request("/api/admin/prompts");
  assert(prompts.response.ok, `/api/admin/prompts GET returned ${prompts.response.status}: ${prompts.text}`);
  assert(prompts.payload?.prompts?.some((item) => item.key === "ai_tone_rewrite" && item.content.includes(`Smoke prompt ${timestamp}`)), "updated prompt missing from active prompts");

  const paymentSettings = await request("/api/admin/payment-settings");
  assert(paymentSettings.response.ok, `/api/admin/payment-settings returned ${paymentSettings.response.status}: ${paymentSettings.text}`);
  assert(Array.isArray(paymentSettings.payload?.providers) && paymentSettings.payload.providers.length === 2, "payment settings provider status missing");
  assert(paymentSettings.payload.providers.some((item) => item.provider === "wechat"), "wechat payment status missing");
  assert(paymentSettings.payload.providers.some((item) => item.provider === "alipay"), "alipay payment status missing");
  assertNoMojibake(paymentSettings.payload?.message, "payment settings message");
  for (const provider of paymentSettings.payload.providers) {
    assertNoMojibake(provider.label, `${provider.provider} payment label`);
    assertNoMojibake(provider.checkoutMode, `${provider.provider} payment checkout mode`);
    for (const item of [...(provider.required || []), ...(provider.callbackRequired || []), ...(provider.optional || [])]) {
      assertNoMojibake(item.purpose, `${provider.provider} payment env purpose ${item.key}`);
    }
  }
}

async function checkAdminOperationsFlow(current) {
  const operations = await request("/api/admin/operations");
  assert(operations.response.ok, `/api/admin/operations returned ${operations.response.status}: ${operations.text}`);
  assert(Array.isArray(operations.payload?.users), "admin operations users list missing");
  assert(Array.isArray(operations.payload?.workspaces), "admin operations workspaces list missing");
  assert(Array.isArray(operations.payload?.orders), "admin operations orders list missing");
  assert(typeof operations.payload?.usage?.generation?.weekly === "number", "admin operations usage summary missing");

  const risk = await jsonRequest("/api/admin/operations", {
    action: "risk_update",
    workspaceId: current.workspace.id,
    riskStatus: "watch",
    riskNote: "smoke risk watch",
  });
  assert(risk.response.ok, `/api/admin/operations risk_update returned ${risk.response.status}: ${risk.text}`);
  assert(risk.payload?.workspace?.riskStatus === "watch", "risk status was not updated");

  const manualComp = await jsonRequest("/api/admin/operations", {
    action: "manual_comp",
    workspaceId: current.workspace.id,
    planCode: "pro",
    note: "smoke manual comp",
  });
  assert(manualComp.response.ok, `/api/admin/operations manual_comp returned ${manualComp.response.status}: ${manualComp.text}`);
  assert(manualComp.payload?.order?.status === "paid", "manual compensation did not create a paid order");
  assert(manualComp.payload?.order?.provider === "manual", "manual compensation provider mismatch");

  const refund = await jsonRequest("/api/admin/operations", {
    action: "refund_order",
    orderId: manualComp.payload.order.id,
    note: "smoke refund marker",
  });
  assert(refund.response.ok, `/api/admin/operations refund_order returned ${refund.response.status}: ${refund.text}`);
  assert(refund.payload?.order?.status === "refunded", "refund marker did not update order status");

  const restoredRisk = await jsonRequest("/api/admin/operations", {
    action: "risk_update",
    workspaceId: current.workspace.id,
    riskStatus: "normal",
    riskNote: null,
  });
  assert(restoredRisk.response.ok, `/api/admin/operations restore risk returned ${restoredRisk.response.status}: ${restoredRisk.text}`);
  assert(restoredRisk.payload?.workspace?.riskStatus === "normal", "risk status was not restored");
}

async function checkPaymentFlow() {
  const order = await jsonRequest("/api/billing/orders", {
    planCode: "starter",
    provider: "wechat",
  });

  assert(order.response.ok, `/api/billing/orders returned ${order.response.status}: ${order.text}`);
  assert(order.payload?.order?.id, "payment order id missing");
  assert(order.payload.order.amountCents === 9900, "payment order amount mismatch");
  assertNoMojibake(order.payload?.order?.checkout?.instructions, "wechat checkout instructions");

  const callback = await paymentCallbackRequest("/api/billing/callback/wechat", "wechat", {
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
    email: normalizedEmail,
  };
  const invoice = await jsonRequest("/api/billing/invoices", invoicePayload);
  assert(invoice.response.status === 201, `/api/billing/invoices returned ${invoice.response.status}: ${invoice.text}`);
  assert(invoice.payload?.invoice?.paymentOrderId === order.payload.order.id, "invoice request payment order mismatch");

  const duplicateInvoice = await jsonRequest("/api/billing/invoices", invoicePayload);
  assert(duplicateInvoice.response.status === 409, `/api/billing/invoices duplicate returned ${duplicateInvoice.response.status}, expected 409`);

  const issuedInvoice = await jsonRequest(
    `/api/billing/invoices/${invoice.payload.invoice.id}`,
    { status: "issued" },
    { method: "PATCH" },
  );
  assert(issuedInvoice.response.ok, `/api/billing/invoices/:id issued returned ${issuedInvoice.response.status}: ${issuedInvoice.text}`);
  assert(issuedInvoice.payload?.invoice?.status === "issued", "invoice was not marked issued");
  assert(issuedInvoice.payload?.invoice?.issuedAt, "issued invoice missing issuedAt");

  const duplicateIssuedInvoice = await jsonRequest("/api/billing/invoices", invoicePayload);
  assert(duplicateIssuedInvoice.response.status === 409, `/api/billing/invoices duplicate issued returned ${duplicateIssuedInvoice.response.status}, expected 409`);

  const cancelledInvoice = await jsonRequest(
    `/api/billing/invoices/${invoice.payload.invoice.id}`,
    { status: "cancelled" },
    { method: "PATCH" },
  );
  assert(cancelledInvoice.response.ok, `/api/billing/invoices/:id cancelled returned ${cancelledInvoice.response.status}: ${cancelledInvoice.text}`);
  assert(cancelledInvoice.payload?.invoice?.status === "cancelled", "invoice was not cancelled");
  assert(cancelledInvoice.payload?.invoice?.issuedAt === null, "cancelled invoice should clear issuedAt");

  const recreatedInvoice = await jsonRequest("/api/billing/invoices", invoicePayload);
  assert(recreatedInvoice.response.status === 201, `/api/billing/invoices after cancellation returned ${recreatedInvoice.response.status}: ${recreatedInvoice.text}`);
  const duplicateRecreatedInvoice = await jsonRequest("/api/billing/invoices", invoicePayload);
  assert(duplicateRecreatedInvoice.response.status === 409, `/api/billing/invoices duplicate recreated returned ${duplicateRecreatedInvoice.response.status}, expected 409`);
}

async function checkAlipayPaymentFlow() {
  const order = await jsonRequest("/api/billing/orders", {
    planCode: "starter",
    provider: "alipay",
  });

  assert(order.response.ok, `/api/billing/orders alipay returned ${order.response.status}: ${order.text}`);
  assert(order.payload?.order?.id, "alipay payment order id missing");
  assert(order.payload.order.amountCents === 9900, "alipay payment order amount mismatch");
  assertNoMojibake(order.payload?.order?.checkout?.instructions, "alipay checkout instructions");

  const callback = await paymentCallbackRequest("/api/billing/callback/alipay", "alipay", {
    orderId: order.payload.order.id,
    paid: true,
    amountCents: 9900,
    tradeNo: `SMOKE_ALIPAY_${timestamp}`,
    providerOrderId: `SMOKE_ALIPAY_PROVIDER_${timestamp}`,
  });

  assert(callback.response.ok, `/api/billing/callback/alipay returned ${callback.response.status}: ${callback.text}`);
  assert(callback.text === "success", "alipay callback did not return success");

  const refreshed = await request(`/api/billing/orders/${order.payload.order.id}`);
  assert(refreshed.response.ok, `/api/billing/orders/:id alipay returned ${refreshed.response.status}: ${refreshed.text}`);
  assert(refreshed.payload?.order?.status === "paid", "alipay payment order was not marked paid");
  assert(Array.isArray(refreshed.payload.order.callbacks) && refreshed.payload.order.callbacks.length >= 1, "alipay callback diagnostic missing");
}

async function checkPaymentFailureFlow() {
  const order = await jsonRequest("/api/billing/orders", {
    planCode: "starter",
    provider: "wechat",
  });

  assert(order.response.ok, `/api/billing/orders for failed callback returned ${order.response.status}: ${order.text}`);
  assert(order.payload?.order?.id, "failed-payment order id missing");

  const callback = await paymentCallbackRequest("/api/billing/callback/wechat", "wechat", {
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

  const recovery = await paymentCallbackRequest("/api/billing/callback/wechat", "wechat", {
    orderId: order.payload.order.id,
    paid: true,
    amountCents: 9900,
    tradeNo: `SMOKE_FAILED_RECOVERY_${timestamp}`,
    providerOrderId: `SMOKE_FAILED_RECOVERY_PROVIDER_${timestamp}`,
    status: "SUCCESS",
  });
  assert(recovery.response.status >= 400, `/api/billing/callback/wechat failed-order recovery returned ${recovery.response.status}, expected failure`);

  const afterRecovery = await request(`/api/billing/orders/${order.payload.order.id}`);
  assert(afterRecovery.response.ok, `/api/billing/orders/:id after failed-order recovery returned ${afterRecovery.response.status}: ${afterRecovery.text}`);
  assert(afterRecovery.payload?.order?.status === "failed", "failed payment order was revived by a later paid callback");
}

async function checkPaymentAmountMismatchFlow() {
  const order = await jsonRequest("/api/billing/orders", {
    planCode: "starter",
    provider: "wechat",
  });

  assert(order.response.ok, `/api/billing/orders for mismatch callback returned ${order.response.status}: ${order.text}`);
  assert(order.payload?.order?.id, "amount-mismatch order id missing");

  const callback = await paymentCallbackRequest("/api/billing/callback/wechat", "wechat", {
    orderId: order.payload.order.id,
    paid: true,
    amountCents: 1,
    tradeNo: `SMOKE_MISMATCH_${timestamp}`,
    providerOrderId: `SMOKE_MISMATCH_PROVIDER_${timestamp}`,
    status: "SUCCESS",
  });

  assert(callback.response.status >= 400, `/api/billing/callback/wechat mismatch returned ${callback.response.status}, expected failure`);

  const refreshed = await request(`/api/billing/orders/${order.payload.order.id}`);
  assert(refreshed.response.ok, `/api/billing/orders/:id for mismatch callback returned ${refreshed.response.status}: ${refreshed.text}`);
  assert(refreshed.payload?.order?.status === "failed", "payment order was not marked failed after amount mismatch");
  assert(Array.isArray(refreshed.payload.order.callbacks) && refreshed.payload.order.callbacks.length >= 1, "amount mismatch callback diagnostic missing");
}

async function checkStalePaymentSmokeSignature() {
  if (!paymentCallbackSmokeSecret) {
    return;
  }

  const order = await jsonRequest("/api/billing/orders", {
    planCode: "starter",
    provider: "wechat",
  });

  assert(order.response.ok, `/api/billing/orders for stale signature returned ${order.response.status}: ${order.text}`);
  assert(order.payload?.order?.id, "stale-signature order id missing");

  const staleSignedAt = (Math.floor(Date.now() / 1000) - 3600).toString();
  const callback = await paymentCallbackRequest(
    "/api/billing/callback/wechat",
    "wechat",
    {
      orderId: order.payload.order.id,
      paid: true,
      amountCents: 9900,
      tradeNo: `SMOKE_STALE_${timestamp}`,
      providerOrderId: `SMOKE_STALE_PROVIDER_${timestamp}`,
      status: "SUCCESS",
    },
    { signedAt: staleSignedAt },
  );

  assert(callback.response.status === 401, `/api/billing/callback/wechat stale signature returned ${callback.response.status}, expected 401`);

  const refreshed = await request(`/api/billing/orders/${order.payload.order.id}`);
  assert(refreshed.response.ok, `/api/billing/orders/:id for stale signature returned ${refreshed.response.status}: ${refreshed.text}`);
  assert(refreshed.payload?.order?.status === "pending", "stale payment callback changed the order status");
}

async function main() {
  console.log(`Running app smoke checks against ${baseUrl}`);
  await checkDashboardRequiresValidSession();
  await checkAuthPagesIgnoreInvalidSessionCookie();
  const current = await registerAndCheckSession();
  await checkEmailVerification(current);
  await checkAuthRejections();
  await checkLoginRateLimit();
  const profile = await checkAccountProfiles();
  await checkDashboardOperatingView();
  await checkEditorFiveEntryView();
  await checkFiveEntryGeneratorView();
  await checkBillingWorkbenchView();
  await checkQueuedGenerationScopeRejection();
  await checkFreeAccountProfileLimit();
  const savedTopic = await checkManualTopicCreation(profile);
  const generated = await checkFiveEntryGeneration(profile, savedTopic);
  await checkTemplateAndCtaLibraries(profile);
  await checkFreeGenerationLimit(profile);
  await checkComplianceReport(generated);
  await checkProjectEditingSave(generated);
  await checkCalendarProjectSync(generated);
  await checkProjectMetricsReview(generated);
  const canCheckPayment = await configurePricingIfAdmin(current);

  if (canCheckPayment) {
    await checkAdminSettingsFlow();
    await checkPaymentFlow();
    await checkAlipayPaymentFlow();
    await checkPaymentFailureFlow();
    await checkPaymentAmountMismatchFlow();
    await checkStalePaymentSmokeSignature();
    await checkStarterAccountProfileLimit();
    await checkQueuedGeneration(profile);
    await checkSingleEntryGeneration(profile);
    await checkTopicSuggestions(profile);
    await checkImagePrompts();
    await checkRewrite(profile, generated);
    await checkAdminOperationsFlow(current);
  }

  await checkPasswordResetFlow();
  await checkLogoutAndReloginFlow();

  console.log("App smoke checks passed.");
  console.log(`Smoke email: ${normalizedEmail}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
