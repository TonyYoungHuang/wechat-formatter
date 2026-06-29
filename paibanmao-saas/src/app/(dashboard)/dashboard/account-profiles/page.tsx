import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const fields = ["账号名称", "内容领域", "目标读者", "产品/服务", "变现方式", "语气风格"];

export default function AccountProfilesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">多账号档案</h1>
          <p className="mt-1 text-sm text-slate-600">为每个公众号、副业项目或问一问身份保存独立定位。</p>
        </div>
        <Button>新建账号档案</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>默认档案</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <label key={field} className="space-y-1 text-sm">
                <span className="text-slate-600">{field}</span>
                <input className="h-10 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-400" />
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button>保存档案</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

