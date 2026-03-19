# 微信排版项目开发进度
更新时间：2026-03-17

这份文档用于记录当前项目已经完成的模块、当前技术状态、上线前必须配置的内容，以及后续推荐开发顺序。真实支付联调和真实外部服务联调暂时后置，当前优先把业务模块做完整。

补充说明：

- 如果后续进入上线准备阶段，优先查看 `MVP_LAUNCH_PLAN.md`
- 该文档已经把“最小可投产版本必须完成的内容”和“上线后再优化的内容”拆开整理

## 1. 项目定位

项目目标是做一个面向内容创作者的双平台排版工作台，参照 Texpeed 一类产品的主页与创作区结构，当前聚焦：

- 微信公众号排版
- 小红书排版
- 免费模板与 VIP 模板分层
- AI 文章封面图生成
- 注册、登录、会员体系
- 支付与会员开通链路
- 品牌主题与历史作品管理

## 2. 当前已完成模块

### 2.1 产品界面与工作台

前端已经完成产品化首页和三栏工作台：

- 左侧：模板主题、品牌颜色、我的主题、草稿箱、会员入口
- 中间：正文编辑区
- 右侧：AI 封面、标题建议、成稿预览、发布清单

已支持微信公众号和小红书双平台切换。

### 2.2 模板系统

当前模板已经扩充为更完整的模板库。

免费模板：

- `mint`
- `slate`
- `sunrise`
- `ocean`
- `paper`
- `sprout`

VIP 模板：

- `forest-pro`
- `graphite-pro`
- `amber-note`
- `studio-pro`
- `linen-pro`
- `berry-note`
- `editorial-pro`
- `jade-editor`
- `peach-fizz`
- `carbon-pro`
- `camellia-note`
- `mono-brief`

### 2.3 模板引擎与导出

模板引擎已经具备真实输出能力，支持：

- 标题、段落、列表、引用、代码块
- 行内加粗、下划线、高亮、行内代码
- 小红书标签提取
- 小红书发布建议
- 微信 / 小红书差异化排版输出

当前导出能力：

- 复制 HTML
- 下载 HTML 成稿
- VIP 导出 Markdown
- VIP 导出小红书发布文案

### 2.4 注册、登录、会员与订阅

真实后端接口已经打通：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/user/subscription`
- `GET /api/user/entitlements`

订阅模型已升级为真实时间模型：

- 支持 `monthly / yearly`
- 返回 `status / cycle / startedAt / expiresAt`
- 到期状态自动判断 `active / expired / inactive`
- 有效期内续费会顺延

### 2.5 权益与权限控制

当前已经完成：

- 免费用户只能使用免费模板
- VIP 用户可用全部模板
- 免费用户草稿数量受限
- VIP 用户可用真实 AI 生图入口和扩展导出
- 品牌主题保存属于 VIP 权益

### 2.6 草稿箱与历史作品

当前已完成：

- 草稿保存
- 草稿更新
- 草稿删除
- 草稿列表读取
- 草稿重新载入编辑
- 历史作品页
- 历史作品关键词搜索
- 历史作品平台筛选

说明：当前“历史作品页”先复用草稿数据展示，后续如需正式作品状态流转，可再拆成独立作品表。

### 2.7 品牌主题保存

当前已新增正式品牌主题模块：

- 后端新增品牌主题数据表
- 支持读取我的主题
- 支持保存品牌主题
- 支持删除品牌主题
- 前端已把“推荐主题 / 我的主题”做成工作台结构

对应接口：

- `GET /api/themes`
- `POST /api/themes`
- `DELETE /api/themes/:themeId`

### 2.8 AI 生图

当前 AI 生图已从 OpenAI 切换到即梦 / 火山引擎方向：

- 后端已改为读取即梦 / 火山引擎图片生成配置
- 未配置真实 Key 时自动回退到 Demo 封面
- 前端已接入真实 AI 生图入口

说明：真实即梦接口联调仍后置。

### 2.9 支付与订单

当前已经完成后端订单主链路：

- 创建订单
- 查询订单
- mock 支付回调
- 微信 / 支付宝官方回调入口
- 支付成功后自动开通会员

已完成的安全修复：

- 普通用户不能再直接调用接口把自己改成 `vip`
- `PATCH /api/user/subscription` 仅管理员可用
- `simulate-pay` 受环境变量控制
- 生产环境禁止使用默认 `AUTH_SECRET`
- 不允许 mock 回退且未配置正式支付参数时，订单创建会直接失败

## 3. 数据层状态

### 3.1 已完成升级

本轮已将原本的本地 JSON 存储替换为 SQLite 正式数据库存储。

当前数据库文件默认位置：

- `server/data/app.sqlite`

当前数据库模块：

- `server/db.mjs`

当前数据库表：

- `users`
- `orders`
- `drafts`
- `brand_themes`

当前已支持：

- 启动自动建表
- 启动自动建索引
- 首次启动时自动从旧的 `server/data/db.json` 迁移历史数据

### 3.2 当前说明

- `server/data/db.json` 现在只保留为旧数据迁移来源和人工备份参考
- 后端主流程已经切换为数据库读写
- 品牌主题已经进入正式数据库，不再只是前端本地状态

## 4. 当前关键文件

前端：

- `src/App.tsx`
- `src/lib/api.ts`
- `src/lib/formatter.ts`
- `src/styles/index.css`

后端：

- `server/index.mjs`
- `server/db.mjs`
- `server/payment-gateways.mjs`
- `server/ai-covers.mjs`
- `server/product-config.mjs`

配置：

- `.env.example`

## 5. 上线前必须配置的内容

至少需要配置：

- `NODE_ENV=production`
- `AUTH_SECRET=强随机密钥`
- `ADMIN_API_KEY=后台专用密钥`
- `DATABASE_PATH=server/data/app.sqlite` 或正式部署路径
- `ALLOW_MOCK_PAYMENTS=false`
- `PAYMENT_NOTIFY_BASE_URL=https://你的正式域名`

