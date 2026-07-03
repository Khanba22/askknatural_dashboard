import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  children?: ReactNode;
}

export function KpiCard({ label, value, trend, children }: KpiCardProps) {
  return (
    <div className="card p-5">
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-secondary">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="tabular-nums text-display font-semibold text-ink">
          {value}
        </span>
        {trend && (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              trend.direction === 'up' ? 'text-success' : 'text-danger'
            }`}
          >
            {trend.direction === 'up' ? '▲' : '▼'}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="skeleton mb-2 h-3 w-20" />
      <div className="skeleton h-10 w-24" />
    </div>
  );
}
