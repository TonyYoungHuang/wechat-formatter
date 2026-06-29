# 排版猫 SaaS

排版猫是面向微信副业创作者的内容增长工作台：一个选题，布局公众号、小绿书、搜一搜、问一问、朋友圈五个入口。

## 本地启动

1. 安装依赖：

```bash
pnpm install
```

2. 复制环境变量：

```bash
cp .env.example .env
```

3. 启动 PostgreSQL 和 Redis：

```bash
pnpm db:up
```

4. 初始化数据库：

```bash
pnpm db:deploy
pnpm prisma:seed
```

5. 启动开发服务：

```bash
pnpm dev
```

默认访问地址是 `http://localhost:3000`。

## 关键能力

- 注册登录和工作台登录态保护
- 多账号档案
- 选题库和 AI 选题建议
- 一题生成公众号、小绿书、搜一搜、问一问、朋友圈
- Tiptap 公众号编辑器和 HTML 复制
- 发布前检查
- 套餐、额度、支付订单和模型中转站配置入口
- SEO 首页、价格页、免费工具页、sitemap、robots
