"use client";

import Link from "next/link";
import { Children, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Menu, Search, X } from "lucide-react";

export function TemplateMobileMenu({ locale, teachers = false }: { locale: "ar" | "en"; teachers?: boolean }) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ar = locale === "ar";
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <div className="template-mobile" ref={ref} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button type="button" aria-label={ar ? "القائمة الرئيسية" : "Main menu"} aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>{open ? <X aria-hidden /> : <Menu aria-hidden />}</button>
    {open && <nav id={menuId} aria-label={ar ? "قائمة الهاتف" : "Mobile navigation"} onClick={() => setOpen(false)}>
      <Link href="/courses">{ar ? "شوف الكورسات" : "Explore courses"}</Link>
      {teachers && <Link href="/teachers">{ar ? "اتعرف على المدرسين" : "Meet the teachers"}</Link>}
      <Link href="/login">{ar ? "تسجيل الدخول" : "Student sign in"}</Link>
      <Link href="/register">{ar ? "إنشاء حساب" : "Create an account"}</Link>
    </nav>}
  </div>;
}

const normalize = (text: string) => text.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "").replace(/[أإآ]/g, "ا").trim();

export function TemplateCourseCatalog({ courses, children, locale, className = "template-grid" }: {
  courses: Array<{ id: string; title: string; category: string }>;
  children: ReactNode;
  locale: "ar" | "en";
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const ar = locale === "ar";
  const categories = [...new Set(courses.map(course => course.category).filter(Boolean))];
  const cards = Children.toArray(children);
  const matches = courses.map((course, index) => ({ course, card: cards[index] })).filter(({ course }) =>
    (!category || course.category === category) && normalize(`${course.title} ${course.category}`).includes(normalize(query))
  );
  return <div className="template-catalog">
    {courses.length > 1 && <div className="template-catalog__tools">
      <label className="template-search"><Search size={19} aria-hidden /><span className="template-sr-only">{ar ? "دور على كورس أو مادة" : "Search courses or subjects"}</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={ar ? "بتدور على كورس إيه؟" : "What would you like to learn?"} /></label>
      <div className="template-filters" role="group" aria-label={ar ? "تصفية حسب المادة" : "Filter by subject"}>
        <button type="button" aria-pressed={!category} onClick={() => setCategory("")}>{ar ? "كل الكورسات" : "All courses"}</button>
        {categories.length > 1 && categories.map(item => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
    </div>}
    <p className="template-catalog__count" role="status">{ar ? `${matches.length.toLocaleString("ar-EG")} كورس متاح` : `${matches.length} ${matches.length === 1 ? "course" : "courses"} to explore`}</p>
    {matches.length ? <div className={className}>{matches.map(({ card }) => card)}</div> : <div className="template-empty"><Search size={28} aria-hidden /><h3>{ar ? (courses.length ? "مفيش كورس بالبحث ده" : "الكورسات هتظهر هنا قريب") : (courses.length ? "No matching courses" : "Courses are coming soon")}</h3><p>{ar ? (courses.length ? "جرب كلمة تانية، أو شوف كل الكورسات." : "ارجع تاني عشان تشوف الكورسات أول ما تتنشر.") : (courses.length ? "Try another subject or explore all available courses." : "Check back for newly published courses.")}</p>{(query || category) && <button type="button" className="template-button" onClick={() => { setQuery(""); setCategory(""); }}>{ar ? "شوف كل الكورسات" : "Show all courses"}</button>}</div>}
  </div>;
}
