import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  ["账号档案", "1 / 1"],
  ["今日生成", "0 / 1"],
  ["内容项目", "0"],
  ["待发布", "0"],
];

const suggestions = [
  "普通人做公众号副业还有机会吗",
  "小绿书适合哪些公众号创作者",
  "问一问怎么给公众号带来精准关注",
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">工作台</h1>
        <p className="mt-1 text-sm text-slate-600">从一个选题开始，生成五个微信入口的内容包。</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-slate-950">{value}</CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>今日建议选题</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((item) => (
              <div key={item} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>账号档案完整度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 h-3 rounded-full bg-emerald-100">
              <div className="h-3 w-2/5 rounded-full bg-emerald-500" />
            </div>
            <p className="text-sm leading-6 text-slate-600">
              先补充目标读者、变现方式和常用 CTA，生成结果会更像你的账号。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

