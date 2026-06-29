import { contentEntries } from "@/lib/content/entries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GeneratePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">五入口生成器</h1>
        <p className="mt-1 text-sm text-slate-600">选择账号档案，输入选题，一次生成公众号、小绿书、搜一搜、问一问和朋友圈。</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>输入选题</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="min-h-28 w-full rounded-xl border border-slate-200 p-4 outline-none focus:border-emerald-400"
            placeholder="例如：普通人做公众号副业还有机会吗"
          />
          <div className="flex justify-end">
            <Button>生成五入口内容</Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-5">
        {contentEntries.map((entry) => (
          <Card key={entry.id}>
            <CardHeader>
              <CardTitle className="text-base">{entry.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-slate-600">{entry.summary}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

