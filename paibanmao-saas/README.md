# 排版猫 SaaS

排版猫新版是面向微信副业创作者的内容增长工作台。

核心定位：

> 一个选题，帮你布局公众号、小绿书、搜一搜、问一问、朋友圈五个入口。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 风格组件
- Tiptap
- PostgreSQL
- Prisma
- Redis
- Vercel AI SDK
- OpenAI-compatible AI provider adapter
- 微信支付 + 支付宝

## 当前阶段

Phase 0 / Phase 1 基础骨架：

- Next.js 项目结构
- 轻微信绿色工作台视觉
- 公开首页
- 登录/注册页面骨架
- Dashboard 布局
- 多账号档案页面骨架
- 五入口生成器页面骨架
- Prisma 数据模型初稿
- AI provider 配置入口
- 套餐权益默认配置

## 本地运行

复制环境变量：

```bash
cp .env.example .env
```

安装依赖：

```bash
npm install
```

生成 Prisma Client：

```bash
npm run prisma:generate
```

启动开发服务：

```bash
npm run dev
```

## 注意

当前 Windows/npm 环境中完整依赖安装曾出现长时间卡住的问题；`package-lock.json` 已通过 `npm install --package-lock-only --ignore-scripts` 固定依赖树。若本机安装仍卡住，优先检查 npm 残留 node 进程、网络代理和 npm registry。