如启用正式支付，还需要：

- 微信支付完整商户参数
- 支付宝完整商户参数
- 公网 HTTPS 回调域名

如启用真实 AI 生图，还需要：

- `JIMENG_API_KEY`
- 必要时配置 `JIMENG_API_URL`
- 正确的模型名与尺寸参数

## 6. 当前仍未完成的部分

### 6.1 真实支付联调

正式网关代码已在，但还没有做真实商户联调与回调实测。

### 6.2 即梦真实生图联调

即梦 / 火山引擎接口方向已经切换完成，但还没有做真实 Key 的在线联调、失败重试和成本控制。

### 6.3 更完整的生产化能力

仍建议后续继续补：

- 数据库迁移脚本
- 结构化日志
- 限流与风控
- 测试与 CI
- 监控告警

## 7. 已验证内容

截至当前，已验证通过：

- `npm run build`
- `node --check server/index.mjs`
- `node --check server/db.mjs`
- SQLite 启动建表与快照读取验证通过

当前这轮业务模块扩展已经完成前后端代码落地，但接口级联调仍后置。

## 8. 建议的后续开发顺序

按当前状态，建议继续顺序如下：

1. 继续扩展业务模块：作品状态流转、模板管理后台、品牌主题编辑能力
2. 完善 AI 生图模块：真实即梦联调、失败重试、生成结果复用
3. 完善数据库层：迁移脚本、更多约束、查询层整理
4. 最后再做微信 / 支付宝正式支付联调与回调实测

如果从“上线投产”角度推进，而不是从“继续做业务模块”角度推进，则应改为以 `MVP_LAUNCH_PLAN.md` 中的 MVP 必做清单为准。

## 9. 当前状态一句话总结

这个项目现在已经不是原型站，而是一个完成了双平台排版、扩展模板库、品牌主题保存、历史作品页、会员体系、订单链路、AI 生图入口和正式数据库落地的可持续开发版本；当前优先级应继续补业务模块，真实支付和真实外部服务联调可以放到后面统一推进。
## 2026-03-17 security/payment/ai progress update

Latest handoff summary for the current MVP path:

- Account and API security: implemented DB-backed auth sessions, HttpOnly session cookie, `sessionStorage` token fallback, CORS allowlist support, security headers, and rate limits for auth, payments, and AI.
- Payment path: `create-order` now prefers `PAYMENT_NOTIFY_BASE_URL`, returns safer gateway errors, and uses provider request timeouts.
- JiMeng AI path: image generation now uses request timeout and retry fallback while keeping demo-cover fallback when no live key is configured.
- Frontend session flow: startup can restore session from cookie, protected API calls send `credentials: 'include'`, and logout clears both client token and server session.

