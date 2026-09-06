"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SectionType = "HERO" | "COURSES" | "CATEGORIES" | "ABOUT" | "STATS" | "TEACHERS" | "TESTIMONIALS" | "FAQ" | "CONTACT" | "CTA" | "FEATURES" | "RESULTS" | "VIDEO" | "SOCIAL_PROOF";
type Section = { id: string; type: SectionType; variant: string; enabled: boolean; config: Record<string, unknown>; sortOrder: number; createdAt: string; updatedAt: string };
type Page = { id: string; title: string; slug: string; isHome: boolean; isPublished: boolean; createdAt: string; updatedAt: string; sections: Section[] };

const variants: Record<SectionType, readonly string[]> = {
  HERO: ["split", "centered", "image-right"], COURSES: ["grid", "featured"], ABOUT: ["default", "image-left"],
  STATS: ["cards", "inline"], TEACHERS: ["grid", "featured"], TESTIMONIALS: ["cards", "carousel"],
  FAQ: ["accordion", "columns"], CONTACT: ["form", "compact"], CTA: ["banner", "card"],
  CATEGORIES: ["rail", "pills", "blocks"], FEATURES: ["personal", "academy", "packages", "process", "benefits"], RESULTS: ["stories", "metrics", "proof", "bold"], VIDEO: ["curriculum"], SOCIAL_PROOF: ["authority", "deliverables"],
};

const inputClass = "w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20";
const primaryClass = "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryClass = "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-primary)]/10 disabled:cursor-not-allowed disabled:opacity-50";

function defaultConfig(type: SectionType): Record<string, unknown> {
  const labels: Record<SectionType, [string, string]> = {
    HERO: ["Build learning that feels personal", "A focused online learning experience for every student."], COURSES: ["Featured courses", "Start with the learning path that fits your goals."],
    ABOUT: ["About our academy", "Share the promise, approach, and people behind your academy."], STATS: ["Learning in motion", "Use clear, verified numbers that matter to your students."],
    TEACHERS: ["Meet the teachers", "Introduce the educators guiding every lesson."], TESTIMONIALS: ["Student stories", "Share feedback from your learning community."],
    FAQ: ["Questions, answered", "Help families and students get started with confidence."], CONTACT: ["Let’s talk", "Give prospective students a clear way to reach you."],
    CTA: ["Ready to begin?", "Explore a course and take the next step today."],
    CATEGORIES: ["Subjects", "Browse learning by subject."], FEATURES: ["Learning advantages", "Explain the academy's real learning experience."],
    RESULTS: ["Results", "Add verified outcomes only."], VIDEO: ["Course preview", "Introduce a public course preview."], SOCIAL_PROOF: ["Trusted by learners", "Show real, verifiable learning activity."],
  };
  const [title, body] = labels[type];
  const items = type === "FAQ" ? [{ title: "How do I join a course?", body: "Choose a published course and follow the enrollment steps." }] : type === "STATS" ? [{ title: "100+", body: "Learning lessons" }, { title: "24/7", body: "Access to your learning" }] : type === "TEACHERS" || type === "TESTIMONIALS" ? [{ title: "Name or role", body: "A short, specific introduction or quote." }] : [];
  return { title, body, buttonLabel: "Explore courses", buttonHref: "/courses", ...(items.length ? { items } : {}) };
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.");
  return body;
}

function previewHref(page: Page) { return page.isHome ? "/" : `/site/${page.slug}`; }

