"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

const starterContent = `
<h1>普通人做公众号副业还有机会吗</h1>
<p>这是一篇公众号文章草稿。你可以在这里编辑正文，然后复制公众号 HTML。</p>
<h2>为什么这个选题值得写</h2>
<p>它同时适合公众号长文、小绿书短图文、搜一搜关键词和问一问回答。</p>
`;

export function WechatEditor() {
  const [notice, setNotice] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: "在这里编辑公众号文章，首版支持复制 HTML 到微信公众平台。",
      }),
    ],
    content: starterContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[520px] rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base leading-8 outline-none prose-headings:font-semibold",
      },
    },
  });

  const html = useMemo(() => editor?.getHTML() ?? "", [editor]);

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

  async function runCheck() {
    if (!editor) return;
    const response = await fetch("/api/compliance/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "公众号文章",
        content: editor.getText(),
        html: editor.getHTML(),
      }),
    });
    const data = (await response.json()) as { score?: number };
    setNotice(`发布前检查完成，当前得分 ${data.score ?? "-"}。`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <EditorContent editor={editor} />
      </div>
      <aside className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-4">
        <div>
          <h2 className="font-semibold text-slate-950">编辑器工具</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            首版只做轻量排版和公众号 HTML 复制，微信公众平台本身已支持较强排版。
          </p>
        </div>
        <Button className="w-full" onClick={copyHtml}>
          复制公众号 HTML
        </Button>
        <Button className="w-full" variant="secondary" onClick={copyText}>
          复制纯文本
        </Button>
        <Button className="w-full" variant="secondary" onClick={runCheck}>
          发布前检查
        </Button>
        {notice ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
        <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          当前 HTML 长度：{html.length}
        </div>
      </aside>
    </div>
  );
}

