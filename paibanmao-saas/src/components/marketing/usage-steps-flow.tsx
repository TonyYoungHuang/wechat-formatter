import { ArrowRight } from "lucide-react";

export function UsageStepsFlow({ steps }: { steps: string[] }) {
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-4">
      {steps.map((step, index) => (
        <div key={step} className="relative flex">
          <div className="flex min-h-40 w-full flex-col rounded-lg border border-emerald-200 bg-white p-5 shadow-sm shadow-emerald-900/[0.03]">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white">
              {index + 1}
            </div>
            <div className="mt-4 text-base font-semibold text-emerald-800">步骤 {index + 1}</div>
            <p className="mt-3 text-base leading-7 text-slate-700">{step}</p>
          </div>
          {index < steps.length - 1 ? (
            <div className="pointer-events-none absolute left-full top-1/2 z-10 hidden w-5 -translate-y-1/2 items-center lg:flex">
              <span className="h-px flex-1 bg-emerald-400" />
              <ArrowRight className="-ml-1 size-4 shrink-0 text-emerald-500" />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
