'use client';

import { useState, useEffect } from 'react';
import { KpiCard, KpiCardSkeleton } from '@/app/components/KpiCard';
import { AreaChart } from '@/app/components/Charts';

interface DropoffItem {
  _id: string;
  quizName: string;
  total: number;
  completed: number;
  abandoned: number;
  dropoffRate: number;
}

interface GlobalData {
  totalAttempts: number;
  totalCompleted: number;
  completionRate: number;
  activeQuizzes: number;
  anonymousAttempts: number;
  loggedInAttempts: number;
  anonymousCompleted: number;
  loggedInCompleted: number;
  avgCompletionTime: string;
  mostPopularQuiz: { name: string; attempts: number } | null;
  attemptsOverTime: { label: string; value: number }[];
  dropoffLeaderboard: DropoffItem[];
}

export default function GlobalAnalyticsPage() {
  const [data, setData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/analytics/global');
        if (res.ok) setData(await res.json());
        else console.error('Failed to load global analytics:', res.status);
      } catch (error) {
        console.error('Failed to load global analytics:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 text-xl font-semibold tracking-tight text-ink">
        Global Analytics
      </h1>

      {/* Primary KPIs */}
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
            <KpiCard label="Total Attempts" value={data.totalAttempts.toLocaleString()} />
            <KpiCard label="Completions" value={data.totalCompleted.toLocaleString()} />
            <KpiCard label="Completion Rate" value={`${data.completionRate}%`} />
            <KpiCard label="Active Quizzes" value={data.activeQuizzes} />
          </>
        ) : null}
      </div>

      {/* Secondary KPIs */}
      {!loading && data && (
        <div className="mb-4 grid grid-cols-2 gap-4">
          <KpiCard
            label="Median Completion Time"
            value={data.avgCompletionTime}
          />
          <KpiCard
            label="Most Popular Quiz (30d)"
            value={data.mostPopularQuiz?.name || 'N/A'}
          >
            {data.mostPopularQuiz && (
              <span className="text-xs text-ink-secondary tabular-nums">
                {data.mostPopularQuiz.attempts} attempts
              </span>
            )}
          </KpiCard>
        </div>
      )}

      {/* Cohort Breakdown: Anonymous vs Logged-In */}
      {!loading && data && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="card p-5 border border-border bg-gradient-to-br from-white to-surface-hover/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Logged-In Users</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                {data.totalAttempts > 0 ? `${Math.round((data.loggedInAttempts / data.totalAttempts) * 100)}% of total` : '0%'}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-ink">{data.loggedInAttempts.toLocaleString()}</span>
              <span className="text-xs text-ink-secondary">attempts</span>
            </div>
            <div className="mt-2 text-xs text-ink-secondary">
              <span className="font-semibold text-emerald-600">{data.loggedInCompleted.toLocaleString()}</span> completed ({data.loggedInAttempts > 0 ? `${Math.round((data.loggedInCompleted / data.loggedInAttempts) * 100)}%` : '0%'} rate)
            </div>
          </div>

          <div className="card p-5 border border-border bg-gradient-to-br from-white to-surface-hover/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">Anonymous Takers</span>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {data.totalAttempts > 0 ? `${Math.round((data.anonymousAttempts / data.totalAttempts) * 100)}% of total` : '0%'}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-ink">{data.anonymousAttempts.toLocaleString()}</span>
              <span className="text-xs text-ink-secondary">attempts</span>
            </div>
            <div className="mt-2 text-xs text-ink-secondary">
              <span className="font-semibold text-amber-600">{data.anonymousCompleted.toLocaleString()}</span> completed ({data.anonymousAttempts > 0 ? `${Math.round((data.anonymousCompleted / data.anonymousAttempts) * 100)}%` : '0%'} rate)
            </div>
          </div>
        </div>
      )}

      {/* Attempts Over Time */}
      {!loading && data && (
        <div className="card mb-8 p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Attempts Over Time (30 days)</h2>
          <AreaChart data={data.attemptsOverTime} />
        </div>
      )}

      {/* Drop-off Leaderboard */}
      {!loading && data && data.dropoffLeaderboard.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-[rgba(20,18,31,0.06)] px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Drop-off Leaderboard</h2>
            <p className="mt-0.5 text-xs text-ink-tertiary">
              Quizzes with the highest abandonment rates
            </p>
          </div>
          <table className="data-table w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(20,18,31,0.06)]">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Quiz</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Started</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Completed</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Abandoned</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Drop-off</th>
              </tr>
            </thead>
            <tbody>
              {data.dropoffLeaderboard.map((item) => (
                <tr key={item._id} className="transition-colors hover:bg-sunken/50">
                  <td className="px-5 py-3 font-medium text-ink">{item.quizName}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink-secondary">{item.total}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-success">{item.completed}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-ink-secondary">{item.abandoned}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`tabular-nums font-medium ${
                      item.dropoffRate > 50 ? 'text-danger' : item.dropoffRate > 25 ? 'text-warning' : 'text-ink-secondary'
                    }`}>
                      {item.dropoffRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && data && data.totalAttempts === 0 && (
        <div className="card flex flex-col items-center py-16 text-center">
          <p className="text-sm text-ink-secondary">No quiz attempts yet. Analytics will appear once users start taking quizzes.</p>
        </div>
      )}
    </div>
  );
}
