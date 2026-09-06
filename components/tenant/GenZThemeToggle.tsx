"use client";

import { useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";

export function GenZThemeToggle({ locale, storageKey }: { locale: "ar" | "en"; storageKey: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const site = ref.current?.closest<HTMLElement>(".gen-z-site");
      if (site && (saved === "light" || saved === "dark")) site.dataset.theme = saved;
    } catch { /* Storage may be disabled; the toggle still works. */ }
  }, [storageKey]);
  return <button ref={ref} type="button" className="gz-theme-toggle" aria-label={locale === "ar" ? "تبديل المظهر الفاتح والداكن" : "Toggle light and dark appearance"} onClick={() => {
    const site = ref.current?.closest<HTMLElement>(".gen-z-site");
    if (!site) return;
    const next = getComputedStyle(site).colorScheme === "dark" ? "light" : "dark";
    site.dataset.theme = next;
    try { localStorage.setItem(storageKey, next); } catch { /* Optional persistence. */ }
  }}><Moon className="gz-moon" size={20} aria-hidden /><Sun className="gz-sun" size={20} aria-hidden /></button>;
}
