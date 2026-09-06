"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; nameAr: string | null; slug: string; description: string | null; imageUrl: string | null; order: number };
type Draft = { name: string; nameAr: string; slug: string; description: string; imageUrl: string; order: number };
const emptyDraft: Draft = { name: "", nameAr: "", slug: "", description: "", imageUrl: "", order: 0 };
const input = "mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export function CategoriesManager({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(current => ({ ...current, [key]: value }));
  const startEdit = (category: Category) => { setEditing(category.id); setDraft({ name: category.name, nameAr: category.nameAr || "", slug: category.slug, description: category.description || "", imageUrl: category.imageUrl || "", order: category.order }); setMessage(""); };
  const reset = () => { setEditing(null); setDraft(emptyDraft); setMessage(""); };
  async function uploadImage(file: File) {
    setBusy(true); setMessage("");
    try { const data = new FormData(); data.set("file", file); data.set("purpose", "category"); const response = await fetch("/api/upload/image", { method: "POST", body: data }); const result = await response.json(); if (!response.ok || !result.url) throw new Error(result.error || "تعذر رفع الصورة."); change("imageUrl", result.url); }
    catch (error) { setMessage(error instanceof Error ? error.message : "تعذر رفع الصورة."); }
    finally { setBusy(false); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const displayName = draft.nameAr.trim() || draft.name.trim();
    if (!displayName) { setMessage("اكتب اسم القسم."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(editing ? `/api/categories/${editing}` : "/api/categories", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, name: draft.name.trim() || displayName, nameAr: displayName, slug: slugify(draft.slug) || `category-${Date.now()}`, description: draft.description.trim(), order: editing ? Number(draft.order) || 0 : categories.length }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر حفظ القسم.");
      setCategories(current => editing ? current.map(item => item.id === editing ? result : item) : [...current, result].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)));
      reset(); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر حفظ القسم."); }
    finally { setBusy(false); }
  }
  async function remove(category: Category) {
    if (!window.confirm(`حذف قسم «${category.nameAr || category.name}»؟ ستبقى دوراته دون قسم.`)) return;
    setBusy(true); setMessage("");
    try { const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "تعذر حذف القسم."); setCategories(current => current.filter(item => item.id !== category.id)); if (editing === category.id) reset(); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "تعذر حذف القسم."); }
    finally { setBusy(false); }
  }
  return <div dir="rtl" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
    <section><div className="mb-5"><h2 className="text-2xl font-bold">الأقسام والمواد</h2><p className="mt-1 text-sm text-[var(--color-muted)]">تظهر الأقسام في موقعك وتساعد الطلاب على تصفح الدورات بسهولة.</p></div><div className="space-y-3">{categories.length ? categories.map(category => <article key={category.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">{category.imageUrl ? <img src={category.imageUrl} alt="" className="h-16 w-20 rounded-xl object-cover" /> : <div className="flex h-16 w-20 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-2xl">📚</div>}<div className="min-w-0 flex-1"><h3 className="font-bold">{category.nameAr || category.name}</h3>{category.nameAr && <p className="mt-1 text-sm text-[var(--color-muted)]" dir="ltr">{category.name}</p>}<p className="mt-2 text-xs text-[var(--color-muted)]">/{category.slug}{category.description ? ` · ${category.description}` : ""}</p></div><div className="flex gap-2"><button type="button" className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" onClick={() => startEdit(category)} disabled={busy}>تعديل</button><button type="button" className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600" onClick={() => void remove(category)} disabled={busy}>حذف</button></div></article>) : <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-muted)]">أضف أول قسم لتنظيم دوراتك.</div>}</div></section>
    <aside className="h-fit rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-xl">＋</div><h2 className="mt-3 font-bold">{editing ? "تعديل القسم" : "قسم جديد"}</h2><p className="mt-1 text-sm text-[var(--color-muted)]">اكتب الاسم فقط وسنرتب الباقي تلقائيًا.</p><form className="mt-5 space-y-4" onSubmit={save}><label className="block text-sm font-semibold">اسم القسم<input required autoFocus className={input} value={draft.nameAr} onChange={event => change("nameAr", event.target.value)} placeholder="مثال: الرياضيات" /></label><label className="block text-sm font-semibold">صورة القسم أو المرحلة <span className="font-normal text-[var(--color-muted)]">(اختياري)</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} className={input} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} />{draft.imageUrl && <span className="mt-2 flex items-center gap-3"><img src={draft.imageUrl} alt="معاينة صورة القسم" className="h-16 w-20 rounded-lg object-cover" /><button type="button" className="text-sm text-red-600" onClick={() => change("imageUrl", "")}>حذف الصورة</button></span>}</label><label className="block text-sm font-semibold">وصف مختصر <span className="font-normal text-[var(--color-muted)]">(اختياري)</span><textarea rows={2} className={input} value={draft.description} onChange={event => change("description", event.target.value)} placeholder="محتوى ودورات الرياضيات" /></label><details className="rounded-lg bg-[var(--color-background)] p-3"><summary className="cursor-pointer text-sm font-semibold text-[var(--color-muted)]">إعدادات متقدمة</summary><div className="mt-3 space-y-3"><label className="block text-sm">الاسم بالإنجليزية <span className="text-[var(--color-muted)]">(اختياري)</span><input dir="ltr" className={input} value={draft.name} onChange={event => change("name", event.target.value)} placeholder="Mathematics" /></label><label className="block text-sm">رابط القسم <span className="text-[var(--color-muted)]">(يُنشأ تلقائيًا)</span><input dir="ltr" className={input} value={draft.slug} onChange={event => change("slug", slugify(event.target.value))} placeholder="mathematics" /></label><label className="block text-sm">ترتيب الظهور<input type="number" className={input} value={draft.order} onChange={event => change("order", Number(event.target.value))} /></label></div></details><div className="flex gap-2"><button disabled={busy} className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "جارٍ الحفظ…" : editing ? "حفظ التعديلات" : "إضافة القسم"}</button>{editing && <button type="button" onClick={reset} className="rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm">إلغاء</button>}</div>{message && <p role="status" className="text-sm text-red-600">{message}</p>}</form></aside>
  </div>;
}
