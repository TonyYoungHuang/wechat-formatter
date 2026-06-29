import { WechatEditor } from "@/components/editor/wechat-editor";

export default function EditorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">公众号编辑器</h1>
        <p className="mt-1 text-sm text-slate-600">轻量编辑公众号正文，复制 HTML 到微信公众平台。</p>
      </div>
      <WechatEditor />
    </div>
  );
}

