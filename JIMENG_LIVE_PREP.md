# JiMeng Reserved Provider Notes

Updated: 2026-03-18

This file keeps the reserved JiMeng provider notes.
JiMeng stays in the codebase, but Tencent Hunyuan is the launch-default provider.

## 1. Reserved provider status

- JiMeng is not the launch-default provider.
- It remains available for later enablement or A/B testing.

## 2. What you need from Volcengine

- `JIMENG_API_KEY`
- `JIMENG_API_URL`
- `JIMENG_IMAGE_MODEL`
- `JIMENG_IMAGE_SIZE`
- `JIMENG_IMAGE_WATERMARK`

## 3. Where to get it

- Log in to Volcengine LAS console.
- Go to `Resource Management > API Key Management`.
- Create a live API key.
- Confirm the final image-generation base URL for your account region.
- Confirm which model you want to use in production.

## 4. Where to fill it locally

- Copy `.env.production.example` to your local `.env`.
- Fill the JiMeng fields.
- Keep payment fields empty until ICP approval unblocks payment onboarding.

## 5. Local commands before live test

- `npm run ready:pre-icp`
- `npm run check`

## 6. Expected result of the live JiMeng test

- The right-side cover panel should return live image URLs.
- The UI should keep showing normal fallback errors if the provider times out.
- VIP gating must still work.
- WeChat content and Xiaohongshu content should both generate usable covers.

## 7. Acceptance examples

- WeChat article:
  - long-form title
  - 4-6 paragraphs of content
- Xiaohongshu note:
  - short title
  - short body with lifestyle tone

## 8. Current blocker status

- JiMeng live test is not blocked by ICP.
- WeChat Pay and Alipay live test are blocked by ICP and should stay deferred.
