'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/app/components/Modal';

interface ProfileData {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  shopifyCustomerId?: string;
  ordersCount?: number;
  totalSpent?: number;
  lastActiveAt?: string;
}

interface QuizInfo {
  _id: string;
  name: string;
  slug: string;
}

interface AttemptListItem {
  _id: string;
  quizId: QuizInfo | string;
  profileId?: ProfileData;
  email?: string;
  isAnonymous: boolean;
  sessionToken: string;
  startedAt: string;
  completedAt?: string;
  isCompleted: boolean;
}

interface QAItem {
  questionId: string;
  questionText: string;
  questionType: string;
  answerText: string;
}

interface EnrichedAttempt extends AttemptListItem {
  qaList: QAItem[];
}

interface DetailData {
  attempt: AttemptListItem;
  profile: ProfileData | null;
  allAttempts: EnrichedAttempt[];
}

export default function ResponsesPage() {
  const [attempts, setAttempts] = useState<AttemptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'logged_in' | 'anonymous'>('all');
  const [search, setSearch] = useState('');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  const fetchAttempts = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ filter });
      if (search.trim()) query.set('search', search.trim());
      const res = await fetch(`/api/admin/responses?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAttempts(data);
      }
    } catch (err) {
      console.error('Failed to fetch responses:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  const openDetail = async (id: string) => {
    setSelectedAttemptId(id);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await fetch(`/api/admin/responses/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
        if (data.allAttempts && data.allAttempts.length > 0) {
          setExpandedQuizId(data.allAttempts[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch response detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedAttemptId(null);
    setDetailData(null);
  };

  const getQuizName = (quizId: QuizInfo | string) => {
    if (typeof quizId === 'object' && quizId !== null) {
      return quizId.name;
    }
    return 'Unknown Quiz';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Individual Responses</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Monitor individual quiz takers, inspect customer profiles, and compare responses across quizzes.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 rounded-lg bg-surface-hover p-1">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-white text-ink shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            All Responses
          </button>
          <button
            onClick={() => setFilter('logged_in')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              filter === 'logged_in'
                ? 'bg-white text-ink shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            Logged-in Profiles
          </button>
          <button
            onClick={() => setFilter('anonymous')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              filter === 'anonymous'
                ? 'bg-white text-ink shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`}
          >
            Anonymous Takers
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search email, name, or token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAttempts()}
            className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 pl-9 text-sm text-ink placeholder-ink-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Responses List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card flex items-center justify-between p-4">
              <div className="space-y-2">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-3 w-24" />
              </div>
              <div className="skeleton h-8 w-28" />
            </div>
          ))}
        </div>
      ) : attempts.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            className="mb-4 text-ink-tertiary"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p className="text-sm font-medium text-ink-secondary">No quiz responses found</p>
          <p className="mt-1 text-xs text-ink-tertiary">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-hover text-xs font-semibold uppercase text-ink-secondary">
                <tr>
                  <th className="px-6 py-3">Taker / Profile</th>
                  <th className="px-6 py-3">Quiz Taken</th>
                  <th className="px-6 py-3">Date Completed</th>
                  <th className="px-6 py-3">Customer Spend</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attempts.map((att) => {
                  const profile = att.profileId;
                  const displayName = profile?.name || profile?.firstName ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : null;
                  const email = att.email || profile?.email;

                  return (
                    <tr key={att._id} className="transition-colors hover:bg-surface-hover/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full font-semibold text-white ${att.isAnonymous ? 'bg-ink-tertiary' : 'bg-accent'}`}>
                            {email ? email[0].toUpperCase() : 'A'}
                          </div>
                          <div>
                            <div className="font-semibold text-ink">
                              {displayName || (email ? email : 'Anonymous User')}
                            </div>
                            <div className="text-xs text-ink-secondary">
                              {email || `Token: ${att.sessionToken.slice(0, 8)}...`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-ink">
                        {getQuizName(att.quizId)}
                      </td>
                      <td className="px-6 py-4 text-ink-secondary">
                        {att.completedAt ? new Date(att.completedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : 'In progress'}
                      </td>
                      <td className="px-6 py-4">
                        {!att.isAnonymous && profile ? (
                          <div className="text-xs">
                            <div className="font-medium text-ink">${(profile.totalSpent || 0).toFixed(2)} USD</div>
                            <div className="text-ink-tertiary">{profile.ordersCount || 0} orders</div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-ink-secondary">
                            Anonymous
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openDetail(att._id)}
                          className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink shadow-sm transition-colors hover:bg-surface-hover"
                        >
                          View Profile vs Responses
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profile vs Responses Modal */}
      <Modal
        open={selectedAttemptId !== null}
        onClose={closeDetail}
        title="Profile vs Responses Panel"
        maxWidth="860px"
      >
        {detailLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-3 text-sm text-ink-secondary">Loading profile and responses...</p>
          </div>
        ) : detailData ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12 py-2">
            {/* Left Column: Profile Card */}
            <div className="md:col-span-4 space-y-4">
              <div className="rounded-xl border border-border bg-surface-hover/50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white ${detailData.attempt.isAnonymous ? 'bg-ink-tertiary' : 'bg-accent'}`}>
                    {detailData.profile?.email ? detailData.profile.email[0].toUpperCase() : 'A'}
                  </div>
                  <div>
                    <h3 className="font-bold text-ink">
                      {detailData.profile?.name || detailData.profile?.email || 'Anonymous Taker'}
                    </h3>
                    <p className="text-xs text-ink-secondary">
                      {detailData.profile?.email || 'No email attached'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border/80 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Status:</span>
                    <span className={`font-semibold ${detailData.attempt.isAnonymous ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {detailData.attempt.isAnonymous ? 'Anonymous' : 'Logged In'}
                    </span>
                  </div>
                  {detailData.profile && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-ink-secondary">Total Orders:</span>
                        <span className="font-semibold text-ink">{detailData.profile.ordersCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-secondary">Total Spend:</span>
                        <span className="font-semibold text-ink">${(detailData.profile.totalSpent || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-secondary">Shopify ID:</span>
                        <span className="font-mono text-ink-secondary">{detailData.profile.shopifyCustomerId || 'N/A'}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Session Token:</span>
                    <span className="font-mono text-ink-secondary">{detailData.attempt.sessionToken.slice(0, 12)}...</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-accent/5 p-4 border border-accent/20">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-accent">Summary</h4>
                <p className="mt-1 text-xs text-ink-secondary leading-relaxed">
                  This user has completed <strong className="text-ink">{detailData.allAttempts.length}</strong> quiz attempt(s).
                  Select any quiz below to compare their answers.
                </p>
              </div>
            </div>

            {/* Right Column: Quizzes & Responses */}
            <div className="md:col-span-8 space-y-4">
              <h3 className="text-sm font-semibold text-ink">Quiz Responses History ({detailData.allAttempts.length})</h3>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {detailData.allAttempts.map((att) => {
                  const isExpanded = expandedQuizId === att._id;
                  const qName = getQuizName(att.quizId);

                  return (
                    <div key={att._id} className="rounded-lg border border-border bg-white transition-all">
                      <button
                        onClick={() => setExpandedQuizId(isExpanded ? null : att._id)}
                        className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-hover/50"
                      >
                        <div>
                          <div className="font-semibold text-sm text-ink">{qName}</div>
                          <div className="text-xs text-ink-secondary">
                            {att.completedAt ? new Date(att.completedAt).toLocaleString() : 'In progress'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-secondary">
                            {att.qaList.length} Qs
                          </span>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border bg-surface/30 p-3 space-y-3">
                          {att.qaList.length === 0 ? (
                            <p className="text-xs text-ink-tertiary">No answers recorded for this attempt.</p>
                          ) : (
                            att.qaList.map((qa, index) => (
                              <div key={qa.questionId} className="space-y-1">
                                <div className="text-xs font-medium text-ink">
                                  <span className="text-ink-secondary mr-1.5">{index + 1}.</span>
                                  {qa.questionText}
                                </div>
                                <div className="rounded-md bg-white border border-border/60 px-2.5 py-1.5 text-xs font-semibold text-accent shadow-2xs">
                                  {qa.answerText}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
