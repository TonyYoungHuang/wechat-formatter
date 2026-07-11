# 排版猫微信公众号排版引擎设计方案

## 1. 目标与结论

排版猫需要建设一套自有的微信公众号排版引擎，而不是继续在编辑器组件中追加零散正则和样式。

核心结论：

- 吸收 `doocs/md` 的工程化渲染管线：解析、净化、主题、复制兼容彼此分层。
- 吸收 `xiaohu-wechat-format` 的内容语义层：AI 只负责识别文章结构和推荐呈现方式，主题通过结构化配置渲染。
- 排版猫内部以结构化 `ArticleDocument` 为唯一事实来源，AI 不再直接返回最终 HTML。
- 预览和复制使用同一个渲染结果，避免“页面里好看，粘贴到微信后变样”。
- 微信导出 HTML 只保留白名单标签、白名单行内样式，不依赖 class、`<style>` 或站点 CSS。
- 第一阶段只做 8-10 套经过严格验收的精品模板，不追求几十套换色模板。

## 2. 本地参考项目拆解

### 2.1 doocs/md

本地来源：`对标github/md-main.zip`

#### 技术结构

`doocs/md` 是 Vue 3 + TypeScript 的 monorepo，排版核心主要分布在：

- `packages/core/src/renderer/`：Markdown 到语义 HTML。
- `packages/core/src/extensions/`：引用、脚注、提示块、图表、公式等扩展。
- `packages/core/src/theme/`：CSS 变量、主题应用、CSS 处理和注入。
- `packages/shared/src/configs/theme-css/`：基础主题 CSS。
- `apps/web/src/services/export/clipboard.ts`：复制到微信前的最终处理。
- `apps/web/src/services/export/clipboard-dom.ts`：微信兼容 DOM 修正。
- `apps/web/src/lib/browser/clipboard.ts`：富文本剪贴板与降级方案。

其核心数据流为：

```text
Markdown
  -> marked + 自定义扩展
  -> HTML 净化
  -> 主题 CSS 注入（用于预览）
  -> juice 将 CSS 转成行内样式（用于复制）
  -> 微信兼容 DOM 修正
  -> ClipboardItem(text/html + text/plain)
```

#### 值得吸收的设计

1. 渲染核心与产品 UI 分离。编辑器、主题、导出不是一个组件里的字符串函数。
2. 主题由基础 CSS、主题 CSS、用户参数和自定义覆盖分层合并。
3. 复制前克隆预览 DOM，再执行样式内联和微信兼容修正，不污染编辑状态。
4. 富文本剪贴板同时写入 `text/html` 和 `text/plain`。
5. 对嵌套列表、图片宽高、锚点链接、异步图表、SVG 等做专门兼容处理。
6. 核心渲染器和剪贴板转换都有自动化测试。

#### 不宜直接照搬的部分

- 项目使用 Vue、Pinia、CodeMirror，与排版猫的 Next.js、React、Tiptap 不同，整包接入成本高。
- 其主题先走 CSS，再通过 `juice` 内联；排版猫首期主题数量较少，可直接从主题令牌生成行内样式，结果更可控。
- Mermaid、KaTeX、PlantUML 等功能不是排版猫当前公众号副业用户的核心需求，不应让它们扩大首期包体和测试面。

#### 许可

压缩包根目录许可证为 WTFPL，许可非常宽松。但排版猫仍建议只吸收架构思想，按自己的技术栈重写核心模块，避免把参考项目的复杂依赖一起带入。

### 2.2 xiaohu-wechat-format

本地来源：`对标github/xiaohu-wechat-format-main.zip`

#### 技术结构

该项目的核心集中在 `scripts/format.py`，主要流程为：

```text
Markdown / 纯文本
  -> 中文标点与中英文空格修复
  -> 可选 AI 语义增强
  -> 围栏容器转换（对话、数据、步骤、对比、导语等）
  -> Markdown 转 HTML
  -> 外链转脚注
  -> JSON 主题解析
  -> 行内样式注入
  -> 列表、引用、表格、图片、暗色模式兼容
  -> 主题画廊预览和富文本复制
```

