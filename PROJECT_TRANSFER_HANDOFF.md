# 排版猫项目总交接文档

更新时间：2026-04-02

这份文档用于把“排版猫”项目当前的代码结构、开发进度、运行方式、环境变量、上线前状态和接手顺序一次性写清楚，方便在其他电脑上继续开发。

## 1. 仓库信息

- 项目名称：`排版猫`
- 本地目录：`D:\Web\wechat-formatter`
- GitHub 仓库：[https://github.com/TonyYoungHuang/wechat-formatter](https://github.com/TonyYoungHuang/wechat-formatter)
- 远端：`origin`
- 当前主分支：`main`
- 当前已验证提交基线：`aabea26`

当前仓库状态：

- 工作区干净，当前没有未提交改动。
- 说明现在 GitHub 上已经有一份可以在新电脑继续接手的完整代码基线。

## 2. 项目定位

排版猫是一个面向内容创作者的双平台排版工作台，对标微信公众号排版类网站，同时兼顾小红书内容发布场景。

核心目标：

- 支持微信公众号排版
- 支持小红书排版
- 支持免费模板和 VIP 模板分层
- 支持注册、登录、会员体系
- 支持支付开通会员
- 支持 AI 封面生图

## 3. 当前已经完成的核心能力

### 3.1 前端产品形态

- 已完成产品首页和三栏工作台
- 已完成双平台切换：
  - 微信公众号
  - 小红书
- 已完成模板选择、配色选择、品牌主题保存
- 已完成右侧预览、标题建议、封面建议、发布清单
- 已完成 HTML 导出
- 已完成部分 VIP 扩展导出

### 3.2 模板与权益

- 免费模板已接入
- VIP 模板已接入
- 已支持品牌主题保存
- 已支持草稿保存、更新、删除、重新加载
- 已支持历史作品视图

### 3.3 账号与会员

- 已完成注册
- 已完成登录
- 已完成登出
- 已完成当前用户读取
- 已完成会员状态读取
- 已完成 DB 会话存储
- 已完成 `HttpOnly Cookie` + `sessionStorage` 组合方案

### 3.4 会员订阅模型

已实现的会员方案：

- 月度会员：首购 `19 元 / 30 天`
- 月度续费：`29 元 / 30 天`
- 季度会员：`59 元 / 90 天`
- 年度会员：`179 元 / 13 个月`

已实现的权益规则：

- 免费用户 AI 排版字数：`3000 字`
- 会员用户 AI 排版字数：`10000 字`
- 免费用户 AI 封面额度：累计 `10` 次
- 会员用户 AI 封面额度：每天 `3` 次
- 当前 AI 规则：`1 次请求 = 1 张图`

### 3.5 支付链路

当前已经完成：

- 创建订单
- 查询订单
- 模拟支付
- 官方回调入口
- 支付成功后自动开通会员
- 会员有效期自动顺延
- 用户不能直接手动改成 VIP
- 生产环境可关闭 mock 支付

当前未完成：

- 微信支付真实商户联调
- 支付宝真实商户联调

### 3.6 AI 生图

当前已经完成：

- AI 封面入口
- 封面结果展示
- demo 封面兜底
- 生图额度扣减
- 超时与重试
- 供应商结构切换

当前 provider 策略：

- 上线默认：`腾讯混元`
- 保留备用：`即梦`

腾讯混元当前实现：

- 已切到腾讯云正式签名体系
- 使用 `TC3-HMAC-SHA256`

### 3.7 数据层

当前已经完成：

- 主存储从 JSON 切换为 `SQLite`
- 自动建表
- 旧 JSON 数据自动迁移
- 健康检查
- readiness 检查

说明：

- `server/data/app.sqlite` 是运行时数据库文件
- 该文件被 `.gitignore` 忽略，不会被提交
- `server/data/db.json` 仍保留在仓库中，作为旧数据迁移来源和备份参考

## 4. 当前代码结构说明

### 4.1 前端主文件

- [src/App.tsx](/D:/Web/wechat-formatter/src/App.tsx)
  - 整体产品页面
  - 三栏工作台
  - 登录注册弹层
  - 支付弹层
  - 草稿与主题管理
  - AI 封面交互

- [src/lib/api.ts](/D:/Web/wechat-formatter/src/lib/api.ts)
  - 前端 API 类型定义
  - 鉴权接口
  - 草稿接口
  - 主题接口
  - 支付接口
  - AI 封面接口

- [src/lib/formatter.ts](/D:/Web/wechat-formatter/src/lib/formatter.ts)
  - 排版引擎
  - 模板样式
  - 小红书专属规则
  - 标题、列表、引用、代码块、标签提取等

- [src/styles/index.css](/D:/Web/wechat-formatter/src/styles/index.css)
  - 页面整体视觉样式
  - 工作台布局
  - 卡片与组件样式

### 4.2 后端主文件

- [server/index.mjs](/D:/Web/wechat-formatter/server/index.mjs)
  - Express API 主入口
  - 注册登录
  - 会话与鉴权
  - 会员状态
  - 草稿与主题接口
  - AI 封面接口
  - 支付订单接口
  - 健康检查与 readiness

- [server/db.mjs](/D:/Web/wechat-formatter/server/db.mjs)
  - SQLite 初始化
  - 表结构
  - 旧 JSON 迁移
  - 读写快照

- [server/payment-gateways.mjs](/D:/Web/wechat-formatter/server/payment-gateways.mjs)
  - 微信 Native 下单
  - 支付宝预下单
  - 回调验签与解析
  - mock 回退逻辑

- [server/ai-covers.mjs](/D:/Web/wechat-formatter/server/ai-covers.mjs)
  - AI provider 选择
  - 腾讯混元请求
  - 即梦保留接口
  - demo 封面兜底

- [server/product-config.mjs](/D:/Web/wechat-formatter/server/product-config.mjs)
  - 模板可用范围
  - 导出能力
  - AI 配额
  - AI 排版字数限制
  - 草稿额度

- [server/launch-readiness.mjs](/D:/Web/wechat-formatter/server/launch-readiness.mjs)
  - 检查正式环境变量是否齐全
  - 区分 `pre-icp` 和 `full`

### 4.3 仍然保留但已弱化的旧组件

这些文件还在仓库中，但当前主产品入口已经集中到 `src/App.tsx`：

- [src/components/Editor.tsx](/D:/Web/wechat-formatter/src/components/Editor.tsx)
- [src/components/Preview.tsx](/D:/Web/wechat-formatter/src/components/Preview.tsx)
- [src/components/Sidebar.tsx](/D:/Web/wechat-formatter/src/components/Sidebar.tsx)
- [src/components/TopBar.tsx](/D:/Web/wechat-formatter/src/components/TopBar.tsx)

它们更像早期结构遗留，后续如果继续重构，可以统一清理或复用。

## 5. 当前文档结构说明

项目里目前的重要文档有：

- [PROJECT_TRANSFER_HANDOFF.md](/D:/Web/wechat-formatter/PROJECT_TRANSFER_HANDOFF.md)
  - 这份文档，适合换电脑接手

- [LAUNCH_FREEZE_HANDOFF.md](/D:/Web/wechat-formatter/LAUNCH_FREEZE_HANDOFF.md)
  - 备案等待期间的冻结状态文档

- [PRELAUNCH_TODO.md](/D:/Web/wechat-formatter/PRELAUNCH_TODO.md)
  - 上线前阻塞事项

- [DEVELOPMENT_PROGRESS.md](/D:/Web/wechat-formatter/DEVELOPMENT_PROGRESS.md)
  - 开发过程记录

- [MVP_LAUNCH_PLAN.md](/D:/Web/wechat-formatter/MVP_LAUNCH_PLAN.md)
  - MVP 投产视角的主清单

- [MEMBERSHIP_PRICING_PLAN.md](/D:/Web/wechat-formatter/MEMBERSHIP_PRICING_PLAN.md)
  - 会员价格和额度方案

- [TENCENT_HUNYUAN_LIVE_PREP.md](/D:/Web/wechat-formatter/TENCENT_HUNYUAN_LIVE_PREP.md)
  - 腾讯混元真实参数与联调清单

- [JIMENG_LIVE_PREP.md](/D:/Web/wechat-formatter/JIMENG_LIVE_PREP.md)
  - 即梦保留方案说明

## 6. 当前运行方式

新电脑接手后建议按下面顺序启动：

1. 克隆仓库
2. 安装依赖
3. 复制环境变量模板
4. 启动前后端

常用命令：

- 安装依赖：
```powershell
npm install
```

- 开发模式：
```powershell
npm run dev
```

- 仅前端：
```powershell
npm run client
```

- 仅后端：
```powershell
npm run server
```

- 构建检查：
```powershell
npm run check
```

- 正式环境变量检查：
```powershell
npm run ready:full
```

- 备案前检查：
```powershell
npm run ready:pre-icp
```

## 7. 当前环境变量情况

模板文件：

- [\.env.example](/D:/Web/wechat-formatter/.env.example)
- [\.env.production.example](/D:/Web/wechat-formatter/.env.production.example)

当前还需要正式填写的主要参数有：

### 7.1 通用生产环境

- `NODE_ENV=production`
- `AUTH_SECRET`
- `ADMIN_API_KEY`
- `DATABASE_PATH`
- `CORS_ORIGINS`
- `PAYMENT_NOTIFY_BASE_URL`
- `SESSION_TTL_DAYS`
- `SESSION_COOKIE_NAME`

### 7.2 微信支付

- `WECHAT_PAY_APP_ID`
- `WECHAT_PAY_MCH_ID`
- `WECHAT_PAY_MCH_SERIAL_NO`
- `WECHAT_PAY_PRIVATE_KEY_PEM`
- `WECHAT_PAY_API_V3_KEY`
- `WECHAT_PAY_PLATFORM_CERT_PEM` 或 `WECHAT_PAY_PLATFORM_PUBLIC_KEY_PEM`

### 7.3 支付宝

- `ALIPAY_APP_ID`
- `ALIPAY_PRIVATE_KEY_PEM`
- `ALIPAY_PUBLIC_KEY_PEM`

### 7.4 腾讯混元

- `AI_IMAGE_PROVIDER=tencent-hunyuan`
- `TENCENT_HUNYUAN_SECRET_ID`
- `TENCENT_HUNYUAN_SECRET_KEY`
- `TENCENT_HUNYUAN_SESSION_TOKEN`
- `TENCENT_HUNYUAN_IMAGE_ENDPOINT`
- `TENCENT_HUNYUAN_REGION`
- `TENCENT_HUNYUAN_IMAGE_STYLE`
- `TENCENT_HUNYUAN_IMAGE_SIZE`
- `TENCENT_HUNYUAN_IMAGE_LOGO_ADD`

## 8. 当前验证状态

我在当前电脑上重新验证过：

- `npm run check` 通过
- 前端构建通过
- 服务端语法检查通过

说明：

- 代码主体是稳定可继续开发的
- 目前阻塞上线的仍是正式环境参数和真实外部平台联调

## 9. 当前开发进度总结

如果只用一句话总结当前进度：

排版猫已经从原型阶段进入“高完成度 MVP 代码阶段”，前后端主体、会员模型、模板体系、数据层、AI provider 架构和支付骨架都已经具备，剩余主要是正式环境配置、腾讯混元真实联调、微信支付真实联调、支付宝真实联调和最终上线部署。

## 10. 新电脑接手后的建议顺序

建议在新电脑上继续开发时，按这个顺序推进：

1. 克隆 GitHub 仓库
2. 运行 `npm install`
3. 复制 `.env.production.example` 为实际 `.env`
4. 先补通用生产环境变量
5. 如果先做 AI：
   - 按 `TENCENT_HUNYUAN_LIVE_PREP.md` 填腾讯混元参数
   - 跑 `npm run ready:pre-icp`
6. 如果做支付：
   - 继续补微信支付商户参数
   - 继续补支付宝参数
   - 跑 `npm run ready:full`
7. 进行完整 MVP 验收：
   - 注册
   - 登录
   - 双平台排版
   - AI 封面
   - 创建订单
   - 完成支付
   - 自动开通会员
   - 解锁 VIP 权益

## 11. 当前最关键的接手结论

这次换电脑并不会导致项目上下文丢失，因为：

- 代码已经完整在 GitHub 上
- 当前仓库是干净状态
- 关键开发过程已经写入多份文档
- 本文档已经把代码结构和开发进度重新整合成一份总说明

后续只要在新电脑上拉取这个仓库，就可以继续开发。
