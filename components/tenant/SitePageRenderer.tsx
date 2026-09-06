import Link from "next/link";

type PublicCourse = { id: string; slug: string; title: string; titleAr: string | null; shortDesc: string | null; shortDescEn: string | null };
type SiteSection = { id: string; type: string; variant: string; config: unknown };
type SitePage = { title: string; sections: SiteSection[] };

function objectConfig(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(config: Record<string, unknown>, key: string, fallback = "") {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 4_000) : fallback;
}

function items(config: Record<string, unknown>) {
  const value = config.items;
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.slice(0, 240) : "";
    const body = typeof row.body === "string" ? row.body.slice(0, 2_000) : "";
    return title || body ? [{ title, body }] : [];
  });
}

function safeHref(value: string) {
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "/courses";
  } catch { return "/courses"; }
}

function Action({ href, label }: { href: string; label: string }) {
  const safe = safeHref(href);
  const className = "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";
  return safe.startsWith("/") ? <Link href={safe} className={className}>{label}</Link> : <a href={safe} target="_blank" rel="noopener noreferrer" className={className}>{label}</a>;
}

function SectionShell({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <section className={muted ? "border-y border-[var(--color-border)] bg-[var(--color-primary)]/[0.035]" : "bg-[var(--color-background)]"}><div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">{children}</div></section>;
}

/** A configuration-driven public surface. It treats all stored content as text
 * and never renders tenant supplied HTML, styles, scripts, or private assets. */
export function SitePageRenderer({ page, courses, locale }: { page: SitePage; courses: PublicCourse[]; locale: "ar" | "en" }) {
  const fallbackCoursesTitle = locale === "ar" ? "الدورات المتاحة" : "Available courses";
  return <main dir={locale === "ar" ? "rtl" : "ltr"} className="text-[var(--color-foreground)]">
    {page.sections.map((section) => {
      const config = objectConfig(section.config);
      const title = text(config, "title", section.type === "COURSES" ? fallbackCoursesTitle : page.title);
      const body = text(config, "body");
      const buttonLabel = text(config, "buttonLabel", locale === "ar" ? "استكشف الآن" : "Explore now");
      const buttonHref = text(config, "buttonHref", "/courses");
      const sectionItems = items(config);

      if (section.type === "HERO") {
        const centered = section.variant === "centered";
        return <section key={section.id} className="border-b border-[var(--color-border)] bg-[var(--color-primary)]/[0.06]"><div className={`mx-auto grid min-h-[430px] max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 ${centered ? "text-center" : "lg:grid-cols-[1.25fr_.75fr]"}`}><div className={centered ? "mx-auto max-w-3xl" : "max-w-3xl"}><h1 className="text-balance text-4xl font-bold tracking-[-0.03em] sm:text-5xl">{title}</h1>{body ? <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-[var(--color-muted)]">{body}</p> : null}<div className={`mt-8 flex flex-wrap gap-3 ${centered ? "justify-center" : ""}`}><Action href={buttonHref} label={buttonLabel} /></div></div>{!centered ? <div aria-hidden className="hidden min-h-64 rounded-[var(--radius-card)] bg-[var(--color-primary)]/15 lg:block" /> : null}</div></section>;
      }
      if (section.type === "COURSES") {
        return <SectionShell key={section.id}><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-balance text-3xl font-bold tracking-[-0.02em]">{title}</h2>{body ? <p className="mt-2 max-w-2xl text-[var(--color-muted)]">{body}</p> : null}</div><Link href="/courses" className="text-sm font-semibold text-[var(--color-primary)] hover:underline">{locale === "ar" ? "كل الدورات" : "All courses"}</Link></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{courses.slice(0, section.variant === "featured" ? 3 : 6).map((course) => <Link key={course.id} href={`/courses/${course.slug}`} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-primary)]"><h3 className="font-semibold">{locale === "ar" ? course.titleAr || course.title : course.title}</h3>{(locale === "ar" ? course.shortDesc : course.shortDescEn) ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--color-muted)]">{locale === "ar" ? course.shortDesc : course.shortDescEn}</p> : null}</Link>)}</div>{courses.length === 0 ? <p className="mt-8 text-sm text-[var(--color-muted)]">{locale === "ar" ? "لا توجد دورات منشورة حالياً." : "No published courses yet."}</p> : null}</SectionShell>;
      }
      if (section.type === "ABOUT" || section.type === "CONTACT") return <SectionShell key={section.id} muted={section.type === "CONTACT"}><div className="max-w-3xl"><h2 className="text-balance text-3xl font-bold tracking-[-0.02em]">{title}</h2>{body ? <p className="mt-4 whitespace-pre-wrap text-pretty leading-8 text-[var(--color-muted)]">{body}</p> : null}{section.type === "CONTACT" ? <div className="mt-6"><Action href={buttonHref} label={buttonLabel} /></div> : null}</div></SectionShell>;
      if (section.type === "STATS") return <SectionShell key={section.id} muted><div><h2 className="text-balance text-3xl font-bold tracking-[-0.02em]">{title}</h2>{body ? <p className="mt-2 text-[var(--color-muted)]">{body}</p> : null}<div className={`mt-8 grid gap-4 ${section.variant === "inline" ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>{sectionItems.map((item, index) => <div key={`${item.title}-${index}`} className="rounded-[var(--radius-card)] bg-[var(--color-surface)] p-5"><p className="text-2xl font-bold text-[var(--color-primary)]">{item.title}</p><p className="mt-1 text-sm text-[var(--color-muted)]">{item.body}</p></div>)}</div></div></SectionShell>;
      if (section.type === "FAQ") return <SectionShell key={section.id}><div className="max-w-3xl"><h2 className="text-balance text-3xl font-bold tracking-[-0.02em]">{title}</h2>{body ? <p className="mt-2 text-[var(--color-muted)]">{body}</p> : null}<div className="mt-8 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">{sectionItems.map((item, index) => <details key={`${item.title}-${index}`} className="py-4"><summary className="cursor-pointer font-semibold">{item.title}</summary><p className="mt-3 whitespace-pre-wrap leading-7 text-[var(--color-muted)]">{item.body}</p></details>)}</div></div></SectionShell>;
      if (section.type === "TESTIMONIALS" || section.type === "TEACHERS") return <SectionShell key={section.id} muted={section.type === "TESTIMONIALS"}><div><h2 className="text-balance text-3xl font-bold tracking-[-0.02em]">{title}</h2>{body ? <p className="mt-2 text-[var(--color-muted)]">{body}</p> : null}<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{sectionItems.map((item, index) => <article key={`${item.title}-${index}`} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><h3 className="font-semibold">{item.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-muted)]">{item.body}</p></article>)}</div></div></SectionShell>;
      return <SectionShell key={section.id} muted><div className="max-w-3xl"><h2 className="text-balance text-3xl font-bold tracking-[-0.02em]">{title}</h2>{body ? <p className="mt-3 whitespace-pre-wrap text-pretty leading-8 text-[var(--color-muted)]">{body}</p> : null}<div className="mt-7"><Action href={buttonHref} label={buttonLabel} /></div></div></SectionShell>;
    })}
  </main>;
}
