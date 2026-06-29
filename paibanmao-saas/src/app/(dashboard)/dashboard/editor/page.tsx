import { Suspense } from "react";

import { WechatEditor } from "@/components/editor/wechat-editor";

export default function EditorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">五入口内容编辑器</h1>
        <p className="mt-1 text-sm text-slate-600">统一编辑公众号 HTML、小绿书图文脚本、搜一搜、问一问和朋友圈内容，并保存回内容项目。</p>
      </div>
      <Suspense>
        <WechatEditor />
      </Suspense>
    </div>
  );
}
