"use client";

import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Bold,
  CheckCircle2,
  Copy,
  Download,
  FileCode2,
  Heading1,
  Heading2,
  Images,
  List,
  ListOrdered,
  Loader2,
  Palette,
  Pilcrow,
  Quote,
  RemoveFormatting,
  Save,
  SeparatorHorizontal,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { contentEntries, type ContentEntry } from "@/lib/content/entries";

type Variant = {
  id?: string;
  entry: ContentEntry;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
};

type Project = {
  id: string;
  title: string;
  status: string;
  variants: Variant[];
};

type EntryDraft = {
  title: string;
  body: string;
};

type ImagePromptResult = {
  output: {
    prompts: string[];
  };
};

type GeneratedImage = {
  prompt: string;
  url?: string;
  b64Json?: string;
  mimeType?: string;
  revisedPrompt?: string;
};

type ImageGenerationResult = {
  output: {
    images: GeneratedImage[];
    provider: string;
    model: string;
  };
};

type RewriteResult = {
  output: {
    title: string;
    body: string;
    provider: string;
    model: string;
  };
  fallback?: boolean;
  aiError?: string | null;
};

type WechatLayoutTemplateId = "clean" | "deep" | "private" | "checklist" | "editorial";

type WechatLayoutResult = {
  output: {
    title: string;
    html: string;
    notes: string[];
    provider: string;
    model: string;
  };
  fallback?: boolean;
  aiError?: string | null;
};

const starterContent = `
<h1>普通人做公众号副业还有机会吗？</h1>
<p>这是一篇公众号文章草稿。你可以在这里编辑正文，然后复制公众号 HTML 到微信公众平台。</p>
<h2>为什么这个选题值得写？</h2>
<p>它同时适合公众号长文、小绿书短图文、搜一搜关键词、问一问回答和朋友圈转发。</p>
`;

const editableEntries = contentEntries.filter((entry) => !["wechat_article", "green_note"].includes(entry.id));
const imageGenerationEnabled = process.env.NEXT_PUBLIC_IMAGE_GENERATION_ENABLED === "true" || process.env.NEXT_PUBLIC_IMAGE_GENERATION_ENABLED === "1";

const wechatLayoutTemplates: Array<{
  id: WechatLayoutTemplateId;
  label: string;
  description: string;
}> = [
  {
    id: "clean",
    label: "清爽长文",
    description: "适合常规公众号文章，标题、正文和小标题层次清楚。",
  },
  {
    id: "deep",
    label: "深度观点",
    description: "适合观点文，开头增加导读引用，正文更有专栏感。",
  },
  {
    id: "private",
    label: "私域转化",
    description: "适合带咨询、资料包、社群引导的内容，结尾 CTA 更醒目。",
  },
  {
    id: "checklist",
    label: "教程清单",
    description: "适合步骤、方法、避坑清单，把连续短句整理成列表。",
  },
  {
    id: "editorial",
    label: "AI 主编精排",
    description: "自动识别导语、重点句、引用、清单和结尾行动区。",
  },
];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) {
        return "";
      }
      if (trimmed.startsWith("# ")) {
        return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
      }
      if (trimmed.startsWith("## ")) {
        return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
      }
      return `<p>${escapeHtml(trimmed).replaceAll("\n", "<br />")}</p>`;
    })
    .join("\n");
}

function isLikelySubheading(block: string) {
  const plainBlock = block.replace(/\s+/g, "");
  return plainBlock.length <= 24 && !/[。！？!?；;，,、]$/.test(plainBlock);
}

