import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <SkeletonLine className="h-8 w-32" />
        <SkeletonLine className="mt-3 h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <SkeletonLine className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <SkeletonLine className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <SkeletonLine className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <SkeletonLine className="h-12 w-full" />
              <SkeletonLine className="h-12 w-full" />
              <SkeletonLine className="h-12 w-4/5" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <SkeletonLine className="h-5 w-36" />
            </CardHeader>
            <CardContent>
              <SkeletonLine className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
