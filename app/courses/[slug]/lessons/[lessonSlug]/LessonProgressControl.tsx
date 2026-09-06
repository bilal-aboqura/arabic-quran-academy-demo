"use client";

import { useState } from "react";

/** A compact, accessible completion control backed by the server progress service. */
export function LessonProgressControl({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const [state, setState] = useState<"idle" | "saving" | "complete" | "error">("idle");

  async function completeLesson() {
    setState("saving");
    try {
      const response = await fetch("/api/learning/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lessonId, positionSeconds: 0, completed: true }),
      });
      setState(response.ok ? "complete" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "complete") {
    return <p className="mt-5 text-sm font-medium text-[var(--color-success)]" role="status">✓ Lesson marked complete</p>;
  }
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button type="button" onClick={completeLesson} disabled={state === "saving"} className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60">
        {state === "saving" ? "Saving progress…" : "Mark lesson complete"}
      </button>
      {state === "error" ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">We could not save progress. Please try again.</p> : null}
    </div>
  );
}
