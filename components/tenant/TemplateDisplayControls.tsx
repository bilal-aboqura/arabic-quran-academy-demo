"use client";

import { useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/constants";

export function TemplateDisplayControls({ locale, tenant }: { locale: "ar" | "en"; tenant: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const storageKey = `teacher-site-theme:${tenant}`;
  useEffect(() => {
    const site = ref.current?.closest<HTMLElement>(".template-site");
    try {
      const saved = localStorage.getItem(storageKey);
      if (site && (saved === "light" || saved === "dark")) site.dataset.theme = saved;
    } catch { /* The controls also work without storage. */ }
  }, [storageKey]);
  const ar = locale === "ar";
  return <div className="template-display-controls" ref={ref}>
    <button type="button" lang={ar ? "en" : "ar"} aria-label={ar ? "Switch to English" : "التغيير للعربية"} title={ar ? "Switch to English" : "التغيير للعربية"} onClick={() => {
      document.cookie = `${LOCALE_COOKIE_NAME}=${ar ? "en" : "ar"}; path=/; max-age=31536000; samesite=lax`;
      window.location.reload();
    }}>{ar ? "EN" : "عربي"}</button>
    <button type="button" aria-label={ar ? "تبديل المظهر الفاتح والداكن" : "Toggle light and dark appearance"} title={ar ? "تبديل المظهر الفاتح والداكن" : "Toggle light and dark appearance"} onClick={() => {
      const site = ref.current?.closest<HTMLElement>(".template-site");
      if (!site) return;
      const next = getComputedStyle(site).colorScheme === "dark" ? "light" : "dark";
      site.dataset.theme = next;
      try { localStorage.setItem(storageKey, next); } catch { /* Optional persistence. */ }
    }}><Moon size={19} className="template-mode-moon" aria-hidden /><Sun size={19} className="template-mode-sun" aria-hidden /></button>
  </div>;
}
