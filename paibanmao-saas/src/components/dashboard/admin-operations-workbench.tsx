"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { KeyRound, RefreshCcw, ShieldAlert, WalletCards } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PlanCode = "free" | "starter" | "pro";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  sessions: Array<{ id: string }>;
  memberships: Array<{ role: string; workspace: AdminWorkspace }>;
};

type AdminWorkspace = {
  id: string;
  name: string;
  planCode: PlanCode;
  riskStatus: string;
  riskNote?: string | null;
  riskFlaggedAt?: string | null;
  updatedAt: string;
  members?: Array<{ user: { email: string; name: string } }>;
  _count?: {
    accountProfiles: number;
    projects: number;
    paymentOrders: number;
    usageLogs: number;
  };
};

type AdminOrder = {
  id: string;
  workspaceId: string;
  planCode: PlanCode;
  provider: string;
  amountCents: number;
  status: string;
  paidAt?: string | null;
  createdAt: string;
  workspace?: { id: string; name: string; planCode: PlanCode; riskStatus: string };
  callbacks: Array<{ status: string; message?: string | null; createdAt: string }>;
};

type AdminOperationsPayload = {
  users: AdminUser[];
  workspaces: AdminWorkspace[];
  orders: AdminOrder[];
  usage: { generation: { daily: number; weekly: number; monthly: number } };
  revenue: {
    byStatus: Array<{ status: string; _count: { _all: number }; _sum: { amountCents: number | null } }>;
    byProvider: Array<{ provider: string; _count: { _all: number }; _sum: { amountCents: number | null } }>;
  };
  diagnostics: {
    failedJobs: Array<{ id: string; type: string; error?: string | null; updatedAt: string }>;
    failedCallbacks: Array<{ id: string; provider: string; status: string; message?: string | null; createdAt: string }>;
    highUsage: Array<{ workspaceId: string; _sum: { quantity: number | null } }>;
  };
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

function money(cents: number | null | undefined) {
  return `¥${((cents ?? 0) / 100).toFixed(2)}`;
}

export function AdminOperationsWorkbench() {
  const [data, setData] = useState<AdminOperationsPayload | null>(null);
  const [query, setQuery] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>("starter");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [riskStatus, setRiskStatus] = useState("watch");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(nextQuery = query) {
    setLoading(true);
    try {
      const params = nextQuery.trim() ? `?q=${encodeURIComponent(nextQuery.trim())}` : "";
      const payload = await readJson<AdminOperationsPayload>(await fetch(`/api/admin/operations${params}`));
      setData(payload);
      setSelectedWorkspaceId((current) => current || payload.workspaces[0]?.id || "");
      setSelectedOrderId((current) => current || payload.orders[0]?.id || "");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载运营后台失败。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load("");
    }, 0);
    return () => window.clearTimeout(timer);
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAction(body: Record<string, unknown>, success: string) {
    try {
      await readJson(await fetch("/api/admin/operations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      setMessage(success);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败。");
    }
  }

  const revenuePaid = data?.revenue.byStatus.find((item) => item.status === "paid")?._sum.amountCents ?? 0;
  const activeUsers = data?.users.filter((user) => user.sessions.length > 0).length ?? 0;
  const riskWorkspaces = data?.workspaces.filter((workspace) => workspace.riskStatus !== "normal") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">运营后台</h1>
          <p className="mt-1 text-sm text-slate-600">用户、工作区、订单、用量、风控和客服排障的站长视图。</p>
        </div>
        <Button variant="secondary" onClick={() => load()} disabled={loading}>
          <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="用户数" value={data?.users.length ?? 0} detail={`活跃会话 ${activeUsers}`} />
        <Metric title="工作区" value={data?.workspaces.length ?? 0} detail={`风控关注 ${riskWorkspaces.length}`} />
        <Metric title="近 7 天生成" value={data?.usage.generation.weekly ?? 0} detail={`今日 ${data?.usage.generation.daily ?? 0}`} />
        <Metric title="已支付 GMV" value={money(revenuePaid)} detail={`近 30 天生成 ${data?.usage.generation.monthly ?? 0}`} />
      </div>

      <Card className="border-emerald-300 bg-emerald-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-emerald-700" />
            激活码发放
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm leading-6 text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <p>生成入门版和专业版激活码，用于电商平台自动发货。明文激活码只在生成后当次展示，请及时复制保存。</p>
          <Button asChild>
            <Link href="/dashboard/billing#activation-codes">
              生成激活码
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>客服排障搜索</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索工作区名称或用户邮箱" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400" />
          <Button onClick={() => load(query)} disabled={loading}>搜索</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>用户列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.users.slice(0, 12).map((user) => (
              <div key={user.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                <div className="font-medium text-slate-950">{user.name}</div>
                <div className="mt-1 text-xs text-slate-500">{user.email}</div>
                <div className="mt-2 text-xs text-slate-600">工作区：{user.memberships.map((item) => item.workspace.name).join("，") || "-"}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>工作区列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.workspaces.slice(0, 12).map((workspace) => (
              <button key={workspace.id} className="w-full rounded-lg border border-slate-100 bg-slate-50 p-3 text-left text-sm hover:border-emerald-200" onClick={() => setSelectedWorkspaceId(workspace.id)} type="button">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-950">{workspace.name}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600">{workspace.planCode}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <span>档案 {workspace._count?.accountProfiles ?? 0}</span>
                  <span>项目 {workspace._count?.projects ?? 0}</span>
                  <span>订单 {workspace._count?.paymentOrders ?? 0}</span>
                </div>
                {workspace.riskStatus !== "normal" ? <div className="mt-2 text-xs text-amber-700">风控：{workspace.riskStatus} {workspace.riskNote || ""}</div> : null}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>订单总览</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.orders.slice(0, 12).map((order) => (
              <button key={order.id} className="w-full rounded-lg border border-slate-100 bg-slate-50 p-3 text-left text-sm hover:border-emerald-200" onClick={() => setSelectedOrderId(order.id)} type="button">
                <div className="flex items-center justify-between gap-3">
                  <span className="break-all font-medium text-slate-950">{order.id}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600">{order.status}</span>
                </div>
                <div className="mt-2 text-xs text-slate-500">{order.workspace?.name || order.workspaceId} · {order.provider} · {money(order.amountCents)}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <OperationCard title="人工补单" icon={<WalletCards className="size-5 text-emerald-600" />}>
          <SelectWorkspace data={data} value={selectedWorkspaceId} onChange={setSelectedWorkspaceId} />
          <select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value as PlanCode)} className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
            <option value="free">免费版</option>
            <option value="starter">入门版</option>
            <option value="pro">专业版</option>
          </select>
          <Button onClick={() => runAction({ action: "manual_comp", workspaceId: selectedWorkspaceId, planCode: selectedPlan, note }, "人工补单已完成。")} disabled={!selectedWorkspaceId}>开通/调整套餐</Button>
        </OperationCard>

        <OperationCard title="退款标记" icon={<WalletCards className="size-5 text-amber-600" />}>
          <select value={selectedOrderId} onChange={(event) => setSelectedOrderId(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
            {data?.orders.map((order) => (
              <option key={order.id} value={order.id}>{order.status} · {order.workspace?.name || order.workspaceId} · {money(order.amountCents)}</option>
            ))}
          </select>
          <Button variant="secondary" onClick={() => runAction({ action: "refund_order", orderId: selectedOrderId, note }, "订单已标记退款。")} disabled={!selectedOrderId}>标记退款</Button>
        </OperationCard>

        <OperationCard title="风控封禁" icon={<ShieldAlert className="size-5 text-red-600" />}>
          <SelectWorkspace data={data} value={selectedWorkspaceId} onChange={setSelectedWorkspaceId} />
          <select value={riskStatus} onChange={(event) => setRiskStatus(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
            <option value="normal">恢复正常</option>
            <option value="watch">观察</option>
            <option value="blocked">封禁</option>
          </select>
          <Button variant="secondary" onClick={() => runAction({ action: "risk_update", workspaceId: selectedWorkspaceId, riskStatus, riskNote: note || null }, "风控状态已更新。")} disabled={!selectedWorkspaceId}>更新风控</Button>
        </OperationCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>客服排障视图</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <Diagnostics title="失败生成任务" items={data?.diagnostics.failedJobs.map((job) => `${job.type}: ${job.error || job.id}`) || []} />
          <Diagnostics title="异常支付回调" items={data?.diagnostics.failedCallbacks.map((callback) => `${callback.provider}/${callback.status}: ${callback.message || callback.id}`) || []} />
          <Diagnostics title="高用量工作区" items={data?.diagnostics.highUsage.map((item) => `${item.workspaceId}: ${item._sum.quantity ?? 0} 次`) || []} />
        </CardContent>
      </Card>

      <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="操作备注：补单原因、退款单号、风控说明、客服排障记录" className="min-h-24 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-emerald-400" />
    </div>
  );
}

function Metric({ title, value, detail }: { title: string; value: string | number; detail: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-slate-950">{value}</div>
        <div className="mt-1 text-xs text-slate-500">{detail}</div>
      </CardContent>
    </Card>
  );
}

function OperationCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  );
}

function SelectWorkspace({ data, value, onChange }: { data: AdminOperationsPayload | null; value: string; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 outline-none focus:border-emerald-400">
      {data?.workspaces.map((workspace) => (
        <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.planCode}</option>
      ))}
    </select>
  );
}

function Diagnostics({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="font-medium text-slate-950">{title}</div>
      <div className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
        {items.length ? items.slice(0, 8).map((item) => <div key={item} className="break-all rounded bg-white p-2">{item}</div>) : <div className="text-slate-500">暂无异常</div>}
      </div>
    </div>
  );
}
