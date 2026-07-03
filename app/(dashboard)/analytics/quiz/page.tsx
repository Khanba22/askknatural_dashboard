'use client';

import { useState, useEffect, useCallback } from 'react';
import { KpiCard, KpiCardSkeleton } from '@/app/components/KpiCard';
import { BarChart } from '@/app/components/Charts';
import { FunnelChart } from '@/app/components/FunnelChart';
import { WordCloud } from '@/app/components/WordCloud';

interface QuizOption {
  _id: string;
  name: string;
}

interface PerQuestionOption {
  optionId: string;
  text: string;
  count: number;
  pct: number;
}

interface PerQuestion {
  questionId: string;
  text: string;
  type: 'text' | 'single_option' | 'multi_option';
  totalAnswers: number;
  options?: PerQuestionOption[];
  wordFrequencies?: { word: string; count: number }[];
  rawSample?: string[];
}

interface QuizAnalytics {
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
  avgCompletionTime: string;
  medianCompletionTime: string;
  funnelSteps: { label: string; value: number }[];
  perQuestion: PerQuestion[];
}

export default function QuizAnalyticsPage() {
  const [quizzes, setQuizzes] = useState<QuizOption[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState<QuizAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  useEffect(() => {
    async function loadQuizzes() {
      try {
        const res = await fetch('/api/admin/quizzes');
        if (res.ok) {
          const list = await res.json();
          setQuizzes(list.map((q: { _id: string; name: string }) => ({ _id: q._id, name: q.name })));
          if (list.length > 0) setSelectedQuiz(list[0]._id);
        }
      } finally {
        setLoadingQuizzes(false);
      }
    }
    loadQuizzes();
  }, []);

  const fetchAnalytics = useCallback(async () => {
    if (!selectedQuiz) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const res = await fetch(`/api/admin/analytics/quiz/${selectedQuiz}?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [selectedQuiz, dateFrom, dateTo]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Quiz Analytics</h1>
        <p className="mt-1 text-sm text-ink-secondary">Detailed per-quiz performance and response data</p>
      </div>

      {/* Controls */}
      <div className="card mb-6 flex flex-wrap items-center gap-4 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-secondary">
            Quiz
          </label>
          {loadingQuizzes ? (
            <div className="skeleton h-9 w-full rounded-md" />
          ) : (
            <select
              value={selectedQuiz}
              onChange={(e) => setSelectedQuiz(e.target.value)}
              className="w-full rounded-md border border-[rgba(20,18,31,0.08)] bg-sunken px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent"
            >
              {quizzes.map((q) => (
                <option key={q._id} value={q._id}>
                  {q.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-secondary">
            From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-[rgba(20,18,31,0.08)] bg-sunken px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-secondary">
            To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-[rgba(20,18,31,0.08)] bg-sunken px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* KPI Row */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : data ? (
          <>
            <KpiCard label="Attempts" value={data.totalAttempts.toLocaleString()} />
            <KpiCard label="Completions" value={data.completedAttempts.toLocaleString()} />
            <KpiCard label="Completion Rate" value={`${data.completionRate}%`} />
            <KpiCard label="Median Time" value={data.medianCompletionTime} />
          </>
        ) : null}
      </div>

      {!loading && data && (
        <>
          {/* Funnel Chart */}
          {data.funnelSteps.length > 0 && (
            <div className="card mb-8 p-5">
              <h2 className="mb-4 text-sm font-semibold text-ink">Drop-off Funnel</h2>
              <p className="mb-4 text-xs text-ink-tertiary">
                How many attempts reached each question
              </p>
              <FunnelChart steps={data.funnelSteps} />
            </div>
          )}

          {/* Per-Question Analysis */}
          {data.perQuestion.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-ink">Per-Question Breakdown</h2>

              {data.perQuestion.map((pq, idx) => (
                <div key={pq.questionId} className="card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-xs font-medium text-ink-tertiary">Q{idx + 1}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                      pq.type === 'text' ? 'bg-chart-3/10 text-chart-3' :
                      pq.type === 'single_option' ? 'bg-chart-1/10 text-chart-1' :
                      'bg-chart-4/10 text-chart-4'
                    }`}>
                      {pq.type === 'text' ? 'Text' : pq.type === 'single_option' ? 'Single' : 'Multi'}
                    </span>
                    <span className="text-xs text-ink-tertiary tabular-nums">
                      {pq.totalAnswers} responses
                    </span>
                  </div>
                  <h3 className="mb-4 font-medium text-ink">{pq.text}</h3>

                  {pq.type === 'text' ? (
                    <div>
                      {pq.wordFrequencies && pq.wordFrequencies.length > 0 ? (
                        <>
                          <WordCloud words={pq.wordFrequencies} />
                          {pq.rawSample && pq.rawSample.length > 0 && (
                            <div className="mt-4 border-t border-[rgba(20,18,31,0.06)] pt-4">
                              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-secondary">
                                Recent Responses
                              </h4>
                              <ul className="space-y-1.5">
                                {pq.rawSample.map((text, i) => (
                                  <li key={i} className="rounded-md bg-sunken px-3 py-2 text-sm text-ink-secondary italic">
                                    &ldquo;{text}&rdquo;
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-ink-tertiary">No responses yet</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      {pq.options && pq.options.length > 0 ? (
                        <BarChart
                          data={pq.options.map((o) => ({
                            label: o.text,
                            value: o.count,
                            pct: o.pct,
                          }))}
                        />
                      ) : (
                        <p className="text-sm text-ink-tertiary">No responses yet</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {data.totalAttempts === 0 && (
            <div className="card flex flex-col items-center py-16 text-center">
              <p className="text-sm text-ink-secondary">
                No attempts for this quiz yet. Data will appear once users start responding.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
