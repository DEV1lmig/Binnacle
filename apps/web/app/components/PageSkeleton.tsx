import { Skeleton } from "@/app/components/ui/skeleton";

/**
 * Full-page skeleton loader for protected pages while auth is being resolved.
 * Provides a smooth loading experience without content flash.
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Grid Skeleton */}
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

/**
 * Feed-specific skeleton with sidebar layout
 */
export function FeedPageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 space-y-4">
              <Skeleton className="h-6 w-32 mb-4" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Backlog-specific skeleton with filter controls
 */
export function BacklogPageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-5 w-96 mb-6" />
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Skeleton className="h-10 flex-1 md:max-w-sm" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-56 w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