项目包含 85 个 JSON 主题。本地运行 `scripts/theme_lint.py` 后，85 个主题全部通过字号和层级规则；其中 39 个主题包含暗色模式配置，46 个主题仍有暗色模式缺失提示。布局统计为：

- 标准布局：63 个。
- Hero 布局：16 个。
- 卡片布局：5 个。
- 时间线布局：1 个。

#### 值得吸收的设计

1. AI 只添加语义标记，不应改写原文；处理后还会检查原文长度偏差。
2. 将“步骤、对话、数据、对比、导语、结尾、作者总结”等建模为独立内容容器。
3. 主题使用 JSON 配置，而不是把所有样式写死在组件里。
4. 支持标题的外层、前缀、正文、后缀四段式装饰，能做出比单一 `h2` 更丰富的标题。
5. 对中文标点、中英文间距、加粗标点位置进行预处理。
6. 提供主题 lint，检查标题字号倒置、正文字号、行高和移动端标题过大等问题。
7. 将 `blockquote` 和原生列表转成更稳定的 `section/span` 结构，降低微信后台重写样式的概率。

#### 不宜直接照搬的部分

- 主要逻辑集中在一个约 3000 行的 Python 文件，解析、样式、输出和 CLI 耦合较深。
- 大量 HTML 处理依赖正则，复杂嵌套结构容易误匹配。
- 围栏容器样式部分硬编码在 Python 中，没有全部纳入主题系统。
- 85 个主题中存在较多“同结构换色”，不适合排版猫首期商业产品的精品路线。
- 它的 AI 结构增强只允许少量标记，尚不足以成为完整的文章结构模型。

#### 许可

README 声明 MIT，但本地压缩包根目录没有独立 `LICENSE` 文件。在确认上游许可证文件和对应提交前，只把该项目作为设计参考，不直接复制源码或主题 JSON。

## 3. 排版猫当前实现与主要缺口

当前实现主要位于：

- `src/lib/ai/wechat-layout.ts`
- `src/components/editor/wechat-editor.tsx`
- `src/app/api/generate/wechat-layout/route.ts`

已有能力：

- Tiptap 富文本编辑。
- 本地规则识别部分主标题、一级小标题和二级小标题。
- AI 返回公众号 HTML。
- 5 个排版用途入口。
- 富文本剪贴板写入和 HTML 下载。
- 标题层级和正文背景最近已做基础修复。

当前核心问题：

1. `wechat-editor.tsx` 同时承担编辑、结构识别、模板、样式、复制和导出，后续维护成本会快速上升。
2. 5 个“模板”目前主要是内容处理规则，不是真正独立的视觉主题。
3. AI 直接返回 HTML，结构、原文和视觉样式混在一起，难以稳定复现和二次编辑。
4. 本地规则按空行和短句猜标题，较长文章容易误判。
5. 所有主题共用一套 `wechatCopyStyles`，无法满足不同文章类型。
6. 预览依赖 Tailwind 选择器，复制依赖另一份字符串样式，两套结果可能继续漂移。
7. 复制时使用正则改标签和样式，对嵌套元素、已有 style 和不规范 HTML 的处理不稳。
8. 暂无主题 schema、主题 lint、微信兼容审计和文章回归样本。
9. 当前正文每段都有浅绿背景，容易形成“每一段都是卡片”的视觉疲劳，也造成用户反馈的通篇背景不一致问题。

## 4. 排版猫自有引擎架构

### 4.1 总体管线

```text
纯文本 / Markdown / Tiptap JSON / 五入口公众号结果
  -> Input Adapter 输入适配
  -> Structure Analyzer 结构识别
  -> ArticleDocument 标准文章模型
  -> Semantic Enhancer 语义增强（可选 AI）
  -> Theme Resolver 主题与用户参数解析
  -> WeChat Renderer 行内样式渲染
  -> Compatibility Sanitizer 微信兼容清理
  -> Layout Audit 排版质检
  -> Preview / Clipboard / Download / Save
```

原则：

- 内容结构与视觉样式分开。
- AI 输出结构化 JSON，不输出最终 HTML。
- 原文内容默认只移动、分段和标注；任何改写都必须由用户单独触发。
- 同一份最终 HTML 同时用于手机预览、复制和下载。
- 所有主题都经过相同的微信兼容和质检链路。

