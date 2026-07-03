'use client';

interface WordFrequency {
  word: string;
  count: number;
}

interface WordCloudProps {
  words: WordFrequency[];
  maxWords?: number;
}

export function WordCloud({ words, maxWords = 40 }: WordCloudProps) {
  if (!words.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-ink-tertiary">
        No text responses yet
      </div>
    );
  }

  const sorted = [...words].sort((a, b) => b.count - a.count).slice(0, maxWords);
  const maxCount = sorted[0]?.count || 1;
  const minCount = sorted[sorted.length - 1]?.count || 1;
  const range = maxCount - minCount || 1;

  // Map count to font size between 13px and 36px
  function fontSize(count: number): number {
    const normalized = (count - minCount) / range;
    return 13 + normalized * 23;
  }

  // Map count to opacity between 0.5 and 1
  function opacity(count: number): number {
    const normalized = (count - minCount) / range;
    return 0.5 + normalized * 0.5;
  }

  const colors = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-5)',
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 py-4">
      {sorted.map((w, i) => (
        <span
          key={w.word}
          className="inline-block cursor-default transition-transform hover:scale-110"
          style={{
            fontSize: `${fontSize(w.count)}px`,
            fontWeight: w.count === maxCount ? 600 : 400,
            color: colors[i % colors.length],
            opacity: opacity(w.count),
          }}
          title={`${w.word}: ${w.count}`}
        >
          {w.word}
        </span>
      ))}
    </div>
  );
}