Files changed in this round:
- `server/index.mjs`
- `server/payment-gateways.mjs`
- `server/ai-covers.mjs`
- `server/db.mjs`
- `src/lib/api.ts`
- `src/App.tsx`
- `.env.example`
- `MVP_LAUNCH_PLAN.md`

New production env keys documented in code:
- `SESSION_TTL_DAYS`
- `SESSION_COOKIE_NAME`
- `CORS_ORIGINS`
- `PAYMENT_HTTP_TIMEOUT_MS`
- `AI_IMAGE_TIMEOUT_MS`
- `AI_IMAGE_MAX_RETRIES`

Verification completed in this round:
- `node --check server/index.mjs`
- `node --check server/payment-gateways.mjs`
- `node --check server/ai-covers.mjs`
- `npm run build`

Main work still intentionally deferred:
- Real WeChat/Alipay merchant live staging run
- Real JiMeng live staging run
- Production deployment and domain setup
## 2026-03-17 prelaunch todo note

Launch-blocking external work is now tracked in `PRELAUNCH_TODO.md`.

New automated improvements completed in this round:
- request logging middleware
- richer `/api/health` report
- new `/api/health/ready` readiness endpoint
- startup readiness warning output
- `npm run server:check`
- `npm run check`
## 2026-03-18 workflow update

New launch-prep helper files added:
- `PRELAUNCH_TODO.md`
- `TODAY_MVP_WORKFLOW.md`
- `server/launch-readiness.mjs`
- `.env.production.example`
- `JIMENG_LIVE_PREP.md`
- `MEMBERSHIP_PRICING_PLAN.md`
- `TENCENT_HUNYUAN_LIVE_PREP.md`

New commands:
- `npm run ready` to print missing production env groups
- `npm run ready:pre-icp` to check what can be completed before ICP approval
- `npm run ready:full` to check the full live-launch env set
- `npm run check` for server syntax plus frontend build

## 2026-03-18 membership and ai pricing update

Approved launch rules now implemented in docs and code:
- monthly membership: `19 RMB` first purchase, later monthly renewals `29 RMB`
- quarterly membership: `59 RMB / 90 days`
- yearly membership: `179 RMB / 13 months`
- free AI cover quota: `10 lifetime uses`
- VIP AI cover quota: `3 uses per day`
- launch AI provider preference: `Tencent Hunyuan`
- JiMeng remains reserved in codebase but is not the launch default
## 2026-03-18 domain and brand update

Confirmed launch identity:
- production domain: `paibanmao.cn`
- Chinese brand name: `排版猫`

Current deployment status:
- domain registered on Tencent Cloud
- ICP filing submitted
- expected ICP result window: 2-3 days

Recommended production structure:
- main site: `https://paibanmao.cn`
- API/callback domain: `https://api.paibanmao.cn`
## 2026-03-18 payment onboarding blocker update

New external blocker confirmed:
- WeChat Pay onboarding is currently blocked by the pending ICP filing result.
- Alipay onboarding is also currently blocked by the same filing requirement.

Impact:
- live payment integration and callback verification must be postponed until the ICP approval is available
- the current best parallel work is JiMeng live onboarding, production env preparation, and final launch polish that does not depend on payment activation
## 2026-03-18 Tencent Hunyuan live prep update

New AI-image handoff docs updated:
- `TENCENT_HUNYUAN_LIVE_PREP.md`
- `PRELAUNCH_TODO.md`

Key change:
- Tencent Hunyuan env requirements now follow the real Tencent Cloud credential model:
  - `TENCENT_HUNYUAN_SECRET_ID`
  - `TENCENT_HUNYUAN_SECRET_KEY`
  - `TENCENT_HUNYUAN_SESSION_TOKEN`
  - `TENCENT_HUNYUAN_IMAGE_ENDPOINT`
  - `TENCENT_HUNYUAN_REGION`
  - `TENCENT_HUNYUAN_IMAGE_STYLE`
  - `TENCENT_HUNYUAN_IMAGE_SIZE`
  - `TENCENT_HUNYUAN_IMAGE_LOGO_ADD`

New documented handoff content:
- real env template
- live debugging checklist
- live acceptance checklist
- common Tencent Hunyuan failure points
