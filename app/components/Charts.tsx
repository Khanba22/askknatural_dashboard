'use client';

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

interface BarChartData {
  label: string;
  value: number;
  pct?: number;
}

interface BarChartProps {
  data: BarChartData[];
  height?: number;
  showPercent?: boolean;
}

export function BarChart({ data, height = 240, showPercent = true }: BarChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-ink-tertiary">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(48, Math.max(24, Math.floor(500 / data.length)));
  const totalWidth = data.length * (barWidth + 16) + 40;

  return (
    <div className="overflow-x-auto">
      <svg
        width={Math.max(totalWidth, 300)}
        height={height + 60}
        className="block"
        role="img"
        aria-label="Bar chart"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = height - pct * height + 20;
          const labelValue = Math.round(maxValue * pct);
          return (
            <g key={pct}>
              <line
                x1="40"
                y1={y}
                x2={totalWidth}
                y2={y}
                stroke="rgba(20,18,31,0.06)"
                strokeDasharray="3,3"
              />
              <text
                x="36"
                y={y + 4}
                textAnchor="end"
                className="fill-ink-tertiary"
                style={{ fontSize: '11px', fontFamily: 'var(--font-numeric)' }}
              >
                {labelValue}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, i) => {
          const barHeight = (item.value / maxValue) * height;
          const x = 50 + i * (barWidth + 16);
          const y = height - barHeight + 20;
          const color = CHART_COLORS[i % CHART_COLORS.length];

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="3"
                ry="0"
                fill={color}
                style={{ borderRadius: '3px 3px 0 0' }}
              >
                <title>{`${item.label}: ${item.value}${item.pct != null ? ` (${item.pct}%)` : ''}`}</title>
              </rect>
              {/* Rounded top corners via clip path */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.min(6, barHeight)}
                rx="3"
                fill={color}
              />
              {/* Label */}
              <text
                x={x + barWidth / 2}
                y={height + 36}
                textAnchor="middle"
                className="fill-ink-tertiary"
                style={{ fontSize: '11px' }}
              >
                {item.label.length > 12 ? item.label.slice(0, 10) + '...' : item.label}
              </text>
              {/* Value on top */}
              {showPercent && item.pct != null && (
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  className="fill-ink-secondary"
                  style={{ fontSize: '11px', fontFamily: 'var(--font-numeric)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {item.pct}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface AreaChartData {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: AreaChartData[];
  height?: number;
  color?: string;
}

export function AreaChart({ data, height = 200, color = 'var(--color-chart-1)' }: AreaChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-ink-tertiary">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = Math.max(data.length * 60, 400);
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * innerWidth,
    y: padding.top + innerHeight - (d.value / maxValue) * innerHeight,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`;

  return (
    <div className="overflow-x-auto">
      <svg width={chartWidth} height={chartHeight} className="block" role="img" aria-label="Area chart">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padding.top + innerHeight - pct * innerHeight;
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="rgba(20,18,31,0.06)"
                strokeDasharray="3,3"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-ink-tertiary"
                style={{ fontSize: '11px', fontFamily: 'var(--font-numeric)' }}
              >
                {Math.round(maxValue * pct)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill={color} opacity="0.08" />

        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill={color} />
            <text
              x={p.x}
              y={padding.top + innerHeight + 16}
              textAnchor="middle"
              className="fill-ink-tertiary"
              style={{ fontSize: '10px' }}
            >
              {data[i].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
