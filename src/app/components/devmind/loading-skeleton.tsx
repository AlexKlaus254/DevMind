export function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6">
            <div className="h-4 bg-muted rounded w-20 mb-4"></div>
            <div className="h-8 bg-muted rounded w-16 mb-2"></div>
            <div className="h-3 bg-muted rounded w-24"></div>
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="h-6 bg-muted rounded w-32 mb-6"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>

      {/* Card Skeleton */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="h-20 bg-muted rounded"></div>
      </div>
    </div>
  );
}
