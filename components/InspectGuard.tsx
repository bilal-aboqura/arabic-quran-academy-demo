"use client";

import { useEffect, useState } from "react";

/**
 * يمنع النقر بالزر الأيمن واختصارات فتح أدوات المطور،
 * ويعرض تحذيراً عند اكتشاف فتح DevTools/Inspect.
 */
export function InspectGuard() {
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  useEffect(() => {
    // على شاشات الموبايل لا نفعّل أي كشف/منع متعلق بـ DevTools/Inspect
    // لأن مؤشرات مثل outer/inner width/height تكون غير موثوقة وقد تُطلق إنذارات خاطئة.
    const isMobileScreen =
      window.matchMedia?.("(max-width: 768px)")?.matches ||
      window.matchMedia?.("(pointer: coarse)")?.matches ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
    if (isMobileScreen) return;

    // منع قائمة السياق (كليك يمين)
    const preventContext = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", preventContext);

    // منع اختصارات لوحة المفاتيح لفتح Inspect
    const preventShortcuts = (e: KeyboardEvent) => {
      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      if (
        key === "F12" ||
        (ctrl && shift && (key === "I" || key === "J" || key === "C")) ||
        (ctrl && key === "U") ||
        (ctrl && key === "S") // حفظ المصدر أحياناً
      ) {
        e.preventDefault();
        setDevToolsOpen(true);
      }
    };
    document.addEventListener("keydown", preventShortcuts);

    // كشف فتح DevTools (تقريبي): فرق الحجم بين النافذة والمحتوى
    let checkInterval: ReturnType<typeof setInterval> | null = null;
    const threshold = 160;
    function checkDevTools() {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > threshold || heightDiff > threshold) {
        setDevToolsOpen(true);
      }
    }
    checkInterval = setInterval(checkDevTools, 1000);

    return () => {
      document.removeEventListener("contextmenu", preventContext);
      document.removeEventListener("keydown", preventShortcuts);
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  if (!devToolsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 p-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md rounded-2xl border-2 border-red-500/50 bg-[var(--color-surface)] p-8 text-center shadow-2xl">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <h2 className="mb-2 text-xl font-bold text-red-500">
          تحذير: أدوات المطور (Inspect)
        </h2>
        <p className="mb-6 text-[var(--color-foreground)] text-sm leading-relaxed">
          يبدو أنك فتحت أدوات المطور (Developer Tools / Inspect). يُمنع استخدامها على هذه المنصة. يُرجى إغلاق نافذة الأدوات للمتابعة.
        </p>
        <button
          type="button"
          onClick={() => setDevToolsOpen(false)}
          className="rounded-xl bg-[var(--color-primary)] px-6 py-2.5 font-bold text-sm text-white hover:bg-[var(--color-primary-hover)] transition-colors shadow-xs"
        >
          فهمت، إغلاق التحذير
        </button>
      </div>
    </div>
  );
}
