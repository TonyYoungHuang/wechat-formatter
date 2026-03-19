# Prelaunch TODO

Updated: 2026-03-18

This file is the single checklist for launch-blocking work that is still pending.

If you need the current freeze-state summary during ICP waiting, read `LAUNCH_FREEZE_HANDOFF.md` first.

## 1. Domain and deployment

- Production domain purchased: `paibanmao.cn`
- Brand name confirmed: `排版猫`
- ICP filing has been submitted on Tencent Cloud and is currently pending.
- Estimated ICP review window: 2-3 days.
- Decide the final deploy shape:
  - `https://paibanmao.cn`
  - or `https://paibanmao.cn` + `https://api.paibanmao.cn`
- Enable public HTTPS for the production callback domain.
- If deploying in mainland China, prepare ICP filing before public launch.
- Fill production env values:
  - `NODE_ENV=production`
  - `AUTH_SECRET`
  - `ADMIN_API_KEY`
  - `CORS_ORIGINS`
  - `PAYMENT_NOTIFY_BASE_URL`
  - `ALLOW_MOCK_PAYMENTS=false`

Current recommendation:
- Main site: `https://paibanmao.cn`
- API and payment callback: `https://api.paibanmao.cn`

## 2. WeChat Pay live integration

Current status:
- WeChat Pay onboarding is blocked until the ICP filing is approved.
- The platform is asking for the full MIIT filing materials before the merchant onboarding can continue.

Platform-side actions:
- Open a mainland WeChat Pay merchant account.
- Enable `Native Pay`.
- Bind a valid `AppID` to the merchant account.
- Prepare:
  - `WECHAT_PAY_APP_ID`
  - `WECHAT_PAY_MCH_ID`
  - `WECHAT_PAY_MCH_SERIAL_NO`
  - `WECHAT_PAY_PRIVATE_KEY_PEM`
  - `WECHAT_PAY_API_V3_KEY`
  - `WECHAT_PAY_PLATFORM_CERT_SERIAL`
  - `WECHAT_PAY_PLATFORM_CERT_PEM` or `WECHAT_PAY_PLATFORM_PUBLIC_KEY_PEM`
- Make sure the callback domain is public and reachable.

Project-side actions:
- Put the real WeChat env values into `.env`.
- Create one monthly live order.
- Complete one real WeChat payment.
- Verify callback signature, order status, and VIP activation.
- Verify duplicate callback does not duplicate subscription grant.

## 3. Alipay live integration

Current status:
- Alipay live onboarding is also blocked until the ICP filing is approved.
- The platform-side payment application process cannot be completed before the filing result is available.

Platform-side actions:
- Create a mainland Alipay Open Platform payment app.
- Enable the QR-code payment path used by `alipay.trade.precreate`.
- Prepare:
  - `ALIPAY_APP_ID`
  - `ALIPAY_PRIVATE_KEY_PEM`
  - `ALIPAY_PUBLIC_KEY_PEM`
  - `ALIPAY_NOTIFY_BASE_URL` if needed
- Complete app review and live availability.

Project-side actions:
- Put the real Alipay env values into `.env`.
- Create one yearly live order.
- Complete one real Alipay payment.
- Verify async notification, order status, VIP activation, and subscription expiry.
- Verify invalid signature callback is rejected.

## 4. Tencent Hunyuan live integration

Current status:
- Tencent Hunyuan is the launch-default AI image provider and can continue now.
- JiMeng stays reserved in code and is not the launch-default provider.
- The project now uses the Tencent Cloud `TC3-HMAC-SHA256` signing flow instead of the old mock placeholder request shape.

Platform-side actions:
- Open the Tencent Hunyuan image-generation access you plan to use.
- Confirm the credential type is Tencent Cloud `SecretId / SecretKey`.
- Confirm the final region, style, and resolution you want to launch with.
- Prepare:
  - `AI_IMAGE_PROVIDER=tencent-hunyuan`
  - `TENCENT_HUNYUAN_SECRET_ID`
  - `TENCENT_HUNYUAN_SECRET_KEY`
  - `TENCENT_HUNYUAN_SESSION_TOKEN` if using temporary credentials
  - `TENCENT_HUNYUAN_IMAGE_ENDPOINT=https://hunyuan.tencentcloudapi.com`
  - `TENCENT_HUNYUAN_REGION`
  - `TENCENT_HUNYUAN_IMAGE_STYLE`
  - `TENCENT_HUNYUAN_IMAGE_SIZE`
  - `TENCENT_HUNYUAN_IMAGE_LOGO_ADD`

Project-side actions:
- Put the real Tencent Hunyuan env values into `.env`.
- Prefer starting from `.env.production.example`.
- Use `TENCENT_HUNYUAN_LIVE_PREP.md` as the single source of truth for the final env template.
- Run one live cover-generation request for WeChat content.
- Run one live cover-generation request for Xiaohongshu content.
- Verify each live request returns exactly `1` image.
- Verify free quota decreases by `1` per live request.
- Verify VIP daily quota decreases by `1` per live request.
- Verify image URL returns usable images in the UI.
- Verify timeout/retry/error fallback still behaves correctly.

## 5. Final launch acceptance

- Register a brand-new account.
- Log in successfully.
- Paste content and format it on both platforms.
- Export final HTML.
- Generate live AI covers.
- Complete one live payment.
- Confirm VIP features unlock.
- Confirm subscription expiry is correct.
- Check `/api/health` and `/api/health/ready`.
- Run `npm run check`.

Blocking note:
- Live payment acceptance cannot be finished before the ICP filing is approved and the WeChat/Alipay onboarding resumes.

## 6. Work intentionally deferred

- Advanced operations dashboard.
- Template management backend.
- Full works publishing system.
- Coupon, invoice, refund, and auto-renew.
- Full CI/CD and alerting stack.
