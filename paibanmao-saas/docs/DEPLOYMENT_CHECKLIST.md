# Paibanmao SaaS Deployment Checklist

This checklist is for the first paid beta of Paibanmao. It focuses on the parts that can block revenue: database, Redis queue, AI routing, pricing, payment callbacks, and SEO discovery.

## 1. Required Services

- PostgreSQL is reachable from `DATABASE_URL`.
- Redis is reachable from `REDIS_URL`.
- The app can run `pnpm db:deploy` successfully.
- The app can run `pnpm prisma:seed` on a fresh environment.
- `/api/health` returns `200` after database and Redis are available.

## 2. Core Environment Variables

- `APP_URL` uses the real public HTTPS domain, for example `https://paibanmao.cn`.
- `AUTH_SECRET` is a long random value and is different from local development.
- `SITE_ADMIN_EMAIL` or `SITE_ADMIN_EMAILS` contains the admin account email.
- `GENERATION_QUEUE_CONCURRENCY` is set based on AI budget and Redis capacity.

## 3. AI Provider

- `AI_OPENAI_COMPATIBLE_BASE_URL` points to the selected model router.
- `AI_OPENAI_COMPATIBLE_API_KEY` is configured in the hosting provider.
- Admin Settings has at least four active model purposes:
  - `content`
  - `topic`
  - `rewrite`
  - `image`
- App smoke confirms admins can save and read OpenAI-compatible provider configuration.
- App smoke confirms admins can update prompt templates.
- Test these flows after login:
  - Save a manual topic and generate a five-entry content project from it.
  - Generate topic suggestions.
  - Generate a five-entry content project.
  - Save edited WeChat article HTML and green-note image prompts back to a project.
  - Use the editor to lower AI tone.
  - Generate green-note image prompts.
  - Save and fetch a compliance report for a generated project.
  - Add a project to the content calendar and mark it published.
  - Record project metrics and confirm the project moves to reviewed.
  - Create, search, update, and archive a content template and CTA snippet.

## 4. Pricing And Quotas

- Admin Billing has configured non-null positive prices for paid plans before enabling purchase buttons.
- App smoke confirms admin pricing and entitlement updates create version records.
- App smoke confirms `/api/billing/plans` returns the updated public price and quota values.
- Free plan keeps low trial quota.
- App smoke confirms the second free five-entry generation is rejected.
- Starter and Pro account-profile limits match the product plan.
- App smoke confirms free users cannot create a second account profile.
- App smoke confirms Starter can create up to three account profiles and rejects the fourth.
- Daily or monthly generation quotas match expected AI cost.
- Pricing page shows the same values as admin configuration.

## 5. Payment

### WeChat Pay

- `WECHAT_PAY_APP_ID`
- `WECHAT_PAY_MCH_ID`
- `WECHAT_PAY_MCH_SERIAL_NO`
- `WECHAT_PAY_PRIVATE_KEY_PEM`
- `WECHAT_PAY_API_V3_KEY`
- `WECHAT_PAY_PLATFORM_CERT_PEM`
- WeChat merchant dashboard callback URL:
  - `${APP_URL}/api/billing/callback/wechat`

### Alipay

- `ALIPAY_APP_ID`
- `ALIPAY_PRIVATE_KEY_PEM`
- `ALIPAY_PUBLIC_KEY_PEM`
- Optional sandbox or production gateway:
  - `ALIPAY_GATEWAY_URL`
- Alipay callback URL:
  - `${APP_URL}/api/billing/callback/alipay`

### Payment Smoke Tests

- Confirm admin payment settings returns WeChat Pay and Alipay configuration status without secret values.
- Create a WeChat order from `/dashboard/billing`.
- Create an Alipay order from `/dashboard/billing`.
- Confirm callback records are created.
- Confirm WeChat paid callback changes order status to `paid`.
- Confirm Alipay paid callback changes order status to `paid`.
- Confirm failed or mismatched callback changes unpaid order status to `failed`.
- Confirm paid callback with the wrong amount is rejected and does not mark the order paid.
- Confirm paid callback updates workspace plan and subscription.
- Confirm paid order can be selected for invoice request.
- Confirm duplicate active invoice requests for the same paid order are rejected.

## 6. Public Growth Pages

- `/` loads and links to register and free tools.
- `/pricing` shows current backend pricing.
- `/tools/topic-generator` allows one anonymous preview.
- Anonymous tool previews are limited by both cookie and Redis-backed visitor fingerprint when Redis is available.
- `/tools/compliance-checker` carries preview content into signup.
- Public tool pages include usage steps, FAQ content, and FAQPage structured data.
- `/tutorials` and tutorial detail pages are indexed in `/sitemap.xml`.
- `/robots.txt` allows public pages and disallows `/dashboard`.

## 7. Release Commands

Run before deployment:

```bash
pnpm check:env
pnpm lint
pnpm build
pnpm prisma validate
```

`pnpm check:env` verifies required deployment variables without printing secret values. In production it requires HTTPS `APP_URL`, Redis, AI provider credentials, admin email, and complete WeChat Pay / Alipay checkout and callback configuration.

Run after the app is started:

```bash
pnpm smoke:public
pnpm smoke:app
```

`pnpm smoke:app` expects a running app with database access. It registers a smoke user, checks the starter account profile, runs five-entry generation, and verifies generation job logging. To include admin pricing, payment callback, topic generation, image prompt, and rewrite checks, start the app with `SITE_ADMIN_EMAIL` set to the smoke email, or pass a fixed `SMOKE_EMAIL`; set `SMOKE_REQUIRE_ADMIN=1` when this part must not be skipped.

When testing payment callbacks against a local production server (`APP_URL` on `localhost` or `127.0.0.1`), set the same `PAYMENT_CALLBACK_SMOKE_SECRET` on the server and `pnpm smoke:app` process so smoke callbacks are signed without using real payment platform certificates.

The app smoke also checks invalid dashboard sessions, duplicate registration rejection, wrong-password rejection, logout session revocation, admin AI/prompt/payment settings, topic-to-generation status sync, free generation quota, account-profile plan limits, default account-profile switching, queued generation scope rejection, queued generation fallback, single-entry generation endpoints, editor project save, calendar project sync, project metrics review, template/CTA libraries, compliance report save/fetch, failed callbacks, failed-order recovery rejection, amount-mismatch callbacks, and duplicate invoice prevention.

Run during deployment:

```bash
pnpm db:deploy
pnpm prisma:seed
```

## 8. Post-Launch Monitoring

- Watch payment callback failures.
- Watch generation job failure rate.
- Watch AI token usage and quota consumption.
- Watch free-tool preview to signup conversion.
- Review search traffic for tool and tutorial pages weekly.
