interface TopBarProps {
  content: string
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export default function TopBar({ content, sidebarOpen, onToggleSidebar }: TopBarProps) {
  const handleCopy = async () => {
    if (!content.trim()) {
      alert('请先输入内容')
      return
    }

    try {
      const blob = new Blob([content], { type: 'text/html' })
      const item = new ClipboardItem({ 'text/html': blob })
      await navigator.clipboard.write([item])
      alert('已复制富文本，可直接粘贴到微信公众号编辑器')
    } catch {
      try {
        await navigator.clipboard.writeText(content)
        alert('浏览器不支持富文本复制，已复制 HTML 文本')
      } catch {
        alert('复制失败，请手动复制')
      }
    }
  }

  return (
    <header className="mx-auto flex h-[68px] w-full max-w-[1600px] items-center justify-between px-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={sidebarOpen ? '收起侧栏' : '展开侧栏'}
          onClick={onToggleSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h1 className="text-[18px] font-semibold text-slate-900">微信公众号排版助手</h1>
          <p className="text-xs text-slate-500">浅色简洁版 · 智能一键排版</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        带格式复制
      </button>
    </header>
  )
}
