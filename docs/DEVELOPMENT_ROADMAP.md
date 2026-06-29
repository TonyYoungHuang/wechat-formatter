# 排版猫新版开发计划

更新时间：2026-06-29

目标：

> 全新开发排版猫微信内容增长 SaaS。保留品牌，不迁移旧代码。围绕「一个选题，布局公众号、小绿书、搜一搜、问一问、朋友圈五个入口」构建完整产品。

## 1. 已确认产品决策

1. 品牌继续叫「排版猫」。
2. 新项目全量重建，不沿用旧代码和旧排版模块。
3. 第一版必须支持多个账号档案。
4. 免费版每天 1 次生成。
5. 入门版支持 3 个账号档案，专业版支持 10 个账号档案。
6. 价格和额度暂不定，必须预留后台配置。
7. 首版接入支付，后续价格确定后即可启用。
8. AI 接入海外模型中转站，但供应商暂不定，必须预留 OpenAI-compatible 接口。
9. MVP 不做真实图片生成，只做图片提示词工具，并预留后续图片生成接口。
10. 排版模块首版只支持公众号 HTML，不做复杂模板市场。
11. UI 改成轻量微信绿色工作台风格。

## 2. 推荐技术栈

### 2.1 前端

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Tiptap 富文本编辑器
- TanStack Query
- Zustand
- lucide-react

### 2.2 后端

首版建议使用 Next.js 内置服务端能力：

- Route Handlers
- Server Actions
- Middleware

原因：

- 项目早期开发速度快。
- 前后端统一部署。
- 方便做 SEO 页面。
- 方便以后拆出独立 API 服务。

### 2.3 数据层

- PostgreSQL
- Prisma ORM
- Redis

### 2.4 AI 层

- Vercel AI SDK
- OpenAI-compatible provider adapter
- Prompt template versioning
- Generation job log
- Usage accounting

### 2.5 支付

- 微信支付
- 支付宝
- 支付订单表
- 回调验签
- 会员开通
- 价格配置表

### 2.6 部署

大陆优先：

- 腾讯云服务器
- Nginx
- HTTPS
- PostgreSQL
- Redis
- PM2 或 systemd

## 3. 项目目录建议

```text
paibanmao-saas/
  app/
    (marketing)/
    (auth)/
    (dashboard)/
    api/
  components/
    ui/
    marketing/
    dashboard/
    editor/
    generators/
    billing/
  lib/
    ai/
    auth/
    billing/
    db/
    entitlements/
    prompts/
    seo/
    validators/
  prisma/
    schema.prisma
    migrations/
  content/
    docs/
    tutorials/
  public/
  docs/
```

## 4. 核心数据模型

### 4.1 用户和权限

- users
- sessions
- workspaces
- workspace_members
- subscriptions
- plans
- plan_entitlements
- usage_logs

### 4.2 多账号档案

- account_profiles

字段：

- id
- workspace_id
- name
- type
- niche
- persona
- audience
- audience_pain_points
- product_or_service
- monetization_methods
- tone
- common_cta
- forbidden_words
- sample_text
- is_default
- created_at
- updated_at

### 4.3 内容生产

- topics
- content_projects
- content_variants
- content_calendar_items

content_variants 的入口类型：

- wechat_article
- green_note
- search
- question
- moments

### 4.4 AI 生成

- ai_providers
- ai_models
- prompt_templates
- generation_jobs
- generation_outputs

### 4.5 发布前检查

- compliance_reports
- compliance_issues

### 4.6 支付和定价

- pricing_plans
- pricing_versions
- payment_orders
- payment_callbacks
- invoices_optional

## 5. 核心模块拆分

### 5.1 认证模块

功能：

- 注册
- 登录
- 登出
- 当前用户
- session
- 密码重置可放 P1

验收：

- 用户能注册登录。
- 登录后进入工作台。
- 未登录用户访问 SaaS 页面跳转登录。

### 5.2 多账号档案模块

功能：

- 创建账号档案
- 编辑账号档案
- 删除账号档案
- 复制账号档案
- 设置默认账号
- 档案完整度评分

验收：

- 免费用户最多 1 个。
- 入门版最多 3 个。
- 专业版最多 10 个。
- 生成内容时必须选择账号档案。

### 5.3 选题模块

功能：

- 手动新增选题
- AI 生成选题
- 保存选题
- 标记状态
- 按入口和目标筛选