### 4.2 标准文章模型

建议定义 `ArticleDocument`：

```ts
type ArticleDocument = {
  version: 1;
  title: string;
  subtitle?: string;
  author?: string;
  blocks: ArticleBlock[];
  source: {
    type: "plain" | "markdown" | "tiptap" | "generated";
    fingerprint: string;
  };
};

type ArticleBlock =
  | { id: string; type: "lead"; text: string }
  | { id: string; type: "heading"; level: 2 | 3; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "quote"; text: string; source?: string }
  | { id: string; type: "callout"; tone: "info" | "tip" | "important" | "warning"; title?: string; text: string }
  | { id: string; type: "list"; ordered: boolean; items: string[] }
  | { id: string; type: "steps"; title?: string; items: string[] }
  | { id: string; type: "compare"; title?: string; left: string[]; right: string[] }
  | { id: string; type: "dialogue"; title?: string; items: Array<{ speaker: string; text: string }> }
  | { id: string; type: "stat"; value: string; label: string }
  | { id: string; type: "image"; src: string; alt?: string; caption?: string }
  | { id: string; type: "imageGroup"; images: Array<{ src: string; alt?: string }> }
  | { id: string; type: "cta"; title?: string; text: string }
  | { id: string; type: "divider" }
  | { id: string; type: "byline"; author?: string; text: string };
```

这样做后，同一篇文章换模板只重新渲染，不再重新调用 AI，也不会改变原文。

### 4.3 AI 主编的职责边界

AI 主编改为两阶段：

第一阶段，结构分析：

- 判断文章类型：观点、教程、案例、行业分析、访谈、故事、产品介绍、私域转化。
- 标记标题层级、导语、重点结论、清单、引用、数据、步骤、对比和 CTA。
- 为每个块返回原文范围或块 ID，不能自由生成整篇 HTML。
- 返回推荐主题和推荐理由。

第二阶段，排版建议：

- 控制高亮密度，默认每 600 字不超过 2 个重点框。
- 控制强调密度，全文加粗文字不超过正文的 8%。
- 控制标题密度，连续 3 个短段落不能全部变成标题。
- 私域转化文可以识别 CTA，但不自动新增夸张营销内容。
- 所有结构化结果通过 Zod schema 校验，并检查原文覆盖率和顺序。

AI 失败时，本地结构分析器仍可产出可用结果，且不阻塞用户排版。

## 5. 主题系统

### 5.1 主题不等于颜色

每个主题由三部分构成：

1. 主题令牌：字体、字号、行高、段间距、颜色、圆角、边框和留白。
2. 组件配方：标题、导语、正文、引用、清单、步骤、数据、图片说明和 CTA 的结构与样式。
3. 适用规则：适合的文章类型、禁用组件、推荐强调密度和手机端限制。

建议主题结构：

```ts
type WechatTheme = {
  id: string;
  version: number;
  name: string;
  description: string;
  category: "general" | "opinion" | "tutorial" | "private" | "report" | "story";
  tokens: {
    colors: Record<string, string>;
    typography: Record<string, string | number>;
    spacing: Record<string, string | number>;
  };
  recipes: Record<ArticleBlock["type"] | "title", StyleRecipe>;
  limits: {
    maxColors: number;
    maxHeadingSize: number;
    minBodySize: number;
    minLineHeight: number;
  };
};
```

### 5.2 首批精品模板

建议首发 10 套，每套必须有明显的结构差异：

1. 排版猫经典绿：老用户默认模板，清爽、克制、有品牌识别。
2. 清爽阅读：通用长文，白底、无段落卡片、舒适留白。
3. 深度专栏：适合观点和行业分析，导语、引用、层级更强。
4. 教程清单：强化步骤、编号、注意事项和总结。
5. 私域转化：强化信任、案例和克制 CTA，不做廉价营销色块。
6. 行业报告：强化数据、表格、结论和信息来源。
7. 访谈对话：强化角色、问答和金句。
8. 故事叙事：弱化卡片，强化章节节奏和场景留白。
9. 产品介绍：强化问题、方案、优势、适合人群和行动区。
10. 新闻资讯：强化时间、事件、背景、影响和引用来源。

