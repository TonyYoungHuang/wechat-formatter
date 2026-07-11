# 微信公众号真实粘贴回归

## 目的

每次修改排版引擎或主题后，用同一篇固定文章检查微信公众号后台是否仍能保留标题层级、全文背景、正文、引用、列表、数据、对话和行动区。

## 自动回归

```powershell
corepack pnpm test
corepack pnpm test:wechat-artifact
```

生成文件位于：

- `.artifacts/wechat-paste-regression.html`：带“复制回归样文”按钮的单主题测试页。
- `.artifacts/wechat-theme-gallery.html`：10 套主题的 420px 宽度横向画廊。
- `.artifacts/wechat-paste-regression.fragment.html`：可直接写入富文本剪贴板的微信 HTML 片段。

## 微信后台人工回归

1. 运行 `corepack pnpm test:wechat-artifact`，在浏览器打开 `.artifacts/wechat-paste-regression.html`。
2. 点击“复制回归样文”。
3. 登录微信公众平台，新建一篇不发布的图文，在正文编辑区直接粘贴。
4. 检查主标题、一级小标题、二级小标题和正文是否明显不同。
5. 检查浅绿根背景是否从开头连续覆盖到文末，普通正文是否保持透明背景。
6. 检查引用、项目符号、4 个步骤、数据块、左右对比、对话和 CTA 是否完整。
7. 检查正文末尾是否仍有“回归样文版本 v1”，并确认页面没有显示 HTML 源码或横向滚动。
8. 不保存、不发布测试稿；发现差异时保留微信后台截图和所用主题名称。

## 通过标准

- 文首和文末文字完整，未退化成 HTML 源码。
- 主标题 24-26px、一级小标题 19-20px、二级小标题 17px、正文 16px，层级清楚。
- 全文背景连续，普通段落不形成连续卡片。
- 无横向溢出，复杂内容块在手机宽度下可阅读。
- 微信后台预览与排版猫预览只允许有轻微字体渲染差异，不允许结构或主题色丢失。