验收：

- 用户可从账号档案生成一组选题。
- 用户可选择一个选题进入五入口生成器。

### 5.4 五入口生成模块

功能：

- 公众号长文
- 小绿书短图文
- 搜一搜关键词
- 问一问回答
- 朋友圈文案

验收：

- 用户输入一个选题后能生成五个入口内容。
- 每个入口支持单独复制。
- 生成结果可以保存为内容项目。
- 消耗生成额度。

### 5.5 编辑器模块

功能：

- 公众号富文本编辑
- 基础排版
- 复制公众号 HTML
- 复制纯文本
- 局部 AI 改写

验收：

- 用户能把公众号内容发送到编辑器。
- 用户能复制 HTML 到微信公众平台。
- 首版不追求复杂模板。

### 5.6 小绿书模块

功能：

- 短文案编辑
- 3/6/9 图脚本
- 封面文案
- 每页图片提示词
- 图片生成接口预留

验收：

- 用户能生成和编辑小绿书文案。
- 用户能复制每页图片提示词。
- 后续可平滑接入真实图片生成。

### 5.7 发布前检查模块

功能：

- 合规风险
- 标题风险
- AI 味
- 搜索优化
- CTA 自然度
- 入口规则检查

验收：

- 用户能对一个内容项目发起检查。
- 系统返回问题列表和修改建议。
- 不承诺平台审核结果。

### 5.8 会员和额度模块

功能：

- 套餐配置
- 价格配置
- 权益配置
- 额度扣减
- 额度查询
- 支付开通

验收：

- 免费版每天 1 次生成。
- 价格和额度均可配置。
- 支付成功后自动更新会员状态。

### 5.9 SEO 工具页模块

功能：

- 免费工具页
- 结果预览
- 登录解锁完整结果
- 相关工具推荐

验收：

- 至少上线 5 个可索引工具页。
- 每个工具页有独立标题、描述、结构化内容。

## 6. API 规划

### 6.1 Auth

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### 6.2 Account profiles

- GET /api/account-profiles
- POST /api/account-profiles
- PATCH /api/account-profiles/:id
- DELETE /api/account-profiles/:id
- POST /api/account-profiles/:id/duplicate
- POST /api/account-profiles/:id/set-default

### 6.3 Topics

- GET /api/topics
- POST /api/topics
- POST /api/topics/generate
- PATCH /api/topics/:id
- DELETE /api/topics/:id

### 6.4 Generation

- POST /api/generate/five-entry
- POST /api/generate/wechat-article
- POST /api/generate/green-note
- POST /api/generate/search
- POST /api/generate/question
- POST /api/generate/moments
- POST /api/generate/image-prompts

### 6.5 Projects

- GET /api/projects
- POST /api/projects
- GET /api/projects/:id
- PATCH /api/projects/:id
- DELETE /api/projects/:id

### 6.6 Compliance

- POST /api/compliance/check
- GET /api/compliance/reports/:id

### 6.7 Billing

- GET /api/billing/plans
- POST /api/billing/orders
- GET /api/billing/orders/:id
- POST /api/billing/callback/wechat
- POST /api/billing/callback/alipay

### 6.8 Admin config

- GET /api/admin/pricing
- PATCH /api/admin/pricing
- GET /api/admin/entitlements
- PATCH /api/admin/entitlements
- GET /api/admin/ai-providers
- PATCH /api/admin/ai-providers

## 7. Prompt 模板规划

### 7.1 模板类型

- topic_generation
- five_entry_generation
- wechat_article_generation
- green_note_generation
- search_keyword_generation
- question_answer_generation
- moments_copy_generation
- image_prompt_generation
- compliance_check
- ai_tone_rewrite

### 7.2 Prompt 变量

通用变量：

- account_profile
- topic
- audience
- monetization_methods
- tone
- forbidden_words
- content_goal
- selected_entry

### 7.3 Prompt 管理要求

- Prompt 不写死在组件里。
- Prompt 模板需要版本号。
- 每次生成记录使用的 prompt 版本。
- 后台后续可编辑 prompt。

## 8. 开发阶段

### Phase 0：新项目初始化

目标：

- 创建全新 Next.js 项目。
- 建立基础 UI、数据库、认证、环境变量。

任务：

