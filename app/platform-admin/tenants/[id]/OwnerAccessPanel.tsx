"use client";

import { useState } from "react";

export function OwnerAccessPanel({ tenantId, owner }: { tenantId: string; owner: { name: string | null; email: string } | null }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    if (password.length < 8) { setMessage("اكتب كلمة مرور من 8 أحرف على الأقل."); return; }
    if (password !== confirmation) { setMessage("تأكيد كلمة المرور غير مطابق."); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/platform/tenants/${tenantId}/owner-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تعيين كلمة المرور.");
      setPassword(""); setConfirmation(""); setMessage("تم تعيين كلمة المرور. أرسل البريد وكلمة المرور للمدرس عبر قناة آمنة.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر تعيين كلمة المرور."); }
    finally { setBusy(false); }
  }
  const input = "mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none";
  const PasswordField = ({ label, value, onChange, shown, onToggle }: { label: string; value: string; onChange: (value: string) => void; shown: boolean; onToggle: () => void }) => <label className="text-sm font-semibold">{label}<span className="relative mt-1 block"><input required minLength={8} type={shown ? "text" : "password"} autoComplete="new-password" value={value} onChange={event => onChange(event.target.value)} className={`${input} mt-0 pe-11`} /><button type="button" onClick={onToggle} className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-lg text-[var(--color-muted)] hover:text-[var(--color-primary)]" aria-label={shown ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} aria-pressed={shown}>{shown ? "◉" : "◉̸"}</button></span></label>;
  return <section dir="rtl" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h2 className="text-lg font-bold">دخول مالك الأكاديمية</h2>{owner ? <><p className="mt-1 text-sm text-[var(--color-muted)]">عيّن كلمة مرور أولية لـ <strong>{owner.name || "المالك"}</strong> — <bdi>{owner.email}</bdi>.</p><form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2"><PasswordField label="كلمة المرور الجديدة" value={password} onChange={setPassword} shown={showPassword} onToggle={() => setShowPassword(current => !current)} /><PasswordField label="تأكيد كلمة المرور" value={confirmation} onChange={setConfirmation} shown={showConfirmation} onToggle={() => setShowConfirmation(current => !current)} /><div className="sm:col-span-2 flex flex-wrap items-center gap-3"><button disabled={busy} className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "جارٍ الحفظ…" : "تعيين كلمة المرور"}</button>{message && <p role="status" className="text-sm text-[var(--color-muted)]">{message}</p>}</div></form></> : <p className="mt-2 text-sm text-rose-600">لا يوجد مالك نشط لهذه الأكاديمية.</p>}</section>;
}