function textToListHtml(block: string) {
  const items = block
    .split(/\n|[；;]/)
    .map((line) => line.replace(/^[-*•\d.、\s]+/, "").trim())
    .filter(Boolean);

  if (items.length < 2) {
    return "";
  }

  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderWechatBlock(block: string, index: number, templateId: WechatLayoutTemplateId) {
  const safeBlock = escapeHtml(block).replaceAll("\n", "<br />");

  if (index === 0) {
    return `<h1>${safeBlock}</h1>`;
  }

  if (isLikelySubheading(block)) {
    return `<h2>${safeBlock}</h2>`;
  }

  if (templateId === "checklist") {
    const listHtml = textToListHtml(block);
    if (listHtml) {
      return listHtml;
    }
  }

  return `<p>${safeBlock}</p>`;
}

function textToWechatLayout(value: string, templateId: WechatLayoutTemplateId = "clean") {
  const blocks = value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) {
    return starterContent;
  }

  const [title, intro, ...rest] = blocks;
  const renderedBody = blocks.map((block, index) => renderWechatBlock(block, index, templateId));

  if (templateId === "deep") {
    const body = [
      renderWechatBlock(title, 0, templateId),
      intro ? `<blockquote>${escapeHtml(intro).replaceAll("\n", "<br />")}</blockquote>` : "",
      ...rest.map((block, index) => renderWechatBlock(block, index + 2, templateId)),
    ].filter(Boolean);
    return body.join("\n");
  }

  if (templateId === "private") {
    if (blocks.length <= 1) {
      return renderedBody.join("\n");
    }

    const last = blocks.at(-1);
    const body = renderedBody.slice(0, -1);
    return [
      ...body,
      "<hr />",
      last ? `<blockquote><strong>最后提醒：</strong><br />${escapeHtml(last).replaceAll("\n", "<br />")}</blockquote>` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (templateId === "checklist") {
    return renderedBody.join("\n");
  }

  return renderedBody.join("\n");
}

function toolbarButtonClass(active = false) {
  return [
    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition",
    active
      ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800",
  ].join(" ");
}

function htmlToText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|li)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function htmlToMarkdown(value: string) {
  if (typeof window === "undefined") {
    return htmlToText(value);
  }

  const document = new DOMParser().parseFromString(value, "text/html");

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (!(node instanceof HTMLElement)) {
      return Array.from(node.childNodes).map(walk).join("");
    }

    const children = Array.from(node.childNodes).map(walk).join("").trim();

    switch (node.tagName.toLowerCase()) {
      case "h1":
        return `# ${children}\n\n`;
      case "h2":
        return `## ${children}\n\n`;
      case "h3":
        return `### ${children}\n\n`;
      case "p":
        return children ? `${children}\n\n` : "";
      case "br":
        return "\n";
      case "strong":
      case "b":
        return `**${children}**`;
      case "em":
      case "i":
        return `*${children}*`;
      case "blockquote":
        return children
          .split("\n")
          .filter(Boolean)
          .map((line) => `> ${line}`)
          .join("\n")
          .concat("\n\n");
      case "li":
        return `- ${children}\n`;
      case "ul":
        return `${children}\n`;
      case "ol":
        return Array.from(node.children)
          .map((child, index) => `${index + 1}. ${walk(child).replace(/^- /, "").trim()}`)
          .join("\n")
          .concat("\n\n");
      case "a": {
        const href = node.getAttribute("href");
        return href ? `[${children}](${href})` : children;
      }
      default:
        return children;
    }
  }

  return Array.from(document.body.childNodes)
    .map(walk)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildDownloadHtml(title: string, bodyHtml: string) {
  return [
    "<!doctype html>",
    '<html lang="zh-CN">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(title)}</title>`,
    "</head>",
    '<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; line-height: 1.8; color: #0f172a;">',
    bodyHtml,
    "</body>",
    "</html>",
  ].join("\n");
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getImagePrompts(variant?: Variant) {
  const prompts = variant?.metadata?.imagePrompts;
  return Array.isArray(prompts) ? prompts.filter((item): item is string => typeof item === "string") : [];
}

function getGeneratedImages(variant?: Variant) {
  const images = variant?.metadata?.generatedImages;
  if (!Array.isArray(images)) {
    return [];
  }

  return images.filter((item): item is GeneratedImage => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const image = item as GeneratedImage;
    return typeof image.prompt === "string" && (typeof image.url === "string" || typeof image.b64Json === "string");
  });
}

function getImageSrc(image: GeneratedImage) {
  if (image.url) {
    return image.url;
  }

  return image.b64Json ? `data:${image.mimeType || "image/png"};base64,${image.b64Json}` : "";
}

function getImageShareText(image: GeneratedImage) {
  return image.url || getImageSrc(image);
}

function getKeywords(variant?: Variant) {
  const keywords = variant?.metadata?.keywords;
  return Array.isArray(keywords) ? keywords.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function getGreenNotePageCount(variant?: Variant) {
  const pages = variant?.metadata?.pages;
  if (pages === 3 || pages === 6 || pages === 9) {
    return pages;
  }

  const promptCount = getImagePrompts(variant).length;
  return promptCount === 6 || promptCount === 9 ? promptCount : 3;
}

function getStoredHtml(variant?: Variant) {
  const html = variant?.metadata?.html;
  return typeof html === "string" && html.trim() ? html : null;
}

function splitPromptDraft(value: string) {
  return value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getEntryLabel(entry: ContentEntry) {
  return contentEntries.find((item) => item.id === entry)?.label || entry;
}

function getEntrySummary(entry: ContentEntry) {
  return contentEntries.find((item) => item.id === entry)?.summary || "";
}

function getDefaultDrafts(project?: Project | null) {
  return editableEntries.reduce<Record<string, EntryDraft>>((drafts, entry) => {
    const variant = project?.variants.find((item) => item.entry === entry.id);
    drafts[entry.id] = {
      title: variant?.title || "",
      body: variant?.body || "",
    };
    return drafts;
  }, {});
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

export function WechatEditor() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") || "";
  const [project, setProject] = useState<Project | null>(null);
  const [notice, setNotice] = useState("");
  const [html, setHtml] = useState(starterContent);
  const [mode, setMode] = useState<ContentEntry>("wechat_article");
  const [greenTitle, setGreenTitle] = useState("");
  const [greenBody, setGreenBody] = useState("");
  const [greenPageCount, setGreenPageCount] = useState<3 | 6 | 9>(3);
  const [imagePromptDraft, setImagePromptDraft] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [imageScene, setImageScene] = useState("green_note_pages");
  const [imageStyle, setImageStyle] = useState("轻量微信绿色工作台风格，清爽留白，适合中文图文");
  const [layoutTemplate, setLayoutTemplate] = useState<WechatLayoutTemplateId>("clean");
  const [entryDrafts, setEntryDrafts] = useState<Record<string, EntryDraft>>(() => getDefaultDrafts());
  const [loading, setLoading] = useState(() => Boolean(projectId));
  const [saving, setSaving] = useState(false);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [layouting, setLayouting] = useState(false);
  const [showMoreEditorTools, setShowMoreEditorTools] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: "在这里编辑公众号文章，首版支持复制 HTML 到微信公众平台。",
      }),
    ],
    content: starterContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[560px] rounded-lg border border-emerald-100 bg-white px-5 py-4 text-base leading-8 outline-none focus:border-emerald-300 [&_blockquote]:my-5 [&_blockquote]:rounded-r-lg [&_blockquote]:border-l-4 [&_blockquote]:border-emerald-300 [&_blockquote]:bg-emerald-50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-emerald-950 [&_h1]:mb-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-10 [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:border-l-4 [&_h2]:border-emerald-400 [&_h2]:pl-3 [&_h2]:text-xl [&_h2]:font-semibold [&_hr]:my-7 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-dashed [&_hr]:border-emerald-200 [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_strong]:rounded [&_strong]:bg-emerald-50 [&_strong]:px-1 [&_strong]:font-semibold [&_strong]:text-emerald-900 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6",
      },
    },
    onUpdate: ({ editor: current }) => {
      setHtml(current.getHTML());
    },
  });

  useEffect(() => {
    if (!projectId || !editor) {
      return;
    }

    fetch(`/api/projects/${projectId}`)
      .then((response) => readJson<{ project: Project }>(response))
      .then((data) => {
        const wechat = data.project.variants.find((variant) => variant.entry === "wechat_article");
        const greenNote = data.project.variants.find((variant) => variant.entry === "green_note");
        const content = getStoredHtml(wechat) || (wechat ? textToHtml(wechat.body) : starterContent);
        setProject(data.project);
        setEntryDrafts(getDefaultDrafts(data.project));
        setGreenTitle(greenNote?.title || "");
        setGreenBody(greenNote?.body || "");
        setGreenPageCount(getGreenNotePageCount(greenNote));
        setImagePromptDraft(getImagePrompts(greenNote).join("\n\n"));
        setGeneratedImages(getGeneratedImages(greenNote));
        editor.commands.setContent(content);
        setHtml(content);
        setNotice("已载入内容项目。");
      })
      .catch((error: Error) => setNotice(error.message))
      .finally(() => setLoading(false));
  }, [editor, projectId]);

  const wechatVariant = useMemo(() => project?.variants.find((variant) => variant.entry === "wechat_article"), [project]);
  const greenNoteVariant = useMemo(() => project?.variants.find((variant) => variant.entry === "green_note"), [project]);
  const currentGenericDraft = entryDrafts[mode] || { title: "", body: "" };
  const imagePrompts = useMemo(() => splitPromptDraft(imagePromptDraft), [imagePromptDraft]);
  const searchKeywords = useMemo(() => getKeywords(project?.variants.find((variant) => variant.entry === "search")), [project]);

  function updateEntryDraft(entry: ContentEntry, patch: Partial<EntryDraft>) {
    setEntryDrafts((current) => ({
      ...current,
      [entry]: {
        ...(current[entry] || { title: "", body: "" }),
        ...patch,
      },
    }));
  }

  function getCurrentPlainText() {
    if (!editor) {
      return "";
    }

    if (mode === "wechat_article") {
      return editor.getText();
    }

    if (mode === "green_note") {
      return greenBody;
    }

    return currentGenericDraft.body;
  }

  function getCurrentTitle() {
    if (mode === "wechat_article") {
      return wechatVariant?.title || project?.title || "公众号文章";
    }

    if (mode === "green_note") {
      return greenTitle || greenNoteVariant?.title || project?.title || "小绿书图文";
    }

    return currentGenericDraft.title || `${project?.title || "内容项目"} - ${getEntryLabel(mode)}`;
  }

  async function copyHtml() {
    if (!editor) return;
    await navigator.clipboard.writeText(editor.getHTML());
    setNotice("已复制公众号排版内容。下一步：打开微信公众平台图文编辑器，在正文区域直接粘贴。");
  }

  function applyWechatLayout() {
    if (!editor) {
      return;
    }

    const text = editor.getText().trim();
    if (text.length < 2) {
      setNotice("请先粘贴或生成公众号正文，再使用一键排版。");
      return;
    }

    const nextHtml = textToWechatLayout(text, layoutTemplate);
    editor.commands.setContent(nextHtml);
    setHtml(nextHtml);
    const template = wechatLayoutTemplates.find((item) => item.id === layoutTemplate);
    setNotice(`已套用「${template?.label || "清爽长文"}」排版模板，可继续微调标题、引用和列表，再复制到公众号后台。`);
  }

  async function applyAiWechatLayout() {
    if (!editor) {
      return;
    }

    const content = editor.getText().trim();
    if (content.length < 20) {
      setNotice("正文至少需要 20 个字，才能使用 AI 精排。");
      return;
    }

    setLayouting(true);
    setNotice("AI 主编正在识别标题、重点句、引用、清单和结尾 CTA。");
    try {
      const data = await readJson<WechatLayoutResult>(
        await fetch("/api/generate/wechat-layout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: getCurrentTitle(),
            content,
            template: layoutTemplate,
          }),
        }),
      );
      editor.commands.setContent(data.output.html);
      setHtml(data.output.html);
      setNotice(
        data.fallback
          ? `已用本地规则完成排版。${data.output.notes.join("；")}`
          : `AI 精排已完成：${data.output.notes.join("；")}`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI 精排失败。");
    } finally {
      setLayouting(false);
    }
  }

  async function copyText() {
    const text = getCurrentPlainText();
    await navigator.clipboard.writeText(text);
    setNotice(`${getEntryLabel(mode)}纯文本已复制。`);
  }

  async function copyMarkdown() {
    if (!editor) return;
    await navigator.clipboard.writeText(htmlToMarkdown(editor.getHTML()));
    setNotice("Markdown 已复制。");
  }

  function downloadHtml() {
    if (!editor) return;
    const title = getCurrentTitle();
    downloadTextFile(`${title}.html`, buildDownloadHtml(title, editor.getHTML()), "text/html;charset=utf-8");
    setNotice("HTML 文件已下载。");
  }

  async function copyImagePrompts() {
    await navigator.clipboard.writeText(imagePrompts.join("\n\n"));
    setNotice("小绿书图片提示词已复制。");
  }

  async function copyImagePrompt(prompt: string, index: number) {
    await navigator.clipboard.writeText(prompt);
    setNotice(`第 ${index + 1} 条图片提示词已复制。`);
  }

  async function generateImagePrompts() {
    const topic = (greenTitle || project?.title || "").trim();

    if (topic.length < 2) {
      setNotice("请先填写小绿书标题，或者从内容项目进入编辑器。");
      return;
    }

    setGeneratingPrompts(true);
    try {
      const data = await readJson<ImagePromptResult>(
        await fetch("/api/generate/image-prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            scene: imageScene,
            pageCount: greenPageCount,
            style: imageStyle,
          }),
        }),
      );
      setImagePromptDraft(data.output.prompts.join("\n\n"));
      setNotice("图片提示词已生成，可继续编辑或逐条复制。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "图片提示词生成失败。");
    } finally {
      setGeneratingPrompts(false);
    }
  }

  async function generateGreenNoteImages() {
    if (!imageGenerationEnabled) {
      setNotice("图片生成点数包即将上线，当前套餐暂不包含 Gemini 生图。你可以先复制图片提示词。");
      return;
    }

    if (!imagePrompts.length) {
      setNotice("请先生成或填写小绿书图片提示词。");
      return;
    }

    setGeneratingImages(true);
    try {
      const data = await readJson<ImageGenerationResult>(
        await fetch("/api/generate/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompts: imagePrompts,
            size: "1024x1536",
            quality: "auto",
            responseFormat: "url",
            outputFormat: "png",
          }),
        }),
      );
      setGeneratedImages(data.output.images);
      setNotice(`已生成 ${data.output.images.length} 张小绿书图片。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "小绿书图片生成失败。");
    } finally {
      setGeneratingImages(false);
    }
  }

  async function copyGeneratedImage(image: GeneratedImage, index: number) {
    await navigator.clipboard.writeText(getImageShareText(image));
    setNotice(`第 ${index + 1} 张图片地址已复制。`);
  }

  async function copyAllGeneratedImages() {
    await navigator.clipboard.writeText(generatedImages.map(getImageShareText).filter(Boolean).join("\n"));
    setNotice("全部图片地址已复制。");
  }

  async function copyGreenNote() {
    const promptSection = imagePrompts.length
      ? ["", `图片页提示词（${greenPageCount} 页结构）`, ...imagePrompts.map((prompt, index) => `第 ${index + 1} 页：${prompt}`)].join("\n")
      : "";
    const imageSection = generatedImages.length
      ? ["", "已生成图片", ...generatedImages.map((image, index) => `第 ${index + 1} 张：${getImageShareText(image)}`)].join("\n")
      : "";
    await navigator.clipboard.writeText(`${greenTitle}\n\n${greenBody}${promptSection}${imageSection}`.trim());
    setNotice("小绿书文案已复制。");
  }

  async function copyCurrentEntryPackage() {
    const title = getCurrentTitle();
    const body = getCurrentPlainText();
    await navigator.clipboard.writeText(`${title}\n\n${body}`.trim());
    setNotice(`${getEntryLabel(mode)}内容包已复制。`);
  }

  async function saveProject() {
    if (!editor || !project) {
      setNotice("当前没有关联内容项目，可直接复制内容使用。");
      return;
    }

    setSaving(true);
    try {
      const nextVariants = project.variants.map((variant) => {
        if (variant.entry === "wechat_article") {
          return {
            entry: variant.entry,
            title: wechatVariant?.title || project.title,
            body: htmlToText(editor.getHTML()),
            metadata: { ...(variant.metadata || {}), html: editor.getHTML(), editedAt: new Date().toISOString() },
          };
        }

        if (variant.entry === "green_note") {
          return {
            entry: variant.entry,
            title: greenTitle || variant.title,
            body: greenBody || variant.body,
            metadata: {
              ...(variant.metadata || {}),
              pages: greenPageCount,
              imagePrompts,
              generatedImages,
              editedAt: new Date().toISOString(),
            },
          };
        }

        const draft = entryDrafts[variant.entry] || { title: variant.title, body: variant.body };
        return {
          entry: variant.entry,
          title: draft.title || variant.title,
          body: draft.body || variant.body,
          metadata: { ...(variant.metadata || {}), editedAt: new Date().toISOString() },
        };
      });

      const data = await readJson<{ project: Project }>(
        await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: project.title,
            status: "editing",
            variants: nextVariants,
          }),
        }),
      );
      setProject(data.project);
      setEntryDrafts(getDefaultDrafts(data.project));
      setNotice("内容项目已保存。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  }

  async function rewriteCurrentContent() {
    if (!editor) return;
    const content = editor.getText().trim();

    if (content.length < 20) {
      setNotice("正文至少需要 20 个字，才能进行自然改写。");
      return;
    }

    setRewriting(true);
    try {
      const data = await readJson<RewriteResult>(
        await fetch("/api/generate/rewrite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: wechatVariant?.title || project?.title || undefined,
            content,
            goal: "lower_ai_tone",
          }),
        }),
      );
      const nextHtml = textToHtml(data.output.body);
      editor.commands.setContent(nextHtml);
      setHtml(nextHtml);
      setNotice(data.fallback ? "已用本地规则降低 AI 味；配置模型后可获得更自然的改写。" : "已完成自然改写。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "自然改写失败。");
    } finally {
      setRewriting(false);
    }
  }

  async function runCheck() {
    const content = getCurrentPlainText();
    const response = await fetch("/api/compliance/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project?.id || undefined,
        entry: mode,
        title: getCurrentTitle(),
        content,
        html: mode === "wechat_article" ? editor?.getHTML() : undefined,
      }),
    });
    const data = (await response.json()) as { score?: number; report?: { id: string }; message?: string };
    if (!response.ok) {
      setNotice(data.message || "发布前检查失败。");
      return;
    }
    setNotice(`发布前检查完成，当前得分 ${data.score ?? "-"}。${data.report ? "报告已保存。" : ""}`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        {project ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            正在编辑：{project.title}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-100 bg-white p-2">
          {contentEntries.map((entry) => (
            <button
              className={`rounded-lg px-3 py-2 text-sm ${mode === entry.id ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              key={entry.id}
              onClick={() => setMode(entry.id)}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>
        {mode === "wechat_article" ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">公众号发布步骤</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">生成内容后，先在这里完成排版，再复制到微信公众平台正文编辑区。</p>
                </div>
                <a className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-200 bg-white px-4 text-sm font-medium text-emerald-700 hover:bg-emerald-50" href="/dashboard/generate">
                  返回五入口生成
                </a>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {[
                  ["1", "生成公众号正文"],
                  ["2", "一键排版或手动调整"],
                  ["3", "复制到公众号后台"],
                  ["4", "微信后台粘贴并预览"],
                ].map(([step, label]) => (
                  <div className="rounded-lg border border-emerald-100 bg-white px-3 py-3 text-sm" key={step}>
                    <div className="mb-2 flex size-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">{step}</div>
                    <div className="font-medium text-slate-900">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-emerald-100 bg-white p-3">
              <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">公众号排版</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">先选一个排版模板，再点“一键排版”。选中文本后也可以手动设置标题、引用和列表。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={applyWechatLayout} disabled={!editor || layouting} type="button" variant="secondary">
                    <WandSparkles className="size-4" />
                    一键排版
                  </Button>
                  <Button onClick={applyAiWechatLayout} disabled={!editor || layouting} type="button">
                    {layouting ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                    {layouting ? "AI 精排中..." : "AI 精排"}
                  </Button>
                </div>
              </div>
              <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
                  <Palette className="size-4 text-emerald-600" />
                  排版模板
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {wechatLayoutTemplates.map((template) => (
                    <button
                      className={`rounded-lg border p-3 text-left transition ${
                        layoutTemplate === template.id
                          ? "border-emerald-400 bg-emerald-50 text-emerald-900 shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/60"
                      }`}
                      key={template.id}
                      onClick={() => setLayoutTemplate(template.id)}
                      title={template.description}
                      type="button"
                    >
                      <span className="block text-sm font-semibold">{template.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{template.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={toolbarButtonClass(editor?.isActive("heading", { level: 1 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} type="button">
                  <Heading1 className="size-4" />
                  一级标题
                </button>
                <button className={toolbarButtonClass(editor?.isActive("heading", { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} type="button">
                  <Heading2 className="size-4" />
                  二级标题
                </button>
                <button className={toolbarButtonClass(editor?.isActive("paragraph"))} onClick={() => editor?.chain().focus().setParagraph().run()} type="button">
                  <Pilcrow className="size-4" />
                  正文
                </button>
                <button className={toolbarButtonClass(editor?.isActive("bold"))} onClick={() => editor?.chain().focus().toggleBold().run()} type="button">
                  <Bold className="size-4" />
                  加粗
                </button>
                <button className={toolbarButtonClass(editor?.isActive("blockquote"))} onClick={() => editor?.chain().focus().toggleBlockquote().run()} type="button">
                  <Quote className="size-4" />
                  引用
                </button>
                <button className={toolbarButtonClass(editor?.isActive("bulletList"))} onClick={() => editor?.chain().focus().toggleBulletList().run()} type="button">
                  <List className="size-4" />
                  项目符号
                </button>
                <button className={toolbarButtonClass(editor?.isActive("orderedList"))} onClick={() => editor?.chain().focus().toggleOrderedList().run()} type="button">
                  <ListOrdered className="size-4" />
                  编号列表
                </button>
                <button className={toolbarButtonClass()} onClick={() => editor?.chain().focus().setHorizontalRule().run()} type="button">
                  <SeparatorHorizontal className="size-4" />
                  分割线
                </button>
                <button className={toolbarButtonClass()} onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} type="button">
                  <RemoveFormatting className="size-4" />
                  清除格式
                </button>
              </div>
            </div>

            <EditorContent editor={editor} />
          </div>
        ) : mode === "green_note" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="space-y-3">
              <label className="block space-y-1 text-sm">
                <span className="text-slate-600">小绿书标题</span>
                <input
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-emerald-400"
                  onChange={(event) => setGreenTitle(event.target.value)}
                  value={greenTitle}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-slate-600">短图文文案</span>
                <textarea
                  className="min-h-[480px] w-full rounded-lg border border-slate-200 bg-white p-4 text-sm leading-7 outline-none focus:border-emerald-400"
                  onChange={(event) => setGreenBody(event.target.value)}
                  value={greenBody}
                />
              </label>
            </div>
            <div className="space-y-3 rounded-lg border border-emerald-100 bg-white p-4">
              <div>
                <h2 className="font-semibold text-slate-950">图片提示词</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">每条提示词之间空一行，后续接入图片模型时可逐条发送。</p>
              </div>
              <label className="block space-y-1 text-xs">
                <span className="text-slate-500">生成场景</span>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 outline-none focus:border-emerald-400"
                  onChange={(event) => setImageScene(event.target.value)}
                  value={imageScene}
                >
                  <option value="green_note_pages">小绿书多页图文</option>
                  <option value="green_note_cover">小绿书封面</option>
                  <option value="wechat_cover">公众号封面</option>
                </select>
              </label>
              <label className="block space-y-1 text-xs">
                <span className="text-slate-500">小绿书页数</span>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 outline-none focus:border-emerald-400"
                  onChange={(event) => setGreenPageCount(Number(event.target.value) as 3 | 6 | 9)}
                  value={greenPageCount}
                >
                  <option value={3}>3 页快读</option>
                  <option value={6}>6 页标准</option>
                  <option value={9}>9 页完整</option>
                </select>
              </label>
              <label className="block space-y-1 text-xs">
                <span className="text-slate-500">视觉风格</span>
                <input
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 outline-none focus:border-emerald-400"
                  onChange={(event) => setImageStyle(event.target.value)}
                  value={imageStyle}
                />
              </label>
              <Button className="w-full" onClick={generateImagePrompts} variant="secondary" disabled={generatingPrompts}>
                {generatingPrompts ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                生成图片提示词
              </Button>
              <Button className="w-full" onClick={generateGreenNoteImages} disabled={generatingImages || !imagePrompts.length || !imageGenerationEnabled}>
                {generatingImages ? <Loader2 className="size-4 animate-spin" /> : <Images className="size-4" />}
                {imageGenerationEnabled ? "用 Gemini 图片模型生成图片" : "Gemini 生图点数包即将上线"}
              </Button>
              <textarea
                className="min-h-[420px] w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 outline-none focus:border-emerald-400"
                onChange={(event) => setImagePromptDraft(event.target.value)}
                value={imagePromptDraft}
              />
              {generatedImages.length ? (
                <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-slate-900">已生成图片</h3>
                    <button className="text-xs text-emerald-700" onClick={copyAllGeneratedImages} type="button">
                      复制全部
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {generatedImages.map((image, index) => {
                      const src = getImageSrc(image);
                      return (
                        <div key={`${image.prompt}-${index}`} className="rounded-md bg-white p-2">
                          {src ? (
                            <Image alt={`小绿书生成图 ${index + 1}`} className="h-auto w-full rounded-md border border-slate-100 object-cover" height={360} src={src} unoptimized width={240} />
                          ) : null}
                          <div className="mt-2 flex items-start justify-between gap-2 text-xs leading-5 text-slate-600">
                            <span className="line-clamp-2">{image.revisedPrompt || image.prompt}</span>
                            <button className="shrink-0 text-emerald-700" onClick={() => copyGeneratedImage(image, index)} type="button">
                              复制
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="space-y-3">
              <label className="block space-y-1 text-sm">
                <span className="text-slate-600">{getEntryLabel(mode)}标题</span>
                <input
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-emerald-400"
                  onChange={(event) => updateEntryDraft(mode, { title: event.target.value })}
                  value={currentGenericDraft.title}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-slate-600">{getEntryLabel(mode)}正文</span>
                <textarea
                  className="min-h-[560px] w-full rounded-lg border border-slate-200 bg-white p-4 text-sm leading-7 outline-none focus:border-emerald-400"
                  onChange={(event) => updateEntryDraft(mode, { body: event.target.value })}
                  value={currentGenericDraft.body}
                />
              </label>
            </div>
            <div className="space-y-3 rounded-lg border border-emerald-100 bg-white p-4">
              <h2 className="font-semibold text-slate-950">{getEntryLabel(mode)}发布要点</h2>
              <p className="text-sm leading-6 text-slate-600">{getEntrySummary(mode)}</p>
              {mode === "search" && searchKeywords.length ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-500">关键词</div>
                  <div className="flex flex-wrap gap-2">
                    {searchKeywords.map((keyword) => (
                      <button
                        className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                        key={keyword}
                        onClick={() => navigator.clipboard.writeText(keyword)}
                        type="button"
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <Button className="w-full" onClick={copyCurrentEntryPackage} variant="secondary" disabled={!currentGenericDraft.body.trim()}>
                <Copy className="size-4" />
                复制{getEntryLabel(mode)}内容包
              </Button>
            </div>
          </div>
        )}
      </div>
      <aside className="space-y-3 rounded-lg border border-emerald-100 bg-white p-4">
        <div>
          <h2 className="font-semibold text-slate-950">编辑器工具</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">公众号先在左侧排版，再复制到微信公众平台正文区。小绿书、搜一搜等内容可在上方标签切换。</p>
        </div>
        {mode === "wechat_article" ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
            <div className="font-semibold">复制后怎么用</div>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>点击“复制到公众号后台”。</li>
              <li>打开微信公众平台，新建图文。</li>
              <li>在正文编辑区直接粘贴。</li>
              <li>用微信后台预览，再发布。</li>
            </ol>
          </div>
        ) : null}
        <Button className="w-full" onClick={saveProject} disabled={saving || loading}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          保存到项目
        </Button>
        <Button className="w-full" onClick={copyHtml} disabled={mode !== "wechat_article"}>
          <FileCode2 className="size-4" />
          复制到公众号后台
        </Button>
        <Button className="w-full" onClick={rewriteCurrentContent} variant="secondary" disabled={mode !== "wechat_article" || rewriting || loading}>
          {rewriting ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
          降低 AI 味
        </Button>
        <Button className="w-full" onClick={runCheck} variant="secondary" disabled={!getCurrentPlainText().trim()}>
          <CheckCircle2 className="size-4" />
          发布前检查
        </Button>
        <button
          className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          onClick={() => setShowMoreEditorTools((value) => !value)}
          type="button"
        >
          {showMoreEditorTools ? "收起更多工具" : "更多导出工具"}
        </button>
        {showMoreEditorTools ? (
          <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
            <Button className="w-full" onClick={copyText} variant="secondary" disabled={!getCurrentPlainText().trim()}>
              <Copy className="size-4" />
              复制当前纯文本
            </Button>
            <Button className="w-full" onClick={copyMarkdown} variant="secondary" disabled={mode !== "wechat_article"}>
              <Copy className="size-4" />
              复制 Markdown
            </Button>
            <Button className="w-full" onClick={downloadHtml} variant="secondary" disabled={mode !== "wechat_article"}>
              <Download className="size-4" />
              下载 HTML
            </Button>
            <Button className="w-full" onClick={copyGreenNote} variant="secondary" disabled={mode !== "green_note" || !greenBody.trim()}>
              <Images className="size-4" />
              复制小绿书文案
            </Button>
          </div>
        ) : null}
        {notice ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
        <div className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          当前入口：{getEntryLabel(mode)}
          {mode === "wechat_article" ? ` · HTML 长度：${html.length}` : ` · 正文字数：${getCurrentPlainText().length}`}
        </div>
        {mode === "green_note" ? (
          <div className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            小绿书结构：{greenPageCount} 页，当前有 {imagePrompts.length} 条图片提示词。
          </div>
        ) : null}
        {imagePrompts.length && mode === "green_note" ? (
          <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-slate-900">小绿书图片提示词</h3>
              <button className="text-xs text-emerald-700" onClick={copyImagePrompts} type="button">
                复制全部
              </button>
            </div>
            <div className="space-y-2">
              {imagePrompts.map((prompt, index) => (
                <div key={`${prompt}-${index}`} className="space-y-2 rounded-md bg-white p-2 text-xs leading-5 text-slate-600">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-slate-800">第 {index + 1} 条</span>
                    <button className="shrink-0 text-emerald-700" onClick={() => copyImagePrompt(prompt, index)} type="button">
                      复制
                    </button>
                  </div>
                  <p>{prompt}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
