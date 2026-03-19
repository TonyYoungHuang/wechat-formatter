# 微信排版项目 MVP 投产清单
更新时间：2026-03-17

这份文档把当前项目后续工作拆成两大块：

- 第一部分：MVP 最小可投产版本必须完成的内容
- 第二部分：网站正式上线后再持续优化的内容

目标不是一次把所有想法都做完，而是先把“能注册、能排版、能支付、能生图、能稳定运行”的最小商业闭环跑通。

## A. MVP 最小可投产版本

### A1. MVP 必须具备的产品功能

以下 4 项是最小产品闭环，必须全部完成后才适合对外开放：

1. 注册与登录
2. 真实排版功能
3. 真实支付开通会员
4. 真实 AI 配图

当前状态判断：

- 注册登录：代码已接后端，但还需要补生产安全项
- 排版功能：已具备可用基础
- 支付：代码骨架已在，但真实联调未完成
- AI 配图：即梦方向已切换，但真实联调未完成

### A2. MVP 投产前必须完成的环节

以下环节建议按优先级完成。

#### 1. 账号与会话安全

必须完成：

- 注册
- 登录
- 登出
- 获取当前用户
- 获取会员状态
- Token 过期处理
- 生产环境密钥配置

必须补齐：

- 不再把核心登录态长期裸放在 `localStorage`
- 增加会话失效策略或刷新策略
- 登录失败频率限制
- 注册频率限制
- CORS 白名单
- 后端基础访问日志

当前为什么必须做：

- 这是所有付费和会员逻辑的入口
- 如果账号体系不稳，后面支付和会员权益都会不稳

#### 2. 排版主功能

必须完成：

- 微信公众号排版
- 小红书排版
- 模板切换
- 配色切换
- 实时预览
- HTML 导出

建议保留在 MVP 的内容：

- 4 到 6 套免费模板
- 4 到 6 套 VIP 模板
- 每个平台 4 到 8 套稳定颜色

当前已经有，但上线前要再确认：

- 模板输出稳定
- 不同模板下的标题、列表、引用、代码块不出错
- 微信与小红书预览差异明确
- 导出结果可直接复制使用

可以延后，不作为 MVP 阻塞项：

- 模板收藏
- 模板管理后台
- 太多模板数量扩张

#### 3. 会员与支付闭环

必须完成：

- 创建订单
- 真实微信支付下单
- 真实支付宝下单
- 官方回调验签
- 支付成功后自动开通会员
- 会员到期时间计算
- 月付 / 年付区分
- 订单查询

必须补齐：

- 回调地址生成必须固定走正式域名配置
- 生产环境关闭 mock 支付
- 订单状态可追踪
- 支付失败可重试
- 支付成功后会员状态实时同步

建议 MVP 阶段至少做到：

- 用户可以完成一次真实支付
- 支付成功后马上解锁 VIP 模板和 AI 功能
- 后台可查到订单与会员状态

可以延后：

- 发票
- 优惠码
- 退款流程
- 自动续费

#### 4. 即梦 AI 配图

必须完成：

- 配置真实即梦 / 火山引擎 Key
- 生成真实封面图
- 前端展示真实结果
- 失败兜底提示
- 会员权限校验

必须补齐：

- 外部请求超时控制
- 失败重试
- 成本限制
- 生成失败时保留 Demo 兜底

建议 MVP 阶段做到：

- 每次可返回 1 到 3 张可用封面图
- 用户看得懂“真实生成 / 演示兜底”的状态
- 配图权限明确只给 VIP

可以延后：

- 图库复用
- 历史生成记录
- 高级 prompt 配置

#### 5. 最小数据与内容管理

MVP 建议保留的最小能力：

- 草稿保存
- 草稿更新
- 草稿删除
- 历史作品读取

当前已经有基础实现，但上线前需要补：

- 删除与更新的接口级回归验证
- 数据库备份方案
- 数据导出或人工备份方式

可以延后：

- 正式作品表
- 发布状态流转
- 团队协作

### A3. MVP 投产运行必备项

这部分不是产品功能，但不做就不适合上线。

#### 1. 域名与部署路径

必须完成：

- 购买正式域名
- 选择正式部署方式
- 配置 DNS 解析
- 配置 HTTPS 证书
- 确认前端域名和后端域名方案

建议直接确定一种部署方案：

- 方案一：前后端同域部署
- 方案二：前端主域名 + API 子域名

建议优先：

- 主站：`yourdomain.com`
- API：`api.yourdomain.com`

#### 2. 中国大陆部署合规准备

如果你使用中国大陆服务器对外提供网站服务，通常需要先完成备案流程。

需要注意：

- 中国内地服务器通常需要完成 ICP 备案后再开通网站服务
- 网站 / App 开通后通常需要在 30 日内提交公安联网备案
- 域名注册者应与互联网信息服务提供者身份匹配

这一步会直接影响你何时能正式对外开放访问。

如果想最快速跑 MVP：

- 可以优先使用海外或中国香港服务器先完成产品闭环验证
- 但如果后续长期面向中国大陆公开运营，仍建议尽早规划备案路径

#### 3. 生产环境配置

必须完成：

- `NODE_ENV=production`
- `AUTH_SECRET`
- `ADMIN_API_KEY`
- `DATABASE_PATH`
- `ALLOW_MOCK_PAYMENTS=false`
- `PAYMENT_NOTIFY_BASE_URL`
- 微信支付参数
- 支付宝参数
- 即梦 AI 参数