export function WebsiteBuilder({ initialPages }: { initialPages: Page[] }) {
  const [pages, setPages] = useState(initialPages);
  const [selectedId, setSelectedId] = useState(initialPages[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const selected = useMemo(() => pages.find((page) => page.id === selectedId) ?? null, [pages, selectedId]);

  async function reload(preferredId = selectedId) {
    const body = await request("/api/dashboard/site/pages") as { pages: Page[] };
    setPages(body.pages);
    setSelectedId(body.pages.some((page) => page.id === preferredId) ? preferredId : body.pages[0]?.id ?? "");
  }
  async function execute(action: () => Promise<void>, success: string) {
    setBusy(true); setNotice(null);
    try { await action(); setNotice(success); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save changes."); } finally { setBusy(false); }
  }
  async function createPage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await execute(async () => { const body = await request("/api/dashboard/site/pages", { method: "POST", body: JSON.stringify({ title: form.get("title"), slug: form.get("slug"), isPublished: form.get("isPublished") === "on" }) }) as { page: Page }; await reload(body.page.id); event.currentTarget.reset(); }, "Page created.");
  }
  async function addSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; const form = new FormData(event.currentTarget); const type = form.get("type") as SectionType;
    await execute(async () => { await request("/api/dashboard/site/pages", { method: "POST", body: JSON.stringify({ kind: "section", pageId: selected.id, type, variant: variants[type][0], config: defaultConfig(type) }) }); await reload(); }, "Section added.");
  }
  async function patchPage(values: Record<string, unknown>, success: string) {
    if (!selected) return; await execute(async () => { await request("/api/dashboard/site/pages", { method: "PATCH", body: JSON.stringify({ kind: "page", pageId: selected.id, ...values }) }); await reload(); }, success);
  }
  async function patchSection(section: Section, values: Record<string, unknown>, success: string) {
    await execute(async () => { await request("/api/dashboard/site/pages", { method: "PATCH", body: JSON.stringify({ kind: "section", sectionId: section.id, ...values }) }); await reload(); }, success);
  }
  async function reorder(section: Section, direction: -1 | 1) {
    if (!selected) return; const index = selected.sections.findIndex((row) => row.id === section.id); const next = index + direction;
    if (index < 0 || next < 0 || next >= selected.sections.length) return;
    const ids = selected.sections.map((row) => row.id); [ids[index], ids[next]] = [ids[next], ids[index]];
    await execute(async () => { await request("/api/dashboard/site/pages", { method: "PATCH", body: JSON.stringify({ kind: "reorder", pageId: selected.id, sectionIds: ids }) }); await reload(); }, "Section order saved.");
  }
  async function remove(kind: "page" | "section", id: string) {
    const label = kind === "page" ? "page and all of its sections" : "section";
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return;
    await execute(async () => { await request("/api/dashboard/site/pages", { method: "DELETE", body: JSON.stringify(kind === "page" ? { kind, pageId: id } : { kind, sectionId: id }) }); await reload(kind === "page" ? "" : selectedId); }, `${kind === "page" ? "Page" : "Section"} deleted.`);
  }

  return <div className="space-y-6">
    <header className="max-w-3xl"><h2 className="text-2xl font-bold tracking-[-0.02em] text-[var(--color-foreground)]">Website builder</h2><p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Build a polished public site from safe, reusable sections. Text and structured settings are stored as data; custom HTML and scripts are never published.</p></header>
    {notice ? <p role="status" className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-foreground)]">{notice}</p> : null}
    <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]"><h3 className="font-semibold">Create a page</h3><form onSubmit={(event) => void createPage(event)} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]"><input required name="title" maxLength={160} placeholder="Page title" className={inputClass} /><input required name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Lowercase words separated with hyphens" placeholder="about-us" className={inputClass} /><label className="flex min-h-10 items-center gap-2 text-sm"><input name="isPublished" type="checkbox" /> Publish</label><button disabled={busy} className={primaryClass}>Create page</button></form></section>
    {pages.length ? <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"><aside className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"><p className="px-2 pb-2 text-xs font-semibold text-[var(--color-muted)]">PAGES</p><div className="space-y-1">{pages.map((page) => <button key={page.id} type="button" onClick={() => setSelectedId(page.id)} className={`w-full rounded-[var(--radius-btn)] px-3 py-2 text-left text-sm transition ${page.id === selectedId ? "bg-[var(--color-primary)]/12 font-semibold text-[var(--color-primary)]" : "hover:bg-[var(--color-primary)]/8"}`}><span className="block truncate">{page.title}</span><span className="mt-0.5 block text-xs font-normal text-[var(--color-muted)]">/{page.slug}{page.isHome ? " · Home" : ""}{page.isPublished ? " · Live" : " · Draft"}</span></button>)}</div></aside>
      {selected ? <div className="space-y-5"><section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">{selected.title}</h3><p className="mt-1 text-sm text-[var(--color-muted)]">/{selected.slug}</p></div><div className="flex flex-wrap gap-2"><Link href={previewHref(selected)} target="_blank" className={secondaryClass}>Preview</Link><button type="button" onClick={() => void patchPage({ isPublished: !selected.isPublished }, selected.isPublished ? "Page unpublished." : "Page published.")} disabled={busy} className={secondaryClass}>{selected.isPublished ? "Unpublish" : "Publish"}</button><button type="button" onClick={() => void remove("page", selected.id)} disabled={busy} className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-btn)] px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-500/10 disabled:opacity-50">Delete</button></div></div><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void patchPage({ title: form.get("title"), slug: form.get("slug"), isHome: form.get("isHome") === "on" }, "Page settings saved."); }} className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Title<input name="title" required defaultValue={selected.title} className={`${inputClass} mt-1`} /></label><label className="text-sm font-medium">Slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={selected.slug} className={`${inputClass} mt-1`} /></label><label className="flex items-center gap-2 text-sm"><input name="isHome" type="checkbox" defaultChecked={selected.isHome} /> Use as homepage</label><div><button disabled={busy} className={primaryClass}>Save page settings</button></div></form></section>
        <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]"><form onSubmit={(event) => void addSection(event)} className="flex flex-wrap items-end gap-3"><label className="min-w-48 flex-1 text-sm font-medium">Add a section<select name="type" className={`${inputClass} mt-1`}>{(Object.keys(variants) as SectionType[]).map((type) => <option key={type} value={type}>{type[0] + type.slice(1).toLowerCase()}</option>)}</select></label><button disabled={busy} className={primaryClass}>Add section</button></form></section>
        <section className="space-y-4">{selected.sections.length ? selected.sections.map((section, index) => <SectionEditor key={section.id} section={section} first={index === 0} last={index === selected.sections.length - 1} busy={busy} onSave={(values, message) => void patchSection(section, values, message)} onMove={(direction) => void reorder(section, direction)} onDelete={() => void remove("section", section.id)} />) : <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center"><p className="font-medium">Start with a section</p><p className="mt-1 text-sm text-[var(--color-muted)]">Choose Hero, Courses, About, or another controlled content block above.</p></div>}</section>
      </div> : null}</div> : <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center"><p className="font-medium">Create your first page</p><p className="mt-1 text-sm text-[var(--color-muted)]">A homepage and a short About page are a good starting point.</p></div>}
  </div>;
}

