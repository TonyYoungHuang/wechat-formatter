"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="border-red-100 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="size-5" />
          工作台加载失败
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          当前工作台数据没有成功加载，可以先重试。如果连续失败，请把错误编号发给客服排障。
        </p>
        {error.digest ? <p className="mt-3 text-xs text-slate-500">错误编号：{error.digest}</p> : null}
        <Button className="mt-5" onClick={reset} variant="secondary">
          <RotateCcw className="size-4" />
          重试
        </Button>
      </CardContent>
    </Card>
  );
}