同时要确认：

- 不再使用开发默认密钥
- 不再允许 mock 支付进生产
- 支付回调域名是公网 HTTPS 可访问地址

#### 4. 生产安全基础

MVP 阶段最低限度要补：

- CORS 白名单
- 登录 / 注册 / AI / 支付接口限流
- 基础错误日志
- 健康检查接口
- 管理员密钥不暴露到前端

#### 5. 生产稳定性基础

MVP 阶段最低限度要补：

- 数据库定时备份
- 外部 API 超时
- 外部 API 失败重试
- 支付与 AI 请求失败提示
- 服务器重启后的自动拉起

#### 6. 上线前验证

MVP 正式投产前，至少需要完整走通以下链路：

1. 新用户注册
2. 登录成功
3. 粘贴文章并切换模板
4. 导出 HTML
5. 触发真实 AI 配图
6. 创建真实订单
7. 完成一次真实微信支付或支付宝支付
8. 会员状态自动更新为 VIP
9. 解锁 VIP 模板与 AI 功能

### A4. MVP 执行顺序

建议严格按下面顺序完成：

1. 修生产安全基础
2. 修支付回调域名与支付联调
3. 做即梦真实生图联调
4. 做接口级联调验证
5. 购买域名并确定部署方式
6. 部署测试环境
7. 完成正式环境配置
8. 完成备案 / 合规流程
9. 上线 MVP

## B. 上线后持续优化

下面这些功能都很有价值，但不建议阻塞 MVP 投产。

### B1. 产品能力优化

- 更多模板数量
- 更多配色方案
- 模板收藏
- 模板推荐排序
- 模板管理后台
- 自定义模板编辑器
- 品牌主题编辑能力
- 品牌主题分组

### B2. 内容工作流优化

- 正式作品库
- 发布状态管理
- 历史版本
- 一键复制到公众号编辑器
- 小红书专属导出增强
- 标题库增强
- AI 改写增强

### B3. AI 能力增强

- 历史生图记录
- 图库复用
- 自定义 prompt
- 封面风格切换
- AI 标题优化
- AI 摘要生成
- AI 多图生成

### B4. 商业化增强

- 优惠码
- 邀请裂变
- 退款流程
- 发票
- 自动续费
- 企业版套餐

### B5. 运营与后台

- 管理后台
- 用户管理
- 订单管理
- 会员管理
- 模板上下架
- AI 成本监控
- 内容审核

### B6. 工程化与运维增强

- 自动化测试
- CI/CD
- 监控告警
- 错误追踪
- 数据分析埋点
- 灰度发布
- 多环境配置管理

## C. 当前建议结论

如果以 MVP 为目标，现在最应该优先做的不是继续加更多展示功能，而是先收口以下 5 件事：

1. 账号与接口安全
2. 真实支付闭环
3. 真实即梦生图闭环
4. 上线部署与域名 / HTTPS / 回调域名
5. 上线前全链路验收

只要这 5 件事完成，这个项目就具备最小投产条件。
## 2026-03-17 MVP security/payment/ai update

This section is the latest ASCII handoff note for the current MVP path.

Done in code:
- Auth token storage moved from `localStorage` to `sessionStorage`.
- Frontend API requests now send `credentials: 'include'` so the server can restore session from cookie.
- Server now issues DB-backed auth sessions in `auth_sessions`.
- Login and register now create both a bearer token and an HttpOnly session cookie.
- Logout now revokes the current DB session and clears the cookie.
- Protected routes now validate both JWT payload and session record (`sid`, expiry, revoked state).
- Added in-memory rate limiting for auth, AI cover generation, and payment create/simulate routes.
- Added basic security headers and CORS allowlist support.
- Payment create-order now prefers `PAYMENT_NOTIFY_BASE_URL` for callback generation.
- Payment gateway requests now use timeout protection.
- JiMeng image requests now use timeout plus retry fallback.

Production env required before MVP launch:
- `NODE_ENV=production`
- `AUTH_SECRET=<strong random secret>`
- `ADMIN_API_KEY=<admin only secret>`
- `SESSION_TTL_DAYS=7`
- `SESSION_COOKIE_NAME=formatter_session`
- `CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com`
- `ALLOW_MOCK_PAYMENTS=false`
- `PAYMENT_NOTIFY_BASE_URL=https://your-domain.com`
- `PAYMENT_HTTP_TIMEOUT_MS=12000`
- `AI_IMAGE_TIMEOUT_MS=20000`
- `AI_IMAGE_MAX_RETRIES=1`
- All real WeChat Pay env vars
- All real Alipay env vars
- Real JiMeng env vars such as `JIMENG_API_KEY`, `JIMENG_API_URL`, `JIMENG_IMAGE_MODEL`

Still required to finish the 3 MVP paths:
- Real WeChat and Alipay merchant staging test, callback verification, and one successful paid order.
- Real JiMeng API key staging test and one successful cover-generation run.
- Basic production log and monitoring setup before launch.
## 2026-03-17 prelaunch todo note

Use `PRELAUNCH_TODO.md` as the current launch-blocking checklist for:
- domain and HTTPS
- WeChat Pay live onboarding
- Alipay live onboarding
- JiMeng live API onboarding
- final launch acceptance