主题画廊必须使用用户当前文章生成 375px 手机宽度预览，不能只用固定示例图。

### 5.3 用户可调参数

普通用户只显示：

- 正文字号：15 / 16 / 17px。
- 行高：1.7 / 1.8 / 1.9 / 2.0。
- 段落间距：紧凑 / 标准 / 舒展。
- 主色：预设色板。
- 首行缩进：开 / 关。
- 两端对齐：开 / 关。

高级设置再提供标题样式、引用样式、图片圆角和自定义色。首期不向普通用户开放 CSS 编辑器。

## 6. 微信兼容渲染策略

### 6.1 内部编辑与微信导出分离

- Tiptap 内部继续使用语义节点，方便编辑、撤销和保存。
- 导出时将 `ArticleDocument` 渲染为微信稳定结构。
- 标题视觉可以使用 `section + span` 输出，不依赖微信对 `h1/h2/h3` 的默认处理。
- 引用块导出为 `section`，避免微信后台重写 `blockquote`。
- 列表可以在简单场景保留 `ol/ul`；嵌套或装饰列表导出为 `section + span`。

### 6.2 最终 HTML 规则

- 不包含 `<script>`、`<style>`、`iframe`、`form`。
- 不依赖 class、id 或站点 CSS。
- 所有视觉样式均为行内样式。
- CSS 属性使用白名单，拒绝不稳定或危险属性。
- 全文背景由一个根 `section` 包裹，确保背景覆盖整篇文章，而不是只覆盖首段。
- 普通正文默认透明或白底，只有导语、引用、提示和 CTA 使用背景色。
- 最多 3 个主视觉颜色；正文颜色与背景对比度合格。
- 图片统一处理宽高属性、最大宽度、显示方式和说明文字。
- 外链根据设置保留、转脚注或移除，公众号链接可保留。
- 表格按列数选择自然布局或移动端压缩策略。

### 6.3 剪贴板策略

复制顺序：

1. 生成并审计最终微信 HTML。
2. 使用 `ClipboardItem` 同时写入 `text/html` 和 `text/plain`。
3. Clipboard API 失败时，使用隐藏的 375px 可选择容器 + `execCommand("copy")`。
4. 再失败时提供明确提示和“下载 HTML”兜底，不能静默降级成复制 HTML 源码。

## 7. 排版质检

新增 `LayoutAuditReport`，每次预览和复制前执行：

- 标题层级是否倒置。
- 是否只有一个文章主标题。
- 正文字号是否在 15-17px。
- 正文行高是否至少 1.7。
- H2 是否明显大于正文，H3 是否不小于正文。
- 标题是否过长，是否在手机端预计超过 3 行。
- 是否存在连续大色块或每段都带背景。
- 主题颜色是否超过 3 个主色。
- 加粗和高亮是否过密。
- 是否有空段、空标题、孤立列表或无内容引用。
- 是否存在 class、`<style>`、危险标签、非白名单 CSS。
- 图片、表格、长链接是否可能超出 375px。
- 复制后的 HTML 是否仍包含完整正文和根背景容器。

主题 lint 应成为 CI 的一部分，任何主题不通过硬规则都不能上线。

## 8. 代码模块建议

```text
src/lib/wechat-layout/
  types.ts                 # ArticleDocument、ArticleBlock、Theme 类型
  schemas.ts               # Zod 校验
  adapters/
    plain-text.ts
    markdown.ts
    tiptap.ts
    generated-content.ts
  structure/
    local-analyzer.ts
    ai-analyzer.ts
    merge-analysis.ts
  themes/
    index.ts
    classic-green.ts
    clean-reading.ts
    deep-column.ts
    tutorial-list.ts
    private-conversion.ts
    ...
  render/
    recipes.ts
    inline-style.ts
    wechat-renderer.ts
  compatibility/
    sanitize.ts
    links.ts
    lists.ts
    images.ts
    tables.ts
  audit/
    document-audit.ts
    theme-lint.ts
    html-audit.ts
  export/
    clipboard.ts
    download.ts
  fixtures/
    opinion.ts
    tutorial.ts
    interview.ts
    report.ts
    private.ts

src/components/editor/layout/
  template-gallery.tsx
  style-panel.tsx
  mobile-preview.tsx
  layout-audit-panel.tsx
```

