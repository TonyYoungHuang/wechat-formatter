# Membership Pricing Plan

Updated: 2026-03-18

This file is the approved pricing and entitlement plan for launch.

## 1. Pricing

- Monthly member
  - price: `19 RMB`
  - duration: `30 days`
  - label: `首月特惠`
  - original price: `29 RMB`
  - rule: first monthly purchase uses `19 RMB`, later monthly renewals return to `29 RMB`
- Quarterly member
  - price: `59 RMB`
  - duration: `90 days`
  - original price: `79 RMB`
- Yearly member
  - price: `179 RMB`
  - duration: `13 months`
  - label: `限时特惠`
  - original price: `269 RMB`
  - rule: includes one bonus month, total `13 months`

## 2. Entitlements

- Free users
  - AI formatting length: `up to 3000 Chinese characters`
  - document writing: `unlimited`
  - template styles: `partial`
  - custom theme styles: `disabled`
  - AI cover generation: `10 total lifetime uses`
- VIP users
  - AI formatting length: `up to 10000 Chinese characters`
  - document writing: `unlimited`
  - template styles: `all templates`
  - custom theme styles: `enabled`
  - AI cover generation: `3 uses per day`

## 3. AI image provider strategy

- Launch default provider: `Tencent Hunyuan`
- JiMeng interface: `keep in codebase, but do not enable for launch`
- Product rule: `1 AI generation = 1 image`
- Product rule: do not return 3 images by default on launch
- Product rule: if user wants another image, they click regenerate and consume another use

## 4. Business rules

- Subscription extension always stacks on the current valid expiry time.
- Monthly duration uses `30 days`.
- Quarterly duration uses `90 days`.
- Yearly duration uses `13 months`.
- Free AI image quota is lifetime and does not reset.
- VIP AI image quota resets by calendar day.
- If payment onboarding is blocked by ICP, pricing still remains the final approved launch plan and waits for payment activation later.

## 5. Implementation scope

- Update backend pricing amounts and supported billing cycles.
- Update frontend pricing cards and payment modal.
- Update entitlement API to return the new AI quota logic.
- Update AI image provider architecture to prefer Tencent Hunyuan and keep JiMeng as a reserved provider.
