"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Copy, FileCode2, Loader2, Save } from "lucide-react";

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

function getImagePrompts(variant?: Variant) {
  const prompts = variant?.metadata?.imagePrompts;
  return Array.isArray(prompts) ? prompts.filter((item): item is string => typeof item === "string") : [];
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
  const [loading, setLoading] = useState(() => Boolean(projectId));
  const [saving, setSaving] = useState(false);

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
        const content = wechat ? textToHtml(wechat.body) : starterContent;
        setProject(data.project);
        editor.commands.setContent(content);
        setHtml(content);
        setNotice("已载入内容项目。");
      })
      .catch((error: Error) => setNotice(error.message))
      .finally(() => setLoading(false));
  }, [editor, projectId]);

  const wechatVariant = useMemo(() => project?.variants.find((variant) => variant.entry === "wechat_article"), [project]);
  const greenNoteVariant = useMemo(() => project?.variants.find((variant) => variant.entry === "green_note"), [project]);
  const imagePrompts = useMemo(() => getImagePrompts(greenNoteVariant), [greenNoteVariant]);

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

  async function copyImagePrompts() {
    await navigator.clipboard.writeText(imagePrompts.join("\n\n"));
    setNotice("小绿书图片提示词已复制。");
  }

  async function saveProject() {
    if (!editor || !project) {
      setNotice("当前没有关联内容项目，可直接复制 HTML 使用。");
      return;
    }

    setSaving(true);
    try {
      const nextVariants = project.variants.map((variant) =>
        variant.entry === "wechat_article"
          ? {
              entry: variant.entry,
              title: wechatVariant?.title || project.title,
              body: htmlToText(editor.getHTML()),
              metadata: { ...(variant.metadata || {}), html: editor.getHTML(), editedAt: new Date().toISOString() },
            }
          : {
              entry: variant.entry,
              title: variant.title,
              body: variant.body,
              metadata: variant.metadata || undefined,
            },
      );

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
        <EditorContent editor={editor} />
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
        <Button className="w-full" onClick={copyHtml} variant="secondary">
          <FileCode2 className="size-4" />
          复制公众号 HTML
        </Button>
        <Button className="w-full" onClick={copyText} variant="secondary">
          <Copy className="size-4" />
          复制纯文本
        </Button>
        <Button className="w-full" onClick={runCheck} variant="secondary">
          <CheckCircle2 className="size-4" />
          发布前检查
        </Button>
        {notice ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
        <div className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">当前 HTML 长度：{html.length}</div>
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
                <div key={`${prompt}-${index}`} className="rounded-md bg-white p-2 text-xs leading-5 text-slate-600">
                  {prompt}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
