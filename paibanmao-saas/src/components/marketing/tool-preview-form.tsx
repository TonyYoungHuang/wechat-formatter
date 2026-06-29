"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PublicToolKind, PublicToolPreview } from "@/lib/tools/public-tool-preview";

export function ToolPreviewForm({
  kind,
  placeholder,
}: {
  kind: PublicToolKind;
  placeholder: string;
}) {
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<PublicToolPreview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generatePreview() {
    if (input.trim().length < 2 || loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tools/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, input }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "生成预览失败。");
      }

      setPreview(data.preview);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成预览失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        className="min-h-28 w-full rounded-lg border border-slate-200 p-4 outline-none focus:border-emerald-400"
        onChange={(event) => setInput(event.target.value)}
        placeholder={placeholder}
        value={input}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button disabled={input.trim().length < 2 || loading} onClick={generatePreview}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        生成预览
        {!loading ? <ArrowRight className="size-4" /> : null}
      </Button>

      {preview ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
          <h2 className="font-semibold text-slate-950">{preview.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{preview.summary}</p>
          <div className="mt-4 grid gap-3">
            {preview.blocks.map((block) => (
              <div key={`${block.label}-${block.content}`} className="rounded-lg bg-white p-3 text-sm">
                <p className="font-medium text-emerald-700">{block.label}</p>
                <p className="mt-1 leading-6 text-slate-700">{block.content}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{preview.loginHint}</p>
        </div>
      ) : null}
    </div>
  );
}
