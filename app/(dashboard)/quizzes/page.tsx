'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/app/components/Modal';

interface QuizListItem {
  _id: string;
  name: string;
  slug: string;
  homeOptionText?: string;
  description?: string;
  outputUrl?: string;
  isActive: boolean;
  orderIndex: number;
  questionCount: number;
  attemptCount: number;
  updatedAt: string;
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    homeOptionText: '',
    description: '',
    outputUrl: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchQuizzes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/quizzes');
      if (res.ok) setQuizzes(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async function handleCreate() {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          slug: formData.slug || autoSlug(formData.name),
          isActive: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create quiz');
        return;
      }
      setShowCreate(false);
      setFormData({ name: '', slug: '', homeOptionText: '', description: '', outputUrl: '' });
      fetchQuizzes();
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone if there are no attempts.`)) return;
    await fetch(`/api/admin/quizzes/${id}`, { method: 'DELETE' });
    fetchQuizzes();
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/quizzes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    });
    fetchQuizzes();
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Quizzes</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Manage your quizzes, questions, and options
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          + New Quiz
        </button>
      </div>

      {/* Quiz List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-4">
                <div className="skeleton h-5 w-40" />
                <div className="skeleton h-4 w-20" />
                <div className="flex-1" />
                <div className="skeleton h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            className="mb-4 text-ink-tertiary"
          >
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
          </svg>
          <p className="text-sm text-ink-secondary">No quizzes yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Create your first quiz
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {quizzes.map((quiz) => (
            <div key={quiz._id} className="card flex items-center gap-4 px-5 py-4 transition-colors hover:bg-canvas">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a
                    href={`/quizzes/${quiz._id}`}
                    className="font-medium text-ink hover:text-accent"
                  >
                    {quiz.name}
                  </a>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      quiz.isActive
                        ? 'bg-success/10 text-success'
                        : 'bg-ink-tertiary/10 text-ink-tertiary'
                    }`}
                  >
                    {quiz.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-ink-tertiary">
                  /{quiz.slug}
                  {quiz.homeOptionText && ` · "${quiz.homeOptionText}"`}
                </p>
              </div>

              <div className="flex items-center gap-6 text-xs text-ink-secondary tabular-nums">
                <span>{quiz.questionCount} questions</span>
                <span>{quiz.attemptCount} attempts</span>
                <span>
                  {new Date(quiz.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(quiz._id, quiz.isActive)}
                  className="rounded-md p-1.5 text-ink-tertiary transition-colors hover:bg-sunken hover:text-ink"
                  title={quiz.isActive ? 'Deactivate' : 'Activate'}
                >
                  {quiz.isActive ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
                <a
                  href={`/quizzes/${quiz._id}`}
                  className="rounded-md p-1.5 text-ink-tertiary transition-colors hover:bg-sunken hover:text-ink"
                  title="Edit"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </a>
                <button
                  onClick={() => handleDelete(quiz._id, quiz.name)}
                  className="rounded-md p-1.5 text-ink-tertiary transition-colors hover:bg-danger/10 hover:text-danger"
                  title="Delete"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Quiz Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Quiz">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData((f) => ({
                  ...f,
                  name: e.target.value,
                  slug: f.slug || autoSlug(e.target.value),
                }));
              }}
              placeholder="e.g. Wellness Assessment"
              className="block w-full rounded-md border border-[rgba(20,18,31,0.08)] bg-sunken px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Slug *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData((f) => ({ ...f, slug: e.target.value }))}
              placeholder="wellness-assessment"
              className="block w-full rounded-md border border-[rgba(20,18,31,0.08)] bg-sunken px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Hub Label
            </label>
            <input
              type="text"
              value={formData.homeOptionText}
              onChange={(e) => setFormData((f) => ({ ...f, homeOptionText: e.target.value }))}
              placeholder="Shown on the quiz hub screen"
              className="block w-full rounded-md border border-[rgba(20,18,31,0.08)] bg-sunken px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <p className="mt-1 text-xs text-ink-tertiary">
              Leave empty to hide from the hub
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Optional description"
              className="block w-full rounded-md border border-[rgba(20,18,31,0.08)] bg-sunken px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-secondary">
              Output URL (Optional)
            </label>
            <input
              type="text"
              value={formData.outputUrl}
              onChange={(e) => setFormData((f) => ({ ...f, outputUrl: e.target.value }))}
              placeholder="e.g. /products/recycle (Leave blank for expert consult)"
              className="block w-full rounded-md border border-[rgba(20,18,31,0.08)] bg-sunken px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <p className="mt-1 text-xs text-ink-tertiary">
              URL to redirect/link on completion. If empty, shows expert consultation screen.
            </p>
          </div>

          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-md px-4 py-2 text-sm text-ink-secondary transition-colors hover:bg-sunken"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!formData.name || creating}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? 'Creating...' : 'Create Quiz'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
