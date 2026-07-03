'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Option {
  _id: string;
  text: string;
  orderIndex: number;
}

interface QuestionData {
  _id: string;
  text: string;
  type: 'text' | 'single_option' | 'multi_option';
  enforced: boolean;
  orderIndex: number;
  options: Option[];
}

interface QuizData {
  _id: string;
  name: string;
  slug: string;
  homeOptionText?: string;
  description?: string;
  outputUrl?: string;
  isActive: boolean;
  questions: QuestionData[];
  attemptCount: number;
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'single_option', label: 'Single Choice' },
  { value: 'multi_option', label: 'Multiple Choice' },
];

export default function QuizBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [metaForm, setMetaForm] = useState({ name: '', slug: '', homeOptionText: '', description: '', outputUrl: '' });

  // New question form
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', type: 'single_option' as QuestionData['type'], enforced: false });
  const [addingQuestion, setAddingQuestion] = useState(false);

  // Edit question state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionEditForm, setQuestionEditForm] = useState({ text: '', type: 'single_option' as QuestionData['type'], enforced: false });

  // New & edit option state
  const [addingOptionFor, setAddingOptionFor] = useState<string | null>(null);
  const [newOptionText, setNewOptionText] = useState('');
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [optionEditText, setOptionEditText] = useState('');

  // Drag state
  const [draggedQuestion, setDraggedQuestion] = useState<string | null>(null);

  const fetchQuiz = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/quizzes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setQuiz(data);
        setMetaForm({
          name: data.name,
          slug: data.slug,
          homeOptionText: data.homeOptionText || '',
          description: data.description || '',
          outputUrl: data.outputUrl || '',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  async function saveMeta() {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await fetch(`/api/admin/quizzes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metaForm),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchQuiz();
    } finally {
      setSaving(false);
    }
  }

  async function addQuestion() {
    setAddingQuestion(true);
    try {
      const res = await fetch(`/api/admin/quizzes/${id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuestion),
      });
      if (res.ok) {
        setShowAddQuestion(false);
        setNewQuestion({ text: '', type: 'single_option', enforced: false });
        fetchQuiz();
      }
    } finally {
      setAddingQuestion(false);
    }
  }

  async function updateQuestion(questionId: string, updates: Partial<QuestionData>) {
    await fetch(`/api/admin/questions/${questionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    fetchQuiz();
  }

  async function deleteQuestion(questionId: string) {
    if (!confirm('Delete this question?')) return;
    const res = await fetch(`/api/admin/questions/${questionId}`, { method: 'DELETE' });
    if (res.status === 409) {
      const data = await res.json();
      alert(data.error);
      return;
    }
    fetchQuiz();
  }

  async function addOption(questionId: string) {
    if (!newOptionText.trim()) return;
    await fetch(`/api/admin/questions/${questionId}/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newOptionText }),
    });
    setNewOptionText('');
    setAddingOptionFor(null);
    fetchQuiz();
  }

  async function updateOption(optionId: string, text: string) {
    if (!text.trim()) return;
    await fetch(`/api/admin/options/${optionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    setEditingOptionId(null);
    fetchQuiz();
  }

  async function deleteOption(optionId: string) {
    await fetch(`/api/admin/options/${optionId}`, { method: 'DELETE' });
    fetchQuiz();
  }

  async function handleQuestionDragEnd(targetIndex: number) {
    if (!quiz || draggedQuestion === null) return;
    const questions = [...quiz.questions];
    const dragIndex = questions.findIndex((q) => q._id === draggedQuestion);
    if (dragIndex === -1 || dragIndex === targetIndex) {
      setDraggedQuestion(null);
      return;
    }

    const [moved] = questions.splice(dragIndex, 1);
    questions.splice(targetIndex, 0, moved);

    setQuiz({ ...quiz, questions });
    setDraggedQuestion(null);

    await fetch(`/api/admin/quizzes/${id}/questions/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: questions.map((q) => q._id) }),
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-20 text-ink-secondary">
        Quiz not found.{' '}
        <a href="/quizzes" className="text-accent hover:underline">
          Back to list
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/quizzes')}
          className="mb-2 flex items-center gap-1 text-sm text-ink-secondary transition-colors hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to quizzes
        </button>

        {/* Always-editable Quiz Configuration Card */}
        <div className="card p-6 mb-8 border border-[rgba(20,18,31,0.08)] bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(20,18,31,0.06)]">
            <div>
              <h1 className="text-xl font-bold text-ink">Quiz Configuration & Details</h1>
              <p className="text-xs text-ink-tertiary">Modify quiz name, routing URL, storefront labels, and slug</p>
            </div>
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  ✓ Saved Successfully
                </span>
              )}
              <button
                onClick={saveMeta}
                disabled={saving}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent-hover disabled:opacity-60 flex items-center gap-1.5"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1">
                Quiz Name *
              </label>
              <input
                type="text"
                value={metaForm.name}
                onChange={(e) => setMetaForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., PCOS & Hormonal Imbalance Assessment"
                className="block w-full rounded-md border border-[rgba(20,18,31,0.12)] bg-sunken px-3 py-2 text-sm text-ink font-medium focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1">
                URL Slug *
              </label>
              <input
                type="text"
                value={metaForm.slug}
                onChange={(e) => setMetaForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="pcos-hormonal-imbalance"
                className="block w-full rounded-md border border-[rgba(20,18,31,0.12)] bg-sunken px-3 py-2 text-sm text-ink focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1">
                Storefront Hub Label
              </label>
              <input
                type="text"
                value={metaForm.homeOptionText}
                onChange={(e) => setMetaForm((f) => ({ ...f, homeOptionText: e.target.value }))}
                placeholder="e.g., PCOS / Hormonal imbalance"
                className="block w-full rounded-md border border-[rgba(20,18,31,0.12)] bg-sunken px-3 py-2 text-sm text-ink focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent transition-colors"
              />
              <p className="mt-1 text-[11px] text-ink-tertiary">Text shown on the initial quiz choice screen</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1">
                Output URL / Product Redirect
              </label>
              <input
                type="text"
                value={metaForm.outputUrl}
                onChange={(e) => setMetaForm((f) => ({ ...f, outputUrl: e.target.value }))}
                placeholder="e.g., /products/recycle (Leave empty for expert consult screen)"
                className="block w-full rounded-md border border-[rgba(20,18,31,0.12)] bg-sunken px-3 py-2 text-sm text-ink focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent transition-colors"
              />
              <p className="mt-1 text-[11px] text-ink-tertiary">If empty, completion triggers WhatsApp / Expert Consult screen</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1">
                Description
              </label>
              <textarea
                value={metaForm.description}
                onChange={(e) => setMetaForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Brief description of what this quiz evaluates..."
                className="block w-full rounded-md border border-[rgba(20,18,31,0.12)] bg-sunken px-3 py-2 text-sm text-ink focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">
          Questions ({quiz.questions.length})
        </h2>
        <button
          onClick={() => setShowAddQuestion(true)}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          + Add Question
        </button>
      </div>

      {quiz.questions.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-center">
          <p className="text-sm text-ink-secondary">No questions yet</p>
          <button
            onClick={() => setShowAddQuestion(true)}
            className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Add your first question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {quiz.questions.map((q, idx) => (
            <div
              key={q._id}
              className={`card p-5 transition-all ${
                draggedQuestion === q._id ? 'opacity-50' : ''
              }`}
              draggable
              onDragStart={() => setDraggedQuestion(q._id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleQuestionDragEnd(idx)}
              onDragEnd={() => setDraggedQuestion(null)}
            >
              {editingQuestionId === q._id ? (
                <div className="mb-3 space-y-3 bg-sunken p-4 rounded-lg border border-[rgba(20,18,31,0.08)]">
                  <div>
                    <label className="block text-xs font-semibold text-ink-secondary mb-1">Question Text</label>
                    <input
                      type="text"
                      value={questionEditForm.text}
                      onChange={(e) => setQuestionEditForm((f) => ({ ...f, text: e.target.value }))}
                      className="block w-full rounded-md border border-[rgba(20,18,31,0.12)] bg-white px-3 py-1.5 text-sm font-medium text-ink focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink-secondary mb-1">Question Type</label>
                      <select
                        value={questionEditForm.type}
                        onChange={(e) => setQuestionEditForm((f) => ({ ...f, type: e.target.value as QuestionData['type'] }))}
                        className="rounded-md border border-[rgba(20,18,31,0.12)] bg-white px-3 py-1.5 text-sm text-ink focus:border-accent focus:ring-1 focus:ring-accent"
                      >
                        {QUESTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-ink cursor-pointer mt-5">
                      <input
                        type="checkbox"
                        checked={questionEditForm.enforced}
                        onChange={(e) => setQuestionEditForm((f) => ({ ...f, enforced: e.target.checked }))}
                        className="rounded border-ink-tertiary text-accent focus:ring-accent"
                      />
                      <span>Required</span>
                    </label>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        updateQuestion(q._id, questionEditForm);
                        setEditingQuestionId(null);
                      }}
                      className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
                    >
                      Save Question
                    </button>
                    <button
                      onClick={() => setEditingQuestionId(null)}
                      className="rounded-md px-3 py-1.5 text-xs text-ink-secondary hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-3 flex items-start gap-3">
                  {/* Drag handle */}
                  <div className="mt-1 cursor-grab text-ink-tertiary active:cursor-grabbing">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="6" r="1.5" />
                      <circle cx="15" cy="6" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" />
                      <circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="18" r="1.5" />
                      <circle cx="15" cy="18" r="1.5" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-ink-tertiary">Q{idx + 1}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                        q.type === 'text' ? 'bg-chart-3/10 text-chart-3' :
                        q.type === 'single_option' ? 'bg-chart-1/10 text-chart-1' :
                        'bg-chart-4/10 text-chart-4'
                      }`}>
                        {q.type === 'text' ? 'Text' : q.type === 'single_option' ? 'Single' : 'Multi'}
                      </span>
                      {q.enforced && (
                        <span className="inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-ink">{q.text}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuestion(q._id, { enforced: !q.enforced })}
                      className={`rounded-md px-2 py-1 text-xs transition-colors ${
                        q.enforced ? 'bg-danger/10 text-danger' : 'text-ink-tertiary hover:bg-sunken'
                      }`}
                      title={q.enforced ? 'Make optional' : 'Make required'}
                    >
                      {q.enforced ? 'Required' : 'Optional'}
                    </button>
                    <button
                      onClick={() => {
                        setQuestionEditForm({ text: q.text, type: q.type, enforced: q.enforced });
                        setEditingQuestionId(q._id);
                      }}
                      className="rounded-md p-1.5 text-ink-tertiary transition-colors hover:bg-sunken hover:text-ink"
                      title="Edit question text and type"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteQuestion(q._id)}
                      className="rounded-md p-1.5 text-ink-tertiary transition-colors hover:bg-danger/10 hover:text-danger"
                      title="Delete question"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Options (for option-type questions) */}
              {(q.type === 'single_option' || q.type === 'multi_option') && (
                <div className="ml-7 space-y-1.5">
                  {q.options
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((opt) => (
                      <div key={opt._id} className="flex items-center gap-2 rounded-md bg-sunken px-3 py-2 text-sm">
                        <span className="text-ink-tertiary">
                          {q.type === 'single_option' ? '○' : '☐'}
                        </span>
                        {editingOptionId === opt._id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={optionEditText}
                              onChange={(e) => setOptionEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') updateOption(opt._id, optionEditText);
                                if (e.key === 'Escape') setEditingOptionId(null);
                              }}
                              autoFocus
                              className="flex-1 rounded border border-accent bg-white px-2 py-1 text-xs focus:outline-none"
                            />
                            <button
                              onClick={() => updateOption(opt._id, optionEditText)}
                              className="rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingOptionId(null)}
                              className="text-xs text-ink-tertiary hover:text-ink"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 text-ink">{opt.text}</span>
                            <button
                              onClick={() => {
                                setOptionEditText(opt.text);
                                setEditingOptionId(opt._id);
                              }}
                              className="text-ink-tertiary transition-colors hover:text-ink"
                              title="Edit option text"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteOption(opt._id)}
                              className="text-ink-tertiary transition-colors hover:text-danger"
                              title="Delete option"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    ))}

                  {addingOptionFor === q._id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newOptionText}
                        onChange={(e) => setNewOptionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addOption(q._id);
                          if (e.key === 'Escape') {
                            setAddingOptionFor(null);
                            setNewOptionText('');
                          }
                        }}
                        autoFocus
                        placeholder="Option text"
                        className="flex-1 rounded-md border border-[rgba(20,18,31,0.08)] bg-sunken px-3 py-1.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent"
                      />
                      <button
                        onClick={() => addOption(q._id)}
                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingOptionFor(null);
                          setNewOptionText('');
                        }}
                        className="text-sm text-ink-tertiary hover:text-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingOptionFor(q._id)}
                      className="text-xs text-accent transition-colors hover:text-accent-hover"
                    >
                      + Add option
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Question Panel */}
      {showAddQuestion && (
        <div className="card mt-4 border-2 border-dashed border-accent/30 p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">New Question</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newQuestion.text}
              onChange={(e) => setNewQuestion((q) => ({ ...q, text: e.target.value }))}
              placeholder="Question text"
              autoFocus
              className="block w-full rounded-md border border-[rgba(20,18,31,0.08)] bg-sunken px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <div className="flex items-center gap-4">
              <select
                value={newQuestion.type}
                onChange={(e) => setNewQuestion((q) => ({ ...q, type: e.target.value as QuestionData['type'] }))}
                className="rounded-md border border-[rgba(20,18,31,0.08)] bg-sunken px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent"
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  checked={newQuestion.enforced}
                  onChange={(e) => setNewQuestion((q) => ({ ...q, enforced: e.target.checked }))}
                  className="rounded border-ink-tertiary text-accent focus:ring-accent"
                />
                Required
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addQuestion}
                disabled={!newQuestion.text || addingQuestion}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
              >
                {addingQuestion ? 'Adding...' : 'Add Question'}
              </button>
              <button
                onClick={() => setShowAddQuestion(false)}
                className="rounded-md px-4 py-2 text-sm text-ink-secondary hover:bg-sunken"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
