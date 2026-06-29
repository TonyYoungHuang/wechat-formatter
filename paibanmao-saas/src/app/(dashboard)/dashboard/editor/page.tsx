import { Suspense } from "react";

import { WechatEditor } from "@/components/editor/wechat-editor";

export default function EditorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">五入口内容编辑器</h1>
        <p className="mt-1 text-sm text-slate-600">编辑公众号 HTML 和小绿书图文脚本，保存回内容项目，并复制到微信生态各个入口。</p>
      </div>
      <Suspense>
        <WechatEditor />
      </Suspense>
    </div>
  );
}
