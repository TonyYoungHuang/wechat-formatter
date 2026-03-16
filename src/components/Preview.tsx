interface PreviewProps {
  content: string
  template: string
}

const templateNameMap: Record<string, string> = {
  mint: '薄荷',
  slate: '雾灰',
  sunrise: '暖杏',
  ocean: '海盐',
}

export default function Preview({ content, template }: PreviewProps) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
        <span className="text-sm font-semibold text-slate-900">排版预览</span>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
          公众号排版 · {templateNameMap[template] || template}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-100 p-5">
        <div className="mx-auto max-w-[370px] rounded-[28px] border border-slate-300 bg-white p-3 shadow-sm">
          <div className="min-h-[680px] rounded-[20px] bg-[#f7f8f9] px-4 py-5">
            {content ? (
              <div dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <div className="flex h-[640px] items-center justify-center text-sm text-slate-400">
                输入文章后会在这里实时预览
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
