"use client";

import { useState } from "react";

type Quiz = { id: string; title: string; maxAttempts: number | null; passingScore: number | null; isPublished: boolean; availableFrom: string | null; availableUntil: string | null; _count: { questions: number }; course: { id: string; title: string } };
type History = { attemptId: string; submittedAt: string | null; score: number; totalQuestions: number; percentage: number | null; passed: boolean | null; student: { displayName: string } };
const inputClass = "w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm";

function localDate(value: string | null) { return value ? value.slice(0, 16) : ""; }

export function QuizProductWorkspace({ quizzes: initialQuizzes }: { quizzes: Quiz[] }) {
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [selected, setSelected] = useState<Quiz | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(url: string, init?: RequestInit) {
    const response = await fetch(url, { credentials: "include", ...init });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }
  async function selectQuiz(quiz: Quiz) {
    setBusy(true); setNotice(null);
    try { const data = await request(`/api/quizzes/${quiz.id}/product`) as { history: History[] }; setSelected(quiz); setHistory(data.history); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load quiz results"); }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setNotice(null);
    try {
      const numberOrNull = (name: string) => { const value = String(form.get(name) || "").trim(); return value ? Number(value) : null; };
      const data = await request(`/api/quizzes/${selected.id}/product`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maxAttempts: numberOrNull("maxAttempts"), passingScore: numberOrNull("passingScore"), isPublished: form.get("isPublished") === "on", availableFrom: form.get("availableFrom") || null, availableUntil: form.get("availableUntil") || null }) }) as { settings: Quiz };
      const next = { ...selected, ...data.settings, availableFrom: data.settings.availableFrom ? new Date(data.settings.availableFrom).toISOString() : null, availableUntil: data.settings.availableUntil ? new Date(data.settings.availableUntil).toISOString() : null };
      setSelected(next); setQuizzes((items) => items.map((item) => item.id === next.id ? next : item)); setNotice("Quiz settings saved.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save quiz settings"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6"><header><h2 className="text-xl font-bold text-[var(--color-foreground)]">Quiz management</h2><p className="mt-1 text-sm text-[var(--color-muted)]">Publish quizzes, configure attempt and pass rules, and inspect server-graded results.</p></header>{notice ? <p role="status" className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm">{notice}</p> : null}<section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">{quizzes.length ? <div className="divide-y divide-[var(--color-border)]">{quizzes.map((quiz) => <div key={quiz.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium text-[var(--color-foreground)]">{quiz.title}</p><p className="mt-1 text-xs text-[var(--color-muted)]">{quiz.course.title} · {quiz._count.questions} questions · {quiz.isPublished ? "Published" : "Draft"}</p></div><button type="button" disabled={busy} onClick={() => void selectQuiz(quiz)} className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Settings & results</button></div>)}</div> : <p className="p-8 text-center text-sm text-[var(--color-muted)]">Create a quiz from the course editor to configure it here.</p>}</section>{selected ? <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><form onSubmit={(event) => void save(event)} className="space-y-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]"><h3 className="font-semibold text-[var(--color-foreground)]">{selected.title}</h3><label className="block text-sm">Attempt limit (empty = course default)<input name="maxAttempts" type="number" min="1" max="100" defaultValue={selected.maxAttempts ?? ""} className={`${inputClass} mt-1`} /></label><label className="block text-sm">Passing score % (empty = no pass threshold)<input name="passingScore" type="number" min="0" max="100" defaultValue={selected.passingScore ?? ""} className={`${inputClass} mt-1`} /></label><label className="block text-sm">Available from<input name="availableFrom" type="datetime-local" defaultValue={localDate(selected.availableFrom)} className={`${inputClass} mt-1`} /></label><label className="block text-sm">Available until<input name="availableUntil" type="datetime-local" defaultValue={localDate(selected.availableUntil)} className={`${inputClass} mt-1`} /></label><label className="flex items-center gap-2 text-sm"><input name="isPublished" type="checkbox" defaultChecked={selected.isPublished} />Published</label><button disabled={busy} className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save settings</button></form><div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]"><h3 className="font-semibold text-[var(--color-foreground)]">Submitted attempts</h3>{history.length ? <ul className="mt-4 space-y-3">{history.map((attempt) => <li key={attempt.attemptId} className="rounded-[var(--radius-btn)] bg-[var(--color-background)] p-3 text-sm"><p className="font-medium text-[var(--color-foreground)]">{attempt.student.displayName}</p><p className="mt-1 text-[var(--color-muted)]">{attempt.score}/{attempt.totalQuestions} · {attempt.percentage ?? 0}%{attempt.passed === null ? "" : attempt.passed ? " · Passed" : " · Not passed"}</p></li>)}</ul> : <p className="mt-4 text-sm text-[var(--color-muted)]">No submitted attempts yet.</p>}</div></section> : null}</div>;
}
