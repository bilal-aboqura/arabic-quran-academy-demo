import Link from "next/link";
import { GlobalArabicSite } from './GlobalArabicSite';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import type { TenantPublicSettings } from "@/modules/settings/tenant-settings";
import "./template-site.css";
import { refreshDefaultCopy } from "@/modules/sites/refresh-default-copy";
import { readableBrandColor } from "@/modules/sites/brand-contrast";
import { GenZSite } from "./GenZSite";
import { MathClassroomHero } from "./MathClassroomHero";
import { TemplateDisplayControls } from "./TemplateDisplayControls";
import { TemplateCourseCatalog, TemplateMobileMenu } from "./TemplateInteractions";
import { safeContentHref } from "@/modules/sites/content-config";

export type Course = {
  id: string;
  slug: string;
  title: string;
  titleAr: string | null;
  shortDesc: string | null;
  shortDescEn: string | null;
  imageUrl: string | null;
  price: unknown;
  createdById?: string | null;
  level?: string | null;
  _count?: { lessons: number };
  category?: { name: string; nameAr: string | null } | null;
  badge?: string;
};

export type Content = {
  categories: Array<{
    id: string;
    slug: string;
    name: string;
    nameAr: string | null;
    description: string | null;
    imageUrl: string | null;
    _count: { courses: number };
  }>;
  teachers: Array<{
    id: string;
    name: string;
    teacherSubject: string | null;
    teacherAvatarUrl: string | null;
    bio?: string;
    languages?: string;
    userId?: string;
  }>;
  testimonials: Array<{
    id: string;
    text: string;
    textEn: string | null;
    authorName: string;
    authorTitle: string | null;
    authorTitleEn: string | null;
    imageUrl: string | null;
    badge?: string;
  }>;
  stats: { courses: number; students: number; teachers: number; enrollments: number };
};

type Section = {
  id: string;
  type: string;
  variant: string;
  config: unknown;
};

export type Page = {
  title: string;
  site: {
    template: { code: string; version: number; defaultTheme: unknown } | null;
    templateVersion: number | null;
    themeOverrides: unknown;
  };
  sections: Section[];
};

const obj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const str = (record: Record<string, unknown>, key: string, fallback = "") =>
  typeof record[key] === "string" && record[key] ? String(record[key]).slice(0, 4000) : fallback;

const items = (record: Record<string, unknown>, locale: "ar" | "en") =>
  Array.isArray(record.items)
    ? record.items.flatMap((item) => {
        const row = obj(item);
        const title = locale === "en" ? str(row, "titleEn", str(row, "title")) : str(row, "title");
        const body = locale === "en" ? str(row, "bodyEn", str(row, "body")) : str(row, "body");
        return title || body ? [{ title, body }] : [];
      }).slice(0, 12)
    : [];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

function websiteHref(settings: TenantPublicSettings) {
  const raw = settings.contactDetails.whatsapp?.replace(/[^0-9+]/g, "") ?? "";
  let whatsapp = raw.replace(/^\+/g, "");
  if (whatsapp.startsWith("00")) whatsapp = whatsapp.slice(2);
  if (whatsapp.startsWith("01") && whatsapp.length === 11) whatsapp = `20${whatsapp}`;
  if (whatsapp.startsWith("1") && whatsapp.length === 10) whatsapp = `20${whatsapp}`;
  const valid = /^\d{10,15}$/.test(whatsapp);
  const message = encodeURIComponent("مرحبًا، حابب أعرف تفاصيل الكورس");
  return valid ? `https://wa.me/${whatsapp}?text=${message}` : "/courses";
}

function localizedPrice(value: unknown, locale: "ar" | "en") {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return locale === "ar" ? "مجاني" : "Free";
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    maximumFractionDigits: amount % 1 ? 2 : 0,
  }).format(amount);
  return locale === "ar" ? `${number} جنيه` : `${number} EGP`;
}

