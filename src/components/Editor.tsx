interface EditorProps {
  content: string
  onContentChange: (content: string) => void
}

export default function Editor({ content, onContentChange }: EditorProps) {
  const readingMinutes = Math.max(1, Math.ceil(content.length / 300))

  return (
    <div className="flex w-full flex-col">
      <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">正文文本</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Markdown 可用</span>
        </div>
        <div className="text-xs text-slate-500">
          字数 {content.length} · 约 {readingMinutes} 分钟
        </div>
      </div>

      <textarea
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        placeholder="粘贴原文后，点击侧栏“智能一键排版”。支持加粗 **文本**、下划线 __文本__、高亮 ==文本==、颜色 {green|文本}。"
        className="min-h-[720px] w-full flex-1 resize-none bg-white p-6 text-[16px] leading-8 text-slate-800 outline-none placeholder:text-slate-400"
        spellCheck={false}
      />
    </div>
  )
}
