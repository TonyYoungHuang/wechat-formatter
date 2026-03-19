# Tencent Hunyuan Live Prep

Updated: 2026-03-18

This file is the launch-facing Tencent Hunyuan handoff doc.

## 1. Current launch rule

- Launch default provider: `Tencent Hunyuan`
- Reserved provider in codebase: `JiMeng`
- One live generation request returns: `1 image`
- Free quota: `10 lifetime uses`
- VIP quota: `3 uses per day`
- Current implementation mode: `Tencent Cloud TC3-HMAC-SHA256 signed request`

## 2. Real env template

Fill the Tencent section in `.env.production.example` or the real production `.env` with the values below:

```env
AI_IMAGE_PROVIDER=tencent-hunyuan
TENCENT_HUNYUAN_SECRET_ID=
TENCENT_HUNYUAN_SECRET_KEY=
TENCENT_HUNYUAN_SESSION_TOKEN=
TENCENT_HUNYUAN_IMAGE_ENDPOINT=https://hunyuan.tencentcloudapi.com
TENCENT_HUNYUAN_REGION=ap-guangzhou
TENCENT_HUNYUAN_IMAGE_STYLE=201
TENCENT_HUNYUAN_IMAGE_SIZE=1024:1024
TENCENT_HUNYUAN_IMAGE_LOGO_ADD=0
AI_IMAGE_TIMEOUT_MS=20000
AI_IMAGE_MAX_RETRIES=1
```

Field notes:

- `TENCENT_HUNYUAN_SECRET_ID`: Tencent Cloud API credential SecretId
- `TENCENT_HUNYUAN_SECRET_KEY`: Tencent Cloud API credential SecretKey
- `TENCENT_HUNYUAN_SESSION_TOKEN`: optional, only fill when using temporary credentials
- `TENCENT_HUNYUAN_IMAGE_ENDPOINT`: keep `https://hunyuan.tencentcloudapi.com` unless Tencent changes the live endpoint
- `TENCENT_HUNYUAN_REGION`: recommended default is `ap-guangzhou`
- `TENCENT_HUNYUAN_IMAGE_STYLE`: current code sends this as Tencent `Style`
- `TENCENT_HUNYUAN_IMAGE_SIZE`: current code normalizes to Tencent `Resolution`, example `1024:1024`
- `TENCENT_HUNYUAN_IMAGE_LOGO_ADD`: `0` means do not add provider logo

## 3. What the code expects

Current server implementation:

- request action: `TextToImageLite`
- request version: `2023-09-01`
- response expectation: image URL in `Response.ResultImage`
- fallback order:
  - Tencent Hunyuan
  - JiMeng if explicitly enabled and Tencent is not ready
  - demo cover when no live provider is ready

Code locations:

- `server/ai-covers.mjs`
- `server/launch-readiness.mjs`
- `.env.example`
- `.env.production.example`

## 4. Live debugging checklist

Before the live call:

- Confirm `.env` uses the new Tencent keys, not the old placeholder `API_KEY / API_URL / MODEL` shape
- Confirm `AI_IMAGE_PROVIDER=tencent-hunyuan`
- Confirm `TENCENT_HUNYUAN_SECRET_ID` and `TENCENT_HUNYUAN_SECRET_KEY` are both filled
- Confirm `TENCENT_HUNYUAN_IMAGE_STYLE` and `TENCENT_HUNYUAN_IMAGE_SIZE` are filled
- Keep JiMeng values empty for launch unless you intentionally want to test the reserved provider

Local commands:

- `npm run ready:pre-icp`
- `npm run check`

Expected readiness result:

- `Common production env` may still be missing if production secrets are not filled yet
- `Tencent Hunyuan live env` must become `[OK]`

## 5. Live acceptance checklist

Functional acceptance:

- Log in with a free account
- Generate one WeChat cover and confirm only one live image is returned
- Generate one Xiaohongshu cover and confirm only one live image is returned
- Confirm the cover panel switches to `AI Live`
- Confirm the returned URL can render directly in the right-side preview

Quota acceptance:

- Free account starts with `10 lifetime uses`
- One live generation reduces free quota by exactly `1`
- VIP account starts with `3 daily uses`
- One live generation reduces VIP daily quota by exactly `1`
- The fourth VIP request on the same day must be rejected

Fallback acceptance:

- If Tencent env is removed, the cover panel falls back to demo mode
- If Tencent request times out, the API returns a clear error instead of hanging indefinitely

## 6. Common failure points

- Wrong credential type: using old mock-style env keys instead of Tencent SecretId/SecretKey
- Wrong resolution format: use `1024:1024`, not `1024x1024`
- Wrong style value: this field is passed directly to Tencent `Style`
- Region mismatch: if Tencent account permissions differ by region, verify `TENCENT_HUNYUAN_REGION`
- Temporary credential missing token: if using temporary credentials, also fill `TENCENT_HUNYUAN_SESSION_TOKEN`

## 7. Handoff note

If live debugging fails later, check these in order:

1. `npm run ready:pre-icp`
2. `node --check server/ai-covers.mjs`
3. Server logs for Tencent error message
4. Whether the response contains `Response.Error`
