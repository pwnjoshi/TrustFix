export function SkeletonText({ width = "60%" }: { width?: string }) {
  return <div className="skeleton skeleton-text" style={{ width }} />;
}

export function SkeletonHeading({ width = "50%" }: { width?: string }) {
  return <div className="skeleton skeleton-heading" style={{ width }} />;
}

export function SkeletonMetric() {
  return <div className="skeleton skeleton-metric" />;
}

export function MetricsSkeleton() {
  return (
    <div className="metrics">
      {[0, 1, 2, 3].map((i) => (
        <article key={i}>
          <SkeletonText width="70%" />
          <SkeletonMetric />
        </article>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="page dashboard">
      <div className="page-heading">
        <div>
          <SkeletonText width="120px" />
          <SkeletonHeading width="200px" />
          <SkeletonText width="300px" />
        </div>
      </div>
      <MetricsSkeleton />
      <div className="dashboard-grid">
        <div className="panel">
          <SkeletonHeading />
          <div style={{ padding: "31px 0" }}>
            <SkeletonMetric />
          </div>
          <div className="review-meta">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <SkeletonText width="60px" />
                <SkeletonText width="80px" />
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <SkeletonHeading />
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton skeleton-row" style={{ marginTop: i === 0 ? 14 : 0 }} />
          ))}
        </div>
      </div>
    </main>
  );
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="data-panel">
      <div className="data-head">
        <SkeletonText width="80px" />
        <SkeletonText width="60px" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="data-row">
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <SkeletonText width="140px" />
            <SkeletonText width="200px" />
          </div>
        </div>
      ))}
    </div>
  );
}
