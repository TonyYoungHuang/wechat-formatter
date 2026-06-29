"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Copy, Download, FileCode2, Images, Loader2, Save, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type Variant = {
  id?: string;
  entry: "wechat_article" | "green_note" | "search" | "question" | "moments";
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

const starterContent = `
<h1>普通人做公众号副业还有机会吗？</h1>
<p>这是一篇公众号文章草稿。你可以在这里编辑正文，然后复制公众号 HTML 到微信公众平台。</p>
<h2>为什么这个选题值得写</h2>
<p>它同时适合公众号长文、小绿书短图文、搜一搜关键词和问一问回答。</p>
`;

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

function getGreenNotePageCount(variant?: Variant) {
  const pages = variant?.metadata?.pages;
  if (pages === 3 || pages === 6 || pages === 9) {
    return pages;
  }

  const promptCount = getImagePrompts(variant).length;
  return promptCount === 6 || promptCount === 9 ? promptCount : 3;
}

function splitPromptDraft(value: string) {
  return value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

type ImagePromptResult = {
  output: {
    prompts: string[];
  };
};

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
  const [mode, setMode] = useState<"wechat" | "green_note">("wechat");
  const [greenTitle, setGreenTitle] = useState("");
  const [greenBody, setGreenBody] = useState("");
  const [greenPageCount, setGreenPageCount] = useState<3 | 6 | 9>(3);
  const [imagePromptDraft, setImagePromptDraft] = useState("");
  const [imageScene, setImageScene] = useState("green_note_pages");
  const [imageStyle, setImageStyle] = useState("轻量微信绿色工作台风格，清爽留白，适合中文图文");
  const [loading, setLoading] = useState(() => Boolean(projectId));
  const [saving, setSaving] = useState(false);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);

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
          "min-h-[560px] rounded-lg border border-slate-200 bg-white px-5 py-4 text-base leading-8 outline-none prose-headings:font-semibold",
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
        const content = wechat ? textToHtml(wechat.body) : starterContent;
        setProject(data.project);
        setGreenTitle(greenNote?.title || "");
        setGreenBody(greenNote?.body || "");
        setGreenPageCount(getGreenNotePageCount(greenNote));
        setImagePromptDraft(getImagePrompts(greenNote).join("\n\n"));
        editor.commands.setContent(content);
        setHtml(content);
        setNotice("已载入内容项目。");
      })
      .catch((error: Error) => setNotice(error.message))
      .finally(() => setLoading(false));
  }, [editor, projectId]);

  const wechatVariant = useMemo(() => project?.variants.find((variant) => variant.entry === "wechat_article"), [project]);
  const imagePrompts = useMemo(() => splitPromptDraft(imagePromptDraft), [imagePromptDraft]);

  async function copyHtml() {
    if (!editor) return;
    await navigator.clipboard.writeText(editor.getHTML());
    setNotice("公众号 HTML 已复制。");
  }

  async function copyText() {
    if (!editor) return;
    await navigator.clipboard.writeText(editor.getText());
    setNotice("纯文本已复制。");
  }

  async function copyMarkdown() {
    if (!editor) return;
    await navigator.clipboard.writeText(htmlToMarkdown(editor.getHTML()));
    setNotice("Markdown 已复制。");
  }

  function downloadHtml() {
    if (!editor) return;
    const title = wechatVariant?.title || project?.title || "排版猫公众号文章";
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

  async function copyGreenNote() {
    const promptSection = imagePrompts.length
      ? ["", `图片页提示词（${greenPageCount} 页结构）`, ...imagePrompts.map((prompt, index) => `第 ${index + 1} 页：${prompt}`)].join("\n")
      : "";
    await navigator.clipboard.writeText(`${greenTitle}\n\n${greenBody}${promptSection}`.trim());
    setNotice("小绿书文案已复制。");
  }

  async function saveProject() {
    if (!editor || !project) {
      setNotice("当前没有关联内容项目，可直接复制 HTML 使用。");
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
              editedAt: new Date().toISOString(),
            },
          };
        }

        return {
          entry: variant.entry,
          title: variant.title,
          body: variant.body,
          metadata: variant.metadata || undefined,
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
      setNotice("内容项目已保存。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  }

  async function runCheck() {
    if (!editor) return;
    const response = await fetch("/api/compliance/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project?.id || undefined,
        entry: "wechat_article",
        title: wechatVariant?.title || project?.title || "公众号文章",
        content: editor.getText(),
        html: editor.getHTML(),
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
          <button
            className={`rounded-lg px-3 py-2 text-sm ${mode === "wechat" ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setMode("wechat")}
            type="button"
          >
            公众号 HTML
          </button>
          <button
            className={`rounded-lg px-3 py-2 text-sm ${mode === "green_note" ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setMode("green_note")}
            type="button"
          >
            小绿书图文
          </button>
        </div>
        {mode === "wechat" ? (
          <EditorContent editor={editor} />
        ) : (
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
              <textarea
                className="min-h-[420px] w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 outline-none focus:border-emerald-400"
                onChange={(event) => setImagePromptDraft(event.target.value)}
                value={imagePromptDraft}
              />
            </div>
          </div>
        )}
      </div>
      <aside className="space-y-3 rounded-lg border border-emerald-100 bg-white p-4">
        <div>
          <h2 className="font-semibold text-slate-950">编辑器工具</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">首版做轻量排版和公众号 HTML 复制，微信公众平台本身负责更复杂的样式调整。</p>
        </div>
        <Button className="w-full" onClick={saveProject} disabled={saving || loading}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          保存到项目
        </Button>
        <Button className="w-full" onClick={copyHtml} variant="secondary" disabled={mode !== "wechat"}>
          <FileCode2 className="size-4" />
          复制公众号 HTML
        </Button>
        <Button className="w-full" onClick={copyText} variant="secondary" disabled={mode !== "wechat"}>
          <Copy className="size-4" />
          复制纯文本
        </Button>
        <Button className="w-full" onClick={copyMarkdown} variant="secondary" disabled={mode !== "wechat"}>
          <Copy className="size-4" />
          复制 Markdown
        </Button>
        <Button className="w-full" onClick={downloadHtml} variant="secondary" disabled={mode !== "wechat"}>
          <Download className="size-4" />
          下载 HTML
        </Button>
        <Button className="w-full" onClick={copyGreenNote} variant="secondary" disabled={mode !== "green_note" || !greenBody.trim()}>
          <Images className="size-4" />
          复制小绿书文案
        </Button>
        <Button className="w-full" onClick={runCheck} variant="secondary">
          <CheckCircle2 className="size-4" />
          发布前检查
        </Button>
        {notice ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
        <div className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">当前 HTML 长度：{html.length}</div>
        {mode === "green_note" ? (
          <div className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            小绿书结构：{greenPageCount} 页，当前有 {imagePrompts.length} 条图片提示词。
          </div>
        ) : null}
        {imagePrompts.length ? (
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
