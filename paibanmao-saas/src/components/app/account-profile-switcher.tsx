"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserRoundCog } from "lucide-react";

type AccountProfile = {
  id: string;
  name: string;
  niche: string;
  isDefault: boolean;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

export function AccountProfileSwitcher() {
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadProfiles() {
    try {
      const data = await readJson<{ profiles: AccountProfile[] }>(await fetch("/api/account-profiles"));
      setProfiles(data.profiles);
      setSelectedId(data.profiles.find((profile) => profile.isDefault)?.id || data.profiles[0]?.id || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "账号档案加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfiles();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function changeProfile(id: string) {
    const previousId = selectedId;
    setSelectedId(id);
    setMessage("");

    try {
      await readJson(await fetch(`/api/account-profiles/${id}/set-default`, { method: "POST" }));
      setProfiles((items) => items.map((profile) => ({ ...profile, isDefault: profile.id === id })));
      setMessage("已切换");
    } catch (error) {
      setSelectedId(previousId);
      setMessage(error instanceof Error ? error.message : "切换失败");
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2 md:min-w-72">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800">
          <UserRoundCog className="size-3.5" />
          当前账号档案
        </span>
        <Link className="text-xs font-medium text-emerald-700 hover:text-emerald-900" href="/dashboard/account-profiles">
          管理
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <select
          aria-label="切换默认账号档案"
          className="h-9 min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-2 text-sm text-slate-800 outline-none transition focus:border-emerald-400 disabled:text-slate-400"
          disabled={loading || profiles.length === 0}
          onChange={(event) => void changeProfile(event.target.value)}
          value={selectedId}
        >
          {loading ? <option value="">加载中</option> : null}
          {!loading && profiles.length === 0 ? <option value="">暂无账号档案</option> : null}
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        {message ? <span className="max-w-20 truncate text-xs text-emerald-700">{message}</span> : null}
      </div>
    </div>
  );
}
