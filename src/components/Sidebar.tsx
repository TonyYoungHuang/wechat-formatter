interface SidebarProps {
  selectedTemplate: string
  onTemplateChange: (template: string) => void
  content: string
  onContentChange: (content: string) => void
  onSmartFormat: () => void
}

const templates = [
  { id: 'mint', name: '薄荷浅绿', dot: 'bg-emerald-400' },
  { id: 'slate', name: '雾灰商务', dot: 'bg-slate-400' },
  { id: 'sunrise', name: '暖杏轻文艺', dot: 'bg-amber-400' },
  { id: 'ocean', name: '海盐清新', dot: 'bg-cyan-400' },
]

export default function Sidebar({
  selectedTemplate,
  onTemplateChange,
  content,
  onContentChange,
  onSmartFormat,
}: SidebarProps) {
  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = typeof event.target?.result === 'string' ? event.target.result : ''
      onContentChange(text)
    }
    reader.readAsText(file)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (!file) {
      return
    }
    handleFileUpload(file)
  }

  return (
    <aside className="panel w-[280px] min-w-[280px] overflow-y-auto">
      <div className="space-y-4 p-4">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">文章导入</h2>
          <textarea
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            placeholder="粘贴内容或上传文本文件"
            className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-400"
          />
          <div
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            onClick={() => document.getElementById('uploadInput')?.click()}
            className="mt-2 cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center text-xs text-slate-500 transition hover:border-slate-400"
          >
            点击或拖拽上传 .txt / .md
            <input
              id="uploadInput"
              type="file"
              accept=".txt,.md"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  handleFileUpload(file)
                }
              }}
            />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">排版模板</h2>
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onTemplateChange(template.id)}
                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selectedTemplate === template.id
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${template.dot}`} />
                <span>{template.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <button
            type="button"
            onClick={onSmartFormat}
            disabled={!content.trim()}
            className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            智能一键排版
          </button>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            自动识别标题、小标题、序列号、强调句，并补全常用格式：
            `加粗 / 下划线 / 颜色高亮`
          </p>
        </div>
      </div>
    </aside>
  )
}
