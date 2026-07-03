'use client';

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

interface FunnelStep {
  label: string;
  value: number;
}

interface FunnelChartProps {
  steps: FunnelStep[];
  height?: number;
}

export function FunnelChart({ steps, height = 280 }: FunnelChartProps) {
  if (!steps.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-ink-tertiary">
        No data available
      </div>
    );
  }

  const maxValue = steps[0]?.value || 1;
  const barHeight = Math.min(36, Math.floor((height - 40) / steps.length) - 8);

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const widthPct = Math.max((step.value / maxValue) * 100, 8);
        const dropoff = i > 0 ? steps[i - 1].value - step.value : 0;
        const dropoffPct = i > 0 && steps[i - 1].value > 0
          ? ((dropoff / steps[i - 1].value) * 100).toFixed(1)
          : null;

        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-right text-xs text-ink-secondary truncate" title={step.label}>
              {step.label}
            </span>
            <div className="flex-1">
              <div
                className="flex items-center rounded-sm px-2 transition-all"
                style={{
                  width: `${widthPct}%`,
                  height: `${barHeight}px`,
                  background: CHART_COLORS[i % CHART_COLORS.length],
                  minWidth: '40px',
                }}
              >
                <span
                  className="tabular-nums text-xs font-medium text-white"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                >
                  {step.value}
                </span>
              </div>
            </div>
            {dropoffPct && (
              <span className="w-16 shrink-0 text-xs text-danger tabular-nums">
                -{dropoffPct}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
