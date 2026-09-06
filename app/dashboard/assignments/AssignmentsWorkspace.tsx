"use client";

import { useEffect, useState } from "react";

type Course = { id: string; title: string };
type FileRef = { storageKey: string; fileName: string | null };
type StudentAssignment = {
  id: string; title: string; description: string; deadline: string | null; maxGrade: number;
  course: { id: string; slug: string; title: string; titleAr: string | null };
  module: { id: string; title: string; sortOrder: number } | null;
  status: string;
  submission: { id: string; textContent: string | null; files: FileRef[]; submittedAt: string | null; grade: number | null; feedback: string | null } | null;
};
type StaffSubmission = {
  id: string; status: string; textContent: string | null; files: FileRef[]; submittedAt: string | null;
  grade: number | null; feedback: string | null;
  studentMembership: { displayName: string | null; user: { name: string; email: string } };
};
type StaffAssignment = { id: string; title: string; description: string; deadline: string | null; maxGrade: number; isPublished: boolean; _count: { submissions: number } };

const inputClass = "w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)]";
const primaryClass = "rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50";

function dateText(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "No deadline";
}

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "include", ...init });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}

export function AssignmentsWorkspace({ mode, assignments: initialAssignments, courses }: { mode: "student" | "staff"; assignments: StudentAssignment[]; courses: Course[] }) {
  const [studentAssignments, setStudentAssignments] = useState(initialAssignments);
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<StaffAssignment | null>(null);
  const [submissions, setSubmissions] = useState<StaffSubmission[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadManagedAssignments(id = courseId) {
    if (!id) return;
    setBusy(true); setNotice(null);
    try {
      const body = await jsonRequest(`/api/assignments?courseId=${encodeURIComponent(id)}`) as { assignments: StaffAssignment[] };
      setStaffAssignments(body.assignments);
      setSelectedAssignment(null); setSubmissions([]);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load assignments"); }
    finally { setBusy(false); }
  }

  useEffect(() => { if (mode === "staff" && courseId) void loadManagedAssignments(courseId); }, [mode, courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitStudentAssignment(event: React.FormEvent<HTMLFormElement>, assignment: StudentAssignment) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fileList = form.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
    setBusy(true); setNotice(null);
    try {
      const files: FileRef[] = [];
      for (const file of fileList) {
        const upload = new FormData(); upload.set("file", file);
        const uploaded = await jsonRequest(`/api/upload/assignments/${assignment.id}`, { method: "POST", body: upload }) as { key: string; fileName: string };
        files.push({ storageKey: uploaded.key, fileName: uploaded.fileName });
      }
      await jsonRequest(`/api/assignments/${assignment.id}/submissions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textContent: String(form.get("textContent") || ""), files }),
      });
      const refreshed = await jsonRequest("/api/assignments") as { assignments: StudentAssignment[] };
      setStudentAssignments(refreshed.assignments);
      setNotice("Assignment submitted.");
      event.currentTarget.reset();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to submit assignment"); }
    finally { setBusy(false); }
  }

  async function createAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setNotice(null);
    try {
      await jsonRequest("/api/assignments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId, title: form.get("title"), description: form.get("description"),
          deadline: form.get("deadline") || null, maxGrade: Number(form.get("maxGrade") || 100), isPublished: form.get("isPublished") === "on",
        }),
      });
      event.currentTarget.reset();
      await loadManagedAssignments();
      setNotice("Assignment created.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to create assignment"); }
    finally { setBusy(false); }
  }

  async function viewSubmissions(assignment: StaffAssignment) {
    setBusy(true); setNotice(null);
    try {
      const body = await jsonRequest(`/api/assignments/${assignment.id}/submissions`) as { submissions: StaffSubmission[] };
      setSelectedAssignment(assignment); setSubmissions(body.submissions);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to load submissions"); }
    finally { setBusy(false); }
  }

  async function setPublished(assignment: StaffAssignment, isPublished: boolean) {
    setBusy(true); setNotice(null);
    try {
      await jsonRequest(`/api/assignments/${assignment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, isPublished }) });
      await loadManagedAssignments();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to update assignment"); }
    finally { setBusy(false); }
  }

  async function grade(event: React.FormEvent<HTMLFormElement>, submission: StaffSubmission) {
    event.preventDefault();
    if (!selectedAssignment) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setNotice(null);
    try {
      await jsonRequest(`/api/assignments/${selectedAssignment.id}/submissions/${submission.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: Number(form.get("grade")), feedback: form.get("feedback") }),
      });
      await viewSubmissions(selectedAssignment);
      setNotice("Grade saved.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save grade"); }
    finally { setBusy(false); }
  }

  const heading = mode === "student" ? "Assignments" : "Assignment workspace";
  const description = mode === "student" ? "Submit work, attach supporting files, and review feedback." : "Create published work and review submissions for your courses.";
  return <div className="space-y-6">
    <header><h2 className="text-xl font-bold text-[var(--color-foreground)]">{heading}</h2><p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p></header>
    {notice ? <p role="status" className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-foreground)]">{notice}</p> : null}
    {mode === "student" ? <section className="grid gap-4 lg:grid-cols-2">{studentAssignments.length ? studentAssignments.map((assignment) => <article key={assignment.id} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-[var(--color-foreground)]">{assignment.title}</h3><p className="mt-1 text-sm text-[var(--color-muted)]">{assignment.course.titleAr || assignment.course.title}{assignment.module ? ` · ${assignment.module.title}` : ""}</p></div><span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-1 text-xs font-medium text-[var(--color-primary)]">{assignment.status.replaceAll("_", " ")}</span></div>
      <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--color-muted)]">{assignment.description}</p><p className="mt-3 text-xs text-[var(--color-muted)]">{dateText(assignment.deadline)} · Maximum grade: {assignment.maxGrade}</p>
      {assignment.submission?.grade !== null && assignment.submission?.grade !== undefined ? <div className="mt-3 rounded-[var(--radius-btn)] bg-[var(--color-primary)]/10 p-3 text-sm"><strong>Grade: {assignment.submission.grade}/{assignment.maxGrade}</strong>{assignment.submission.feedback ? <p className="mt-1 text-[var(--color-muted)]">{assignment.submission.feedback}</p> : null}</div> : null}
      {assignment.status !== "REVIEWED" ? <form onSubmit={(event) => void submitStudentAssignment(event, assignment)} className="mt-4 space-y-3"><textarea name="textContent" defaultValue={assignment.submission?.textContent ?? ""} maxLength={50000} rows={4} placeholder="Write your answer or notes" className={inputClass} /><input name="files" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="block w-full text-sm text-[var(--color-muted)]" /><button disabled={busy} className={primaryClass}>{busy ? "Saving…" : assignment.submission ? "Update submission" : "Submit assignment"}</button></form> : null}
    </article>) : <p className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted)]">No published assignments are available in your enrolled courses.</p>}</section> : <>
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]"><label className="block text-sm font-medium text-[var(--color-foreground)]">Course<select value={courseId} onChange={(event) => setCourseId(event.target.value)} className={`${inputClass} mt-2`}><option value="">Select a course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>{courseId ? <form onSubmit={(event) => void createAssignment(event)} className="mt-5 grid gap-3 md:grid-cols-2"><input required name="title" placeholder="Assignment title" className={inputClass} /><input name="deadline" type="datetime-local" className={inputClass} /><textarea name="description" placeholder="Instructions" rows={3} className={`${inputClass} md:col-span-2`} /><div className="flex flex-wrap items-center gap-4"><label className="text-sm">Maximum grade <input name="maxGrade" type="number" min="1" max="10000" defaultValue="100" className="ms-2 w-24 rounded border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1" /></label><label className="text-sm"><input name="isPublished" type="checkbox" className="me-2" />Publish now</label><button disabled={busy} className={primaryClass}>Create assignment</button></div></form> : null}</section>
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"><div className="border-b border-[var(--color-border)] px-5 py-4"><h3 className="font-semibold text-[var(--color-foreground)]">Course assignments</h3></div>{staffAssignments.length ? <div className="divide-y divide-[var(--color-border)]">{staffAssignments.map((assignment) => <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium text-[var(--color-foreground)]">{assignment.title}</p><p className="mt-1 text-xs text-[var(--color-muted)]">{dateText(assignment.deadline)} · {assignment._count.submissions} submissions · /{assignment.maxGrade}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void setPublished(assignment, !assignment.isPublished)} disabled={busy} className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm">{assignment.isPublished ? "Unpublish" : "Publish"}</button><button type="button" onClick={() => void viewSubmissions(assignment)} disabled={busy} className={primaryClass}>Review</button></div></div>)}</div> : <p className="p-8 text-center text-sm text-[var(--color-muted)]">{courseId ? "No assignments yet." : "Choose a course to begin."}</p>}</section>
      {selectedAssignment ? <section className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]"><h3 className="font-semibold text-[var(--color-foreground)]">Review: {selectedAssignment.title}</h3>{submissions.length ? submissions.map((submission) => <article key={submission.id} className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4"><p className="font-medium text-[var(--color-foreground)]">{submission.studentMembership.displayName || submission.studentMembership.user.name}</p><p className="mt-1 text-xs text-[var(--color-muted)]">{submission.status.replaceAll("_", " ")} · {dateText(submission.submittedAt)}</p>{submission.textContent ? <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--color-muted)]">{submission.textContent}</p> : null}{submission.files.length ? <div className="mt-3 flex flex-wrap gap-2">{submission.files.map((file) => <a key={file.storageKey} href={`/api/files/assignments/${selectedAssignment.id}/${submission.id}?key=${encodeURIComponent(file.storageKey)}`} className="text-sm text-[var(--color-primary)] underline">{file.fileName || "Attached file"}</a>)}</div> : null}<form onSubmit={(event) => void grade(event, submission)} className="mt-4 flex flex-wrap items-center gap-2"><input required name="grade" type="number" min="0" max={selectedAssignment.maxGrade} defaultValue={submission.grade ?? ""} placeholder="Grade" className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-sm" /><input name="feedback" defaultValue={submission.feedback ?? ""} maxLength={50000} placeholder="Feedback" className="min-w-48 flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm" /><button disabled={busy} className={primaryClass}>Save grade</button></form></article>) : <p className="text-sm text-[var(--color-muted)]">No student submissions yet.</p>}</section> : null}
    </>}
  </div>;
}