现有 `src/lib/ai/wechat-layout.ts` 最终只负责调用 AI 结构分析，不再保存主题 CSS 或拼接最终 HTML。现有编辑器组件只负责编排状态和交互。

## 9. 数据保存与版本兼容

短期可继续使用 `ContentVariant.metadata`，保存：

```json
{
  "wechatLayout": {
    "document": {},
    "themeId": "classic-green",
    "themeVersion": 1,
    "overrides": {},
    "renderedHtml": "...",
    "renderedHash": "...",
    "updatedAt": "..."
  }
}
```

后续再根据使用量决定是否拆分独立表。主题必须带版本号，旧文章继续使用保存时的主题版本，避免主题升级后历史文章突然变样。

## 10. 开发顺序

### 第一阶段：替换核心链路

- 建立 `ArticleDocument`、schema 和 Tiptap/纯文本适配器。
- 建立直接输出行内样式的微信 renderer。
- 建立净化、列表、引用、图片和剪贴板兼容模块。
- 将预览与复制统一到同一份最终 HTML。
- 上线排版猫经典绿、清爽阅读、深度专栏、教程清单、私域转化 5 套模板。

### 第二阶段：AI 结构化精排

- AI 改为输出块级标注和主题推荐。
- 增加原文覆盖率、顺序和内容完整性校验。
- 增加排版前后对比、撤销 AI 精排。
- 扩展到 10 套精品模板。

### 第三阶段：质量与兼容测试

- 建立至少 20 篇固定回归文章，覆盖观点、教程、访谈、报告、故事、私域转化和长图文。
- 在 Windows Chrome、Edge 和 macOS Safari 验证富文本复制。
- 在微信公众号后台验证标题、背景、引用、列表、图片和表格。
- 将主题 lint、HTML audit、复制 DOM 测试接入 CI。

### 第四阶段：老用户增强

- 支持从 Word、飞书、Notion 和 Markdown 粘贴并清理格式。
- 支持用户保存品牌色、常用模板和默认字号。
- 支持“我的排版模板”与账号档案绑定。
- 支持图片上传后自动转存和公众号素材适配。

## 11. 首期验收标准

1. 用户可在 3 步内完成：粘贴文章 -> 选择模板/AI 精排 -> 复制到公众号后台。
2. 同一文章切换模板不重新调用 AI、不改变正文内容。
3. 主标题、H2、H3、正文四级视觉明显不同。
4. 全文背景容器覆盖完整文章，不出现只覆盖首行或首段。
5. 普通正文不再每段都使用色块背景。
6. 复制到微信后，标题、引用、列表、图片、段距和主题色与预览基本一致。
7. 最终 HTML 无 class、无 `<style>`、无危险标签。
8. 任一 AI 超时或失败时，本地排版在 1 秒内返回可用结果。
9. 20 篇回归文章全部通过结构、主题和微信 HTML 质检。
10. 每个模板都有明确适用场景，不存在只换颜色的重复模板。

## 12. 最终技术决策

- 保留 Tiptap 作为交互编辑器。
- 新增自有 `ArticleDocument` 作为排版引擎中间层。
- Markdown 输入可后续引入轻量解析器，但不导入 `doocs/md` 整个 monorepo。
- 主题使用 TypeScript schema + 令牌 + 组件配方，不直接复制参考项目主题文件。
- 最终渲染直接生成行内样式，避免预览 CSS 与复制 CSS 两套逻辑。
- HTML 清理和转换使用 DOM/AST 方式，正则只用于很小的文本规则。
- AI 只做结构标注、主题推荐和有限排版建议，不直接生成最终 HTML。

这套方案能够把排版猫从“带几个排版按钮的编辑器”升级成“面向微信公众号的结构化排版引擎”，也为后续用户模板、品牌样式、账号档案和自动发布留下稳定扩展点。