1. 初始化 Next.js + TypeScript + Tailwind。
2. 安装 shadcn/ui。
3. 配置 Prisma + PostgreSQL。
4. 配置基础 auth。
5. 配置 lint/build。
6. 搭建基础路由。

验收：

- 本地项目能启动。
- 首页、登录页、工作台空壳可访问。
- 数据库迁移成功。

### Phase 1：核心 SaaS 骨架

目标：

- 用户能注册登录，创建账号档案，进入工作台。

任务：

1. 用户认证。
2. 工作台布局。
3. 多账号档案 CRUD。
4. 套餐权益配置基础。
5. 额度查询基础。

验收：

- 免费版只能创建 1 个账号档案。
- 付费等级逻辑可通过配置控制。

### Phase 2：五入口生成闭环

目标：

- 完成产品最核心体验。

任务：

1. AI provider adapter。
2. OpenAI-compatible endpoint 配置。
3. 五入口生成接口。
4. 五入口结果页面。
5. 生成日志。
6. 额度扣减。
7. 内容项目保存。

验收：

- 输入一个选题能生成五入口内容。
- 结果可以保存。
- 每次生成可追踪。
- 额度正确扣减。

### Phase 3：编辑器和发布检查

目标：

- 用户能编辑、复制、检查。

任务：

1. Tiptap 编辑器。
2. 公众号 HTML 导出。
3. 小绿书编辑器。
4. 图片提示词工具。
5. 发布前检查。

验收：

- 公众号内容可复制 HTML。
- 小绿书内容可复制文案和图片提示词。
- 检查报告可保存。

### Phase 4：支付和商业化

目标：

- 完成真实付费闭环。

任务：

1. 价格配置后台。
2. 额度配置后台。
3. 微信支付。
4. 支付宝。
5. 订单状态。
6. 支付成功开通套餐。

验收：

- 能创建真实订单。
- 支付回调后自动开通会员。
- 套餐权益即时生效。

### Phase 5：SEO 和增长

目标：

- 建立免费工具获客入口。

任务：

1. 首页。
2. 价格页。
3. 公众号选题生成器页。
4. 小绿书生成器页。
5. 搜一搜关键词助手页。
6. 问一问回答生成器页。
7. 发布前检查页。
8. sitemap/robots/metadata。

验收：

- 工具页可索引。
- 未登录可试用一次预览。
- 登录后进入 SaaS 工作台。

## 9. 开发顺序建议

推荐先做：

1. 新项目初始化
2. 数据模型
3. 认证
4. 多账号档案
5. AI provider adapter
6. 五入口生成器
7. 项目保存
8. 编辑器
9. 发布前检查
10. 支付
11. SEO 工具页

不推荐先做：

- 复杂模板市场
- 图片生成
- 自动发布
- 团队协作
- 数据大屏

## 10. 首版验收标准

首版可上线内测的最低标准：

1. 用户可注册登录。
2. 用户可创建至少 1 个账号档案。
3. 用户可输入一个选题生成五入口内容。
4. 用户可保存内容项目。
5. 用户可编辑公众号文章并复制 HTML。
6. 用户可生成小绿书图片提示词。
7. 用户可运行发布前检查。
8. 免费版每天只能生成 1 次。
9. 管理员可配置价格和额度。
10. 支付链路可跑通。

## 11. 主要风险

### 11.1 AI 成本风险

控制方式：

- 每次生成计入 usage log。
- 套餐额度可配置。
- Prompt 控制长度。
- 支持模型降级。
- 支持缓存部分生成结果。

### 11.2 中转站稳定性风险

控制方式：

- Provider adapter。
- 支持多个 endpoint。
- 后台可切换默认 provider。
- 失败重试。
- 失败不扣额度或返还额度。

### 11.3 合规风险

控制方式：

- 禁止洗稿/搬运定位。
- 发布前检查明确免责声明。
- 高风险行业提示。
- 不提供绕审话术。

### 11.4 产品范围膨胀

控制方式：

- MVP 不做图片生成。
- MVP 不做自动发布。
- MVP 不做模板市场。
- MVP 不做团队协作。

## 12. 下一步执行清单

如果确认本计划，下一步进入代码阶段：

1. 创建全新项目目录。
2. 初始化 Next.js 技术栈。
3. 创建 Prisma schema 初稿。
4. 创建基础页面骨架。
5. 实现账号档案 CRUD。
6. 实现 AI provider adapter。
7. 实现五入口生成器 MVP。

