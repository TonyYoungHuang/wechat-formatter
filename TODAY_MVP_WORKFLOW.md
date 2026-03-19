# Today MVP Workflow

Updated: 2026-03-18

This is the recommended order for today so engineering work and platform-side setup can move in parallel.

## 1. Morning: continue local engineering

- Confirm current build and server checks pass.
- Keep the current MVP path fixed on:
  - auth and account safety
  - live payment integration
  - live JiMeng integration
- Use `npm run check` for code verification.
- Use `npm run ready:pre-icp` to see which production env values are still missing before ICP approval.
- Use `npm run ready:full` after ICP approval to check the full launch requirement set.

## 2. Afternoon: user-side platform operations

- Domain already purchased: `paibanmao.cn`
- Brand name confirmed: `排版猫`
- ICP filing already submitted on Tencent Cloud and currently pending review.
- Live WeChat Pay and Alipay onboarding are currently blocked by the pending ICP filing result.
- Decide final callback domain and deployment structure:
  - main site: `https://paibanmao.cn`
  - API/callback domain: `https://api.paibanmao.cn`
- Prepare HTTPS availability for the callback domain.
- Open or finish:
  - JiMeng / Volcengine LAS API key
- Collect the real production env values.

## 3. After env values are ready

- Fill the local `.env`.
- Run `npm run ready`.
- Fix any missing env groups.
- Complete one live JiMeng image-generation request.

Deferred until ICP approval:
- complete live WeChat Pay onboarding
- complete live Alipay onboarding
- run live payment callback verification

## 4. Final acceptance for MVP

- New user can register and log in.
- Payment completes and grants VIP.
- JiMeng returns live images in the UI.
- Export still works.
- `/api/health` returns healthy status.
- `/api/health/ready` returns ready status.

## 5. Files to use today

- `PRELAUNCH_TODO.md`
- `MVP_LAUNCH_PLAN.md`
- `DEVELOPMENT_PROGRESS.md`
- `.env.example`
- `.env.production.example`
- `MEMBERSHIP_PRICING_PLAN.md`
- `TENCENT_HUNYUAN_LIVE_PREP.md`