export function TemplateSiteRenderer({
  page,
  settings,
  courses,
  content,
  locale,
  children,
}: {
  page: Page;
  settings: TenantPublicSettings;
  courses: Course[];
  content: Content;
  locale: "ar" | "en";
  children?: React.ReactNode;
}) {
  const template = page.site.template?.code ?? "clean-education";
  page = { ...page, sections: refreshDefaultCopy(template, page.sections) };
  const name = locale === "ar" ? settings.platformName : settings.platformNameEn || settings.platformName;
  const primary = settings.primaryColor || "#2563eb";
  const secondary = settings.secondaryColor || "#0f172a";
  const accent = settings.accentColor || "#f59e0b";
  const heroImage = settings.heroImageUrl || content.teachers[0]?.teacherAvatarUrl || null;
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;
  const cta = websiteHref(settings);

  if (template === 'global-arabic-quran') return <GlobalArabicSite page={page} settings={settings} courses={courses} content={content} locale={locale}>{children}</GlobalArabicSite>;

  if (template === "bold-youth") {
    return (
      <GenZSite
        page={page}
        settings={settings}
        courses={courses}
        content={content}
        locale={locale}
        name={name}
        cta={cta}
        heroImage={heroImage}
        primary={readableBrandColor(primary)}
        secondary={secondary}
        accent={accent}
      >{children}</GenZSite>
    );
  }

  const sectionText = (section: Section, key: string, fallback = "") => {
    const config = obj(section.config);
    return locale === "en" ? str(config, `${key}En`, str(config, key, fallback)) : str(config, key, fallback);
  };
  const sectionTitle = (section: Section, fallback: string) => sectionText(section, "title", fallback);
  const sectionBody = (section: Section, fallback = "") => sectionText(section, "body", fallback);
  const sectionHref = (section: Section, fallback: string) => safeContentHref(str(obj(section.config), "buttonHref"), fallback);
  // Sections arrive in the teacher-defined sort order from the database.
  const orderedSections = page.sections;

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-template={template}
      data-template-version={page.site.templateVersion ?? page.site.template?.version ?? 1}
      className="template-site"
      style={
        {
          "--site-primary": primary,
          "--site-secondary": secondary,
          "--site-accent": accent,
          "--brand-on-light": readableBrandColor(primary),
          "--brand-on-dark": readableBrandColor(primary, true),
          "--site-link": readableBrandColor(primary, template === "premium-dark"),
          "--site-button-bg": readableBrandColor(primary, template === "premium-dark"),
          fontFamily: settings.fontPreference ? `"${settings.fontPreference}", var(--font-ibm-arabic), var(--font-outfit), sans-serif` : undefined,
        } as React.CSSProperties
      }
    >
      <a href="#template-main" className="template-skip">{locale === "ar" ? "انتقل إلى المحتوى" : "Skip to content"}</a>
      {/* Template Announcement Banners */}
      {template === "course-funnel" && (
        <div className="template-announcement">
          <span>{locale === "ar" ? "خطوتك الأولى تبدأ بفهم المنهج" : "Your first step starts with understanding the course"}</span>
          <Link href="/courses">{locale === "ar" ? "استكشف المحتوى ←" : "Explore the curriculum →"}</Link>
        </div>
      )}
      {template === "modern-academy" && (
        <div className="template-announcement">
          <span>{locale === "ar" ? "مسارات واضحة للتعلم، في مكان واحد" : "Clear learning paths, all in one place"}</span>
        </div>
      )}

      {/* Header */}
      <header className="template-header">
        <div className="template-shell template-header__inner">
          <Link href="/" className="template-brand">
            {settings.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={settings.logoUrl} alt={name} className="template-logo" />
            ) : (
              <span className="template-brand-icon" aria-hidden>
                {initials(name) || "◆"}
              </span>
            )}
            <span>{name}</span>
          </Link>
          <nav className="template-nav" aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}>
            <Link href="/courses">{locale === "ar" ? "الكورسات" : "Courses"}</Link>
            {content.teachers.length > 0 && <Link href="/teachers">{locale === "ar" ? "المدرسين" : "Faculty"}</Link>}
            <Link href="/login">{locale === "ar" ? "دخول الطالب" : "Student sign in"}</Link>
            <a href={cta} className="template-button">
              {locale === "ar" ? "ابدأ دلوقتي" : "Get Started"}
            </a>
          </nav>
          <div className="template-header-tools"><TemplateDisplayControls locale={locale} tenant={settings.tenantSlug || name} /><TemplateMobileMenu locale={locale} teachers={content.teachers.length > 0} /></div>
        </div>
      </header>

      {/* Main Sections */}
      <main id="template-main" tabIndex={-1}>
        {children ?? orderedSections.map((section, index) => {
          const config = obj(section.config);
          const itemRows = items(config, locale);

          // HERO SECTION
          if (section.type === "HERO") {
            const heading = sectionTitle(
              section,
              locale === "ar" ? "تعليم يصنع الفرق الحقيقي في مستقبلك" : "Learning that transforms your future"
            );
            const copy = sectionBody(
              section,
              settings.shortAbout ||
                (locale === "ar"
                  ? "شرح مبسط وواضح، متابعة دورية مستمرة، وخطة تعليمية محكمة تساعد كل طالب على الوصول إلى هدفه والتفوق."
                  : "Practical courses, clear explanations, and support that propels you forward.")
            );
            const buttonLabel = sectionText(section, "buttonLabel", locale === "ar" ? "شوف تفاصيل الاشتراك" : "Enroll Now");
            const buttonHref = sectionHref(section, cta);

            if (template === "math-classroom") return <MathClassroomHero key={section.id} heading={heading} body={copy} name={name} image={heroImage} locale={locale} buttonLabel={buttonLabel} buttonHref={buttonHref} />;

            return (
              <section key={section.id} className="template-shell template-hero" id="home">
                <div>
                  <div className="template-kicker">
                    <span className="template-badge">
                      {template === "premium-dark"
                        ? locale === "ar" ? "مساحة للفهم العميق" : "A space for deeper understanding"
                        : template === "bold-youth"
                        ? locale === "ar" ? "منهجية التفوق الأولى" : "#1 Student Choice"
                        : template === "clean-education"
                        ? locale === "ar" ? "شرح بسيط وعلى مهلك" : "Calm & Focused Learning"
                        : template === "course-funnel"
                        ? locale === "ar" ? "شرح وتدريب ومراجعة" : "Top Tier Masterclass"
                        : name}
                    </span>
                  </div>
                  <h1 className="template-heading">{heading}</h1>
                  <p className="template-subheading">{copy}</p>

                  <div className="template-hero-actions" style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "2rem" }}>
                    <a href={buttonHref} className="template-button">
                      {buttonLabel}
                    </a>
                    <Link href="/courses" className="template-button template-button--secondary">
                      {locale === "ar" ? "شوف الكورسات" : "Browse Courses"} <Arrow size={18} aria-hidden />
                    </Link>
                  </div>

                  {/* Trust Pill / Stats in Hero */}
                  <div style={{ marginTop: "2rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1.25rem" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: "800", color: "var(--site-muted)" }}>
                      {content.stats.students > 0
                        ? `${content.stats.students.toLocaleString(locale === "ar" ? "ar-EG" : "en")} ${locale === "ar" ? "طالب مسجل" : "Students"}`
                        : locale === "ar" ? "شرح منظم، خطوة بخطوة" : "Structured learning and continuous support"}
                    </span>
                  </div>
                </div>

                {/* Hero Visual */}
                {(
                  <div className="template-hero__visual">
                    <div className="template-hero__frame">
                      {heroImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={heroImage} alt={content.teachers[0]?.name || name} fetchPriority="high" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "bottom" }} />
                      ) : (
                        <div className="template-hero__placeholder"><GraduationCap size={72} strokeWidth={1} aria-hidden /><strong>{name}</strong><span>{locale === "ar" ? "مكانك للشرح والتدريب" : "Your space to learn and grow"}</span></div>
                      )}
                    </div>
                    <div className="template-hero__aura" aria-hidden />
                    {content.teachers[0] && <div className="template-mentor-label"><span className="template-mentor-label__icon"><GraduationCap size={22} aria-hidden /></span><div><small>{locale === "ar" ? "اتعلم مع" : "Learn with"}</small><strong>{content.teachers[0].name}</strong></div></div>}
                    {courses[0] && <Link className="template-hero-course" href={`/courses/${courses[0].slug}`}><BookOpen size={20} aria-hidden /><span><small>{locale === "ar" ? "ابدأ من هنا" : "Explore your first step"}</small><strong>{locale === "ar" ? courses[0].titleAr || courses[0].title : courses[0].title}</strong></span><Arrow size={18} aria-hidden /></Link>}
                    {template === "personal-teacher" && (
                      <div className="template-trust-pill">
                        <span>{content.teachers[0]?.teacherSubject || (locale === "ar" ? "متابعة تعليمية مباشرة" : "Direct learning support")}</span>
                      </div>
                    )}
                    {template === "bold-youth" && (
                      <>
                        <span className="template-sticker template-sticker--1">شرح متقن</span>
                        <span className="template-sticker template-sticker--2">بدون تعقيد</span>
                      </>
                    )}
                  </div>
                )}
              </section>
            );
          }

          // MARQUEE TICKER (For bold-youth)
          if (template === "bold-youth" && index === 0) {
            return (
              <div key="bold-marquee" className="template-marquee-wrap" aria-hidden>
                <div className="template-marquee-track">
                  <span>حل أسرع • فهم أعمق • مراجعات ليلة الامتحان • بدون تعقيد • نحو الدرجة النهائية • </span>
                  <span>حل أسرع • فهم أعمق • مراجعات ليلة الامتحان • بدون تعقيد • نحو الدرجة النهائية • </span>
                  <span>حل أسرع • فهم أعمق • مراجعات ليلة الامتحان • بدون تعقيد • نحو الدرجة النهائية • </span>
                </div>
              </div>
            );
          }

          // A curriculum link remains useful when no preview video is configured.
          if (section.type === "VIDEO") {
            const course = courses[0];
            if (!course) return null;
            return <section key={section.id} className="template-section template-section--tint"><div className="template-shell template-curriculum">
              <div><BookOpen size={36} strokeWidth={1.5} aria-hidden /><h2 className="template-heading">{sectionTitle(section, locale === "ar" ? "خد فكرة عن الكورس" : "Explore the curriculum")}</h2><p className="template-subheading">{sectionBody(section)}</p></div>
              <Link href={sectionHref(section, `/courses/${course.slug}`)} className="template-button">{sectionText(section, "buttonLabel", locale === "ar" ? "شوف محتوى الكورس" : "Explore the curriculum")}<Arrow size={18} aria-hidden /></Link>
            </div></section>;
          }

          // COURSES SECTION
          if (section.type === "COURSES") {
            const courseList = courses;

            return (
              <section key={section.id} className="template-section">
                <div className="template-shell">
                  <div className="template-section-header">
                    <span className="template-badge">
                      {locale === "ar" ? "المناهج والكورسات" : "Curricula & Courses"}
                    </span>
                    <h2 className="template-heading" style={{ marginTop: "0.75rem" }}>
                      {sectionTitle(section, locale === "ar" ? "أحدث الكورسات والبرامج التعليمية" : "Latest Educational Courses")}
                    </h2>
                    {sectionBody(section) && <p className="template-subheading">{sectionBody(section)}</p>}
                  </div>

                  {/* If course-funnel, render Master Offer Card */}
                  {template === "course-funnel" && courseList[0] ? (
                    <div className="template-master-offer">
                      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                        <div>
                          <span className="template-badge">
                            {locale === "ar" ? "الكورس المناسب ليك" : "Your next course"}
                          </span>
                          <h3 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: "950", marginTop: "0.75rem", color: "var(--site-ink)" }}>
                            {locale === "ar" ? courseList[0].titleAr || courseList[0].title : courseList[0].title}
                          </h3>
                        </div>
                        <div style={{ textAlign: locale === "ar" ? "left" : "right" }}>
                          <div className="template-offer-price">{localizedPrice(courseList[0].price, locale)}</div>
                        </div>
                      </div>

                      <p style={{ marginTop: "1rem", color: "var(--site-muted)", fontSize: "1.05rem", lineHeight: 1.8 }}>
                        {locale === "ar" ? courseList[0].shortDesc : courseList[0].shortDescEn || courseList[0].shortDesc}
                      </p>

                      <div className="template-guarantee-seal"><BookOpen size={26} aria-hidden /><p>{locale === "ar" ? "شوف محتوى الكورس والمستوى المطلوب قبل الاشتراك. ولو عندك سؤال، تواصل معانا." : "Review the curriculum and course requirements before enrolling. Have a question? Contact us for help choosing."}</p></div>
                      <div style={{ marginTop: "2.5rem", textAlign: "center" }}>
                        <Link href={`/courses/${courseList[0].slug}`} className="template-button">{locale === "ar" ? "تفاصيل الكورس والتسجيل" : "Course details & enrollment"}<Arrow size={18} aria-hidden /></Link>
                      </div>
                    </div>
                  ) : (
                    <TemplateCourseCatalog locale={locale} courses={courseList.map(course => ({ id: course.id, title: locale === "ar" ? course.titleAr || course.title : course.title, category: locale === "ar" ? course.category?.nameAr || course.category?.name || "" : course.category?.name || "" }))}>
                      {courseList.map((course) => (
                        <article key={course.id} className="template-course">
                          <Link href={`/courses/${course.slug}`} className="template-course__image-wrap" aria-label={locale === "ar" ? course.titleAr || course.title : course.title}>
                            {course.imageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={course.imageUrl}
                                alt={locale === "ar" ? course.titleAr || course.title : course.title}
                                className="template-course__image" loading="lazy"
                              />
                            ) : (
                              <div className="template-course__fallback-art">
                                <small>{locale === "ar" ? course.category?.nameAr || course.category?.name || name : course.category?.name || name}</small>
                                <strong>{locale === "ar" ? course.titleAr || course.title : course.title}</strong>
                              </div>
                            )}
                            <span className="template-course__badge">
                              {course.badge || (locale === "ar" ? course.category?.nameAr || course.category?.name : course.category?.name) || (locale === "ar" ? "كورس" : "Course")}
                            </span>
                          </Link>

                          <div className="template-course__body">
                            <span className="template-course__category">
                              {locale === "ar" ? course.category?.nameAr || course.category?.name : course.category?.name}
                            </span>
                            <h3 className="template-course__title">
                              {locale === "ar" ? course.titleAr || course.title : course.title}
                            </h3>
                            <p className="template-course__desc">
                              {locale === "ar" ? course.shortDesc : course.shortDescEn || course.shortDesc}
                            </p>

                            <div className="template-course__footer">
                              <span className="template-course__price">
                                {localizedPrice(course.price, locale)}
                              </span>
                              <Link href={`/courses/${course.slug}`} className="template-course__action">
                                {locale === "ar" ? "تفاصيل الكورس" : "View Course"} <Arrow size={16} aria-hidden />
                              </Link>
                            </div>
                          </div>
                        </article>
                      ))}
                    </TemplateCourseCatalog>
                  )}
                </div>
              </section>
            );
          }

          // CATEGORIES SECTION
          if (section.type === "CATEGORIES") {
            const categories = content.categories;
            if (!categories.length) return null;

            return (
              <section key={section.id} className="template-section template-section--tint">
                <div className="template-shell">
                  <div className="template-section-header">
                    <span className="template-badge">
                      {locale === "ar" ? "التخصصات والمجالات" : "Categories"}
                    </span>
                    <h2 className="template-heading" style={{ marginTop: "0.75rem" }}>
                      {sectionTitle(section, locale === "ar" ? "اختر تخصصك وابدأ التعلم" : "Choose Your Field")}
                    </h2>
                  </div>

                  <div className="template-category-rail">
                    {categories.map((cat) => (
                      <Link key={cat.id} href={`/courses?category=${cat.slug}`} className="template-category-chip">
                        {template === "math-classroom" && (cat.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={cat.imageUrl} alt="" loading="lazy" className="math-stage__image" />
                        ) : <span className="math-stage__placeholder"><GraduationCap size={60} strokeWidth={1.3} aria-hidden /></span>)}
                        <span>{locale === "ar" ? cat.nameAr || cat.name : cat.name}</span>
                        <span style={{ color: "var(--site-muted)", fontSize: "0.8rem" }}>
                          ({cat._count.courses.toLocaleString(locale === "ar" ? "ar-EG" : "en")} {locale === "ar" ? "كورس" : "courses"})
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // TEACHERS / FACULTY SECTION
          if (section.type === "TEACHERS") {
            const faculty = content.teachers;
            if (!faculty.length) return null;

            return (
              <section key={section.id} className="template-section">
                <div className="template-shell">
                  <div className="template-section-header">
                    <span className="template-badge">
                      {locale === "ar" ? "هيئة التدريس" : "Faculty"}
                    </span>
                    <h2 className="template-heading" style={{ marginTop: "0.75rem" }}>
                      {sectionTitle(section, locale === "ar" ? "نخبة من كبار الأساتذة والمحاضرين" : "Our Distinguished Faculty")}
                    </h2>
                  </div>

                  <div className="template-grid">
                    {faculty.map((teacher) => (
                      <article key={teacher.id} className="template-faculty-card">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={teacher.teacherAvatarUrl || "/instructor.png"}
                          alt={teacher.name}
                          className="template-faculty-avatar" loading="lazy"
                        />
                        <div>
                          <h3 style={{ fontSize: "1.15rem", fontWeight: "900", color: "var(--site-ink)" }}>
                            {teacher.name}
                          </h3>
                          <p style={{ color: "var(--site-link)", fontSize: "0.88rem", fontWeight: "800", marginTop: "0.2rem" }}>
                            {teacher.teacherSubject}
                          </p>
                          {teacher.bio && (
                            <p style={{ color: "var(--site-muted)", fontSize: "0.85rem", marginTop: "0.4rem" }}>
                              {teacher.bio}
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // STATS / RESULTS / SOCIAL PROOF SECTION
          if (section.type === "STATS" || section.type === "RESULTS" || section.type === "SOCIAL_PROOF") {
            // These section types share live metrics; show the band once per page.
            if (orderedSections.findIndex(item => ["STATS", "RESULTS", "SOCIAL_PROOF"].includes(item.type)) !== index) return null;
            const statItems = [
              ...(content.stats.teachers > 0 ? [{ title: content.stats.teachers.toLocaleString(locale === "ar" ? "ar-EG" : "en"), body: locale === "ar" ? "مدرس على المنصة" : "Teachers" }] : []),
              ...(content.stats.students > 0 ? [{ title: content.stats.students.toLocaleString(locale === "ar" ? "ar-EG" : "en"), body: locale === "ar" ? "طالب مسجل" : "Registered students" }] : []),
              ...(content.stats.courses > 0 ? [{ title: content.stats.courses.toLocaleString(locale === "ar" ? "ar-EG" : "en"), body: locale === "ar" ? "كورس متاح" : "Available courses" }] : []),
              ...(content.stats.enrollments > 0 ? [{ title: content.stats.enrollments.toLocaleString(locale === "ar" ? "ar-EG" : "en"), body: locale === "ar" ? "عملية التحاق" : "Enrollments" }] : []),
            ];

            return (
              <section key={section.id} className="template-section template-section--tint">
                <div className="template-shell">
                  <div className="template-section-header" style={{ textAlign: "center" }}>
                    <span className="template-badge">
                      {locale === "ar" ? "بالأرقام والنتائج" : "In Numbers"}
                    </span>
                    <h2 className="template-heading" style={{ marginTop: "0.75rem", marginInline: "auto" }}>
                      {sectionTitle(section, locale === "ar" ? "أرقام ونتائج تعكس التزامنا بالتفوق" : "Results that speak for themselves")}
                    </h2>
                  </div>

                  <div className="template-stats-grid">
                    {statItems.map((stat, i) => (
                      <div key={i} className="template-stat-card">
                        <strong>{stat.title}</strong>
                        <span>{stat.body}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // FEATURES / LEARNING PROCESS SECTION
          if (section.type === "FEATURES") {
            const featureList = itemRows;

            return (
              <section key={section.id} className="template-section">
                <div className="template-shell">
                  <div className="template-section-header">
                    <span className="template-badge">
                      {locale === "ar" ? "هنذاكر إزاي؟" : "How We Teach"}
                    </span>
                    <h2 className="template-heading" style={{ marginTop: "0.75rem" }}>
                      {sectionTitle(section, locale === "ar" ? "نفهم ونطبق ونراجع سوا" : "A complete learning methodology")}
                    </h2>
                  </div>

                  <div className="template-pathway-grid">
                    {featureList.map((feat, i) => (
                      <div key={i} className="template-pathway-card">
                        <div className="template-pathway-step">{template === "math-classroom" ? <BookOpen size={24} aria-hidden /> : i + 1}</div>
                        <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "var(--site-ink)", marginBottom: "0.5rem" }}>
                          {feat.title}
                        </h3>
                        <p style={{ color: "var(--site-muted)", fontSize: "0.95rem", lineHeight: 1.8 }}>
                          {feat.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // TESTIMONIALS SECTION
          if (section.type === "TESTIMONIALS") {
            const reviews = content.testimonials;
            if (!reviews.length) return null;

            return (
              <section key={section.id} className="template-section template-section--tint">
                <div className="template-shell">
                  <div className="template-section-header">
                    <span className="template-badge">
                      {locale === "ar" ? "من تجارب الطلاب" : "Success Stories"}
                    </span>
                    <h2 className="template-heading" style={{ marginTop: "0.75rem" }}>
                      {sectionTitle(section, locale === "ar" ? "الطلاب بيقولوا إيه؟" : "What Our Students Say")}
                    </h2>
                  </div>

                  <div className="template-grid">
                    {reviews.map((rev) => (
                      <article key={rev.id} className="template-testimonial-card">
                        <blockquote>
                          “{locale === "ar" ? rev.text : rev.textEn || rev.text}”
                        </blockquote>
                        <div className="template-testimonial-author">
                          <div className="template-testimonial-avatar">
                            {initials(rev.authorName) || "A"}
                          </div>
                          <div>
                            <strong style={{ display: "block", color: "var(--site-ink)", fontSize: "0.95rem" }}>
                              {rev.authorName}
                            </strong>
                            <span style={{ fontSize: "0.82rem", color: "var(--site-muted)" }}>
                              {locale === "ar" ? rev.authorTitle : rev.authorTitleEn || rev.authorTitle}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // FAQ SECTION
          if (section.type === "FAQ") {
            const faqList = itemRows;
            if (!faqList.length) return null;

            return (
              <section key={section.id} className="template-section">
                <div className="template-shell" style={{ maxWidth: "880px" }}>
                  <div className="template-section-header">
                    <span className="template-badge">
                      {locale === "ar" ? "إجابات مهمة" : "FAQ"}
                    </span>
                    <h2 className="template-heading" style={{ marginTop: "0.75rem" }}>
                      {sectionTitle(section, locale === "ar" ? "الأسئلة الأكثر تكراراً" : "Frequently Asked Questions")}
                    </h2>
                  </div>

                  <div>
                    {faqList.map((faq, i) => (
                      <details key={i} className="template-faq-item">
                        <summary className="template-faq-summary">
                          <span>{faq.title}</span>
                          <span className="template-faq-icon">+</span>
                        </summary>
                        <div className="template-faq-content">{faq.body}</div>
                      </details>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // ABOUT SECTION
          if (section.type === "ABOUT") {
            return (
              <section key={section.id} className="template-section">
                <div className="template-shell" style={{ maxWidth: "880px" }}>
                  <span className="template-badge">
                    {locale === "ar" ? "عن المدرس" : "About"}
                  </span>
                  <h2 className="template-heading" style={{ marginTop: "0.75rem" }}>
                    {sectionTitle(section, locale === "ar" ? "نتعرف على بعض" : "Our Vision & Methodology")}
                  </h2>
                  <p className="template-subheading" style={{ marginTop: "1.5rem" }}>
                    {sectionBody(section, settings.shortAbout || "")}
                  </p>
                </div>
              </section>
            );
          }

          // CTA & CONTACT SECTION
          if (section.type === "CTA" || section.type === "CONTACT") {
            return (
              <section key={section.id} className="template-section">
                <div className="template-shell">
                  <div className="template-cta-banner">
                    <div>
                      <h2>
                        {sectionTitle(section, locale === "ar" ? "جاهز تبدأ معايا؟" : "Ready to Start Your Journey?")}
                      </h2>
                      <p style={{ marginTop: "0.85rem", opacity: 0.9, fontSize: "1.1rem", maxWidth: "55ch" }}>
                        {sectionBody(
                          section,
                          locale === "ar"
                            ? "اختار الكورس المناسب ليك وابدأ خطوة بخطوة."
                            : "Join thousands of successful learners and achieve your academic goals with confidence."
                        )}
                      </p>
                    </div>
                    <a
                      href={sectionHref(section, cta)}
                      className="template-button template-button--accent"
                      style={{ fontSize: "1.1rem", minHeight: "54px", paddingInline: "2rem" }}
                    >
                      {sectionText(section, "buttonLabel", locale === "ar" ? "شوف تفاصيل الاشتراك ↗" : "Enroll Now ↗")}
                    </a>
                  </div>
                </div>
              </section>
            );
          }

          return null;
        })}
      </main>

      {/* Footer */}
      <footer className="template-footer">
        <div className="template-shell template-footer__inner">
          <div>
            <strong style={{ fontSize: "1.05rem", color: "var(--site-ink)" }}>{name}</strong>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--site-muted)" }}>
              © {new Date().getFullYear()} {name}. {locale === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}
            </p>
          </div>
          <div className="template-footer-links">
            <Link href="/courses">{locale === "ar" ? "الكورسات" : "Courses"}</Link>
            {Object.entries(settings.socialLinks).map(([platform, url]) => (
              <a key={platform} href={url} target="_blank" rel="noopener noreferrer">
                {platform}
              </a>
            ))}
            <Link href="/login">{locale === "ar" ? "دخول الطالب" : "Student sign in"}</Link>
            <a href={cta}>{cta.startsWith("https://wa.me/") ? (locale === "ar" ? "تواصل معانا" : "Contact us") : (locale === "ar" ? "شوف الكورسات" : "Explore courses")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export type GenZSiteProps = {
  children?: React.ReactNode;
  page: Page;
  settings: TenantPublicSettings;
  courses: Course[];
  content: Content;
  locale: "ar" | "en";
  name: string;
  cta: string;
  heroImage: string | null;
  primary: string;
  secondary: string;
  accent: string;
};