function SectionEditor({ section, first, last, busy, onSave, onMove, onDelete }: { section: Section; first: boolean; last: boolean; busy: boolean; onSave: (values: Record<string, unknown>, message: string) => void; onMove: (direction: -1 | 1) => void; onDelete: () => void }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  return <article className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{section.type[0] + section.type.slice(1).toLowerCase()} section</h3><p className="mt-1 text-xs text-[var(--color-muted)]">{section.enabled ? "Visible on published page" : "Hidden from visitors"}</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={busy || first} onClick={() => onMove(-1)} className={secondaryClass} aria-label="Move section up">↑</button><button type="button" disabled={busy || last} onClick={() => onMove(1)} className={secondaryClass} aria-label="Move section down">↓</button><button type="button" disabled={busy} onClick={() => onSave({ enabled: !section.enabled }, section.enabled ? "Section hidden." : "Section shown.")} className={secondaryClass}>{section.enabled ? "Hide" : "Show"}</button><button type="button" disabled={busy} onClick={onDelete} className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-btn)] px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-500/10 disabled:opacity-50">Delete</button></div></div><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const title = String(form.get("title") || ""); const body = String(form.get("body") || ""); const buttonLabel = String(form.get("buttonLabel") || ""); const buttonHref = String(form.get("buttonHref") || ""); onSave({ variant: String(form.get("variant")), config: { ...section.config, title, body, buttonLabel, buttonHref } }, "Section content saved."); }} className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Variant<select name="variant" defaultValue={section.variant} className={`${inputClass} mt-1`}>{variants[section.type].map((variant) => <option key={variant} value={variant}>{variant}</option>)}</select></label><label className="text-sm font-medium">Heading<input name="title" defaultValue={typeof section.config.title === "string" ? section.config.title : ""} maxLength={240} className={`${inputClass} mt-1`} /></label><label className="text-sm font-medium sm:col-span-2">Description<textarea name="body" defaultValue={typeof section.config.body === "string" ? section.config.body : ""} maxLength={4000} rows={3} className={`${inputClass} mt-1`} /></label><label className="text-sm font-medium">Button label<input name="buttonLabel" defaultValue={typeof section.config.buttonLabel === "string" ? section.config.buttonLabel : ""} maxLength={120} className={`${inputClass} mt-1`} /></label><label className="text-sm font-medium">Button link<input name="buttonHref" defaultValue={typeof section.config.buttonHref === "string" ? section.config.buttonHref : "/courses"} maxLength={500} className={`${inputClass} mt-1`} /></label><div><button disabled={busy} className={primaryClass}>Save section</button></div></form><div className="mt-5 border-t border-[var(--color-border)] pt-4"><button type="button" onClick={() => setAdvancedOpen((open) => !open)} className="text-sm font-medium text-[var(--color-primary)] hover:underline">{advancedOpen ? "Hide structured items" : "Edit structured items (FAQ, stats, people)"}</button>{advancedOpen ? <form onSubmit={(event) => { event.preventDefault(); const raw = String(new FormData(event.currentTarget).get("config") || "{}"); try { const config = JSON.parse(raw) as unknown; if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("Use a JSON object."); onSave({ config }, "Structured section settings saved."); } catch (error) { window.alert(error instanceof Error ? error.message : "Invalid JSON."); } }} className="mt-3"><label className="text-sm font-medium">Structured JSON<textarea name="config" defaultValue={JSON.stringify(section.config, null, 2)} rows={8} spellCheck={false} className={`${inputClass} mt-1 font-mono text-xs`} /></label><button disabled={busy} className={`${secondaryClass} mt-3`}>Save structured settings</button></form> : null}</div></article>;
}
