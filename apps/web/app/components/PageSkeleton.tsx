import { Skeleton } from "@/app/components/ui/skeleton";
import { C } from "@/app/lib/design-system";

export function PageSkeleton() {
  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: C.bg }}>
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeedPageSkeleton() {
  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ backgroundColor: C.bg }}>
      {/* Hero bar skeleton */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.bgAlt }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-14 w-14 rounded-full" style={{ backgroundColor: C.surface }} />
            <div>
              <Skeleton className="h-3 w-28 mb-2" style={{ backgroundColor: C.surface }} />
              <Skeleton className="h-8 w-48" style={{ backgroundColor: C.surface }} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16" style={{ backgroundColor: C.surface, borderRadius: 2 }} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Trending carousel skeleton */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <Skeleton className="h-6 w-20" style={{ backgroundColor: C.surface, borderRadius: 2 }} />
            <Skeleton className="h-7 w-48" style={{ backgroundColor: C.surface }} />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="flex-shrink-0" style={{ width: 160, height: 240, backgroundColor: C.surface, borderRadius: 2 }} />
            ))}
          </div>
        </div>

        {/* Two-column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-6 space-y-4"
                style={{ border: `1px solid ${C.border}`, borderRadius: 2 }}
              >
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" style={{ backgroundColor: C.bgAlt }} />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" style={{ backgroundColor: C.bgAlt }} />
                    <Skeleton className="h-3 w-48" style={{ backgroundColor: C.bgAlt }} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Skeleton className="flex-shrink-0" style={{ width: 64, height: 96, backgroundColor: C.bgAlt, borderRadius: 2 }} />
                  <div className="flex-1 space-y-2 pt-2">
                    <Skeleton className="h-4 w-40" style={{ backgroundColor: C.bgAlt }} />
                    <Skeleton className="h-3 w-24" style={{ backgroundColor: C.bgAlt }} />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" style={{ backgroundColor: C.bgAlt }} />
                <Skeleton className="h-4 w-3/4" style={{ backgroundColor: C.bgAlt }} />
              </div>
            ))}
          </div>

          <div className="hidden lg:block space-y-5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-5 space-y-3"
                style={{ border: `1px solid ${C.border}`, borderRadius: 2, background: C.surface }}
              >
                <Skeleton className="h-3 w-24 mb-3" style={{ backgroundColor: C.bgAlt }} />
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center gap-3 py-1">
                    <Skeleton className="h-9 w-9 rounded-full" style={{ backgroundColor: C.bgAlt }} />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-20 mb-1" style={{ backgroundColor: C.bgAlt }} />
                      <Skeleton className="h-2.5 w-14" style={{ backgroundColor: C.bgAlt }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BacklogPageSkeleton() {
  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: C.bg }}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        {/* Header skeleton */}
        <div style={{ borderBottom: `1px solid ${C.border}`, padding: "24px 0 20px" }}>
          <Skeleton className="h-5 w-20 mb-3" style={{ backgroundColor: C.surface, borderRadius: 2 }} />
          <Skeleton className="h-9 w-48 mb-2" style={{ backgroundColor: C.surface }} />
          <Skeleton className="h-4 w-32 mb-4" style={{ backgroundColor: C.surface }} />
          <Skeleton className="h-9 w-full max-w-md" style={{ backgroundColor: C.surface, borderRadius: 2 }} />
        </div>

        {/* 12-col grid: sidebar + game grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-6">
          {/* Sidebar skeleton */}
          <div className="lg:col-span-3">
            <div
              className="space-y-2 p-4"
              style={{ border: `1px solid ${C.border}`, borderRadius: 2, background: C.surface }}
            >
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                  <Skeleton className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: C.bgAlt }} />
                  <Skeleton className="h-3 flex-1" style={{ backgroundColor: C.bgAlt }} />
                  <Skeleton className="h-3 w-5" style={{ backgroundColor: C.bgAlt }} />
                </div>
              ))}
              <div style={{ height: 1, backgroundColor: C.border, margin: "8px 0" }} />
              <div className="px-3 space-y-2">
                <Skeleton className="h-2.5 w-20" style={{ backgroundColor: C.bgAlt }} />
                <Skeleton className="h-3 w-full" style={{ backgroundColor: C.bgAlt }} />
                <Skeleton className="h-1" style={{ backgroundColor: C.bgAlt, borderRadius: 1 }} />
              </div>
            </div>
          </div>

          {/* Game grid skeleton */}
          <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton
                  className="w-full aspect-[2/3]"
                  style={{ backgroundColor: C.surface, borderRadius: 2 }}
                />
                <Skeleton className="h-3 w-3/4" style={{ backgroundColor: C.surface }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
