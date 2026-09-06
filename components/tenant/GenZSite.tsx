import Link from "next/link";
import { OrderedTemplateSections } from "./OrderedTemplateSections";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, GraduationCap, MessageSquare, Phone, PlayCircle, Rocket, Users, Video } from "lucide-react";
import type { GenZSiteProps } from "./TemplateSiteRenderer";
import { TemplateCourseCatalog, TemplateMobileMenu } from "./TemplateInteractions";
import { TemplateDisplayControls } from "./TemplateDisplayControls";
import { safeContentHref } from "@/modules/sites/content-config";

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, key: string, fallback = "") => typeof record(value)[key] === "string" && record(value)[key] ? String(record(value)[key]).slice(0, 4000) : fallback;
const monogram = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("");

export function GenZSite({ page, settings, courses, content, locale, name, cta, primary, children }: GenZSiteProps) {
  const ar = locale === "ar";
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const section = (type: string) => page.sections.find(item => item.type === type);
  const copy = (type: string, key: string, fallback = "") => {
    const config = section(type)?.config;
    return ar ? text(config, key, fallback) : text(config, `${key}En`, text(config, key, fallback));
  };
  const sectionHref = (type: string, fallback: string) => safeContentHref(text(section(type)?.config, "buttonHref"), fallback);
  const sectionOrder = (type: string) => Math.max(0, page.sections.findIndex(item => item.type === type));
  const sectionStyle = (type: string) => ({ order: sectionOrder(type) });
  const rows = (type: string) => {
    const values = record(section(type)?.config).items;
    return Array.isArray(values) ? values.map(item => ({ title: ar ? text(item, "title") : text(item, "titleEn", text(item, "title")), body: ar ? text(item, "body") : text(item, "bodyEn", text(item, "body")) })).filter(item => item.title || item.body) : [];
  };
  const heroTitle = copy("HERO", "title", ar ? "اتعلم مع أفضل المدرسين في مكان واحد" : "Learn with great teachers, all in one place");
  const words = heroTitle.split(/\s+/);
  const emphasis = words.splice(-2).join(" ");
  const showTeachers = content.teachers.length > 0 && Boolean(section("TEACHERS"));
  const hasAbout = Boolean(section("ABOUT"));
  const features = rows("FEATURES");
  const stats = [
    { value: content.stats.teachers, label: ar ? "مدرس متخصص" : "Specialist teachers", Icon: Users },
    { value: content.stats.courses, label: ar ? "كورس متاح" : "Available courses", Icon: BookOpen },
    { value: content.stats.students, label: ar ? "طالب مسجل" : "Registered students", Icon: GraduationCap },
  ].filter(item => item.value > 0);
  const logo = settings.logoUrl
    ? <img src={settings.logoUrl} alt="" width={44} height={44} />
    : <span className="gz-logo" aria-hidden><GraduationCap size={25} /></span>;

  return <div dir={ar ? "rtl" : "ltr"} className="template-site gen-z-site" data-template="bold-youth" data-template-version={page.site.templateVersion ?? page.site.template?.version ?? 1} style={{ "--gz-brand": ["#111827", "#0a0a0a"].includes(primary.toLowerCase()) ? "#0891b2" : primary, fontFamily: settings.fontPreference ? `"${settings.fontPreference}", var(--font-ibm-arabic), var(--font-outfit), sans-serif` : undefined } as React.CSSProperties}>
    <a href="#template-main" className="template-skip">{ar ? "انتقل إلى المحتوى" : "Skip to content"}</a>
    <header className="gz-header"><div className="template-shell gz-header__inner">
      <Link href="/" className="gz-brand">{logo}<span>{name}</span></Link>
      <nav className="gz-nav" aria-label={ar ? "التنقل الرئيسي" : "Main navigation"}>
        <Link href="/#home" className="gz-nav__home">{ar ? "الرئيسية" : "Home"}</Link>
        {showTeachers && <Link href="/#teachers">{ar ? "المدرسين" : "Teachers"}</Link>}
        <Link href="/courses">{ar ? "الكورسات" : "Courses"}</Link>
        {hasAbout && <Link href="/#about">{ar ? "عن المدرس" : "About us"}</Link>}
      </nav>
      <div className="gz-header__actions"><Link href="/login" className="gz-login">{ar ? "تسجيل الدخول" : "Sign in"}</Link><Link href="/register" className="gz-button gz-button--small">{ar ? "اعمل حساب" : "Join us"}</Link></div>
      <div className="template-header-tools"><TemplateDisplayControls locale={locale} tenant={settings.tenantSlug || name} /><TemplateMobileMenu locale={locale} teachers={showTeachers} /></div>
    </div></header>

    <main id="template-main" tabIndex={-1}>{children ?? <OrderedTemplateSections>
      {section("HERO") && <section id="home" className="gz-hero" style={sectionStyle("HERO")}>
        <div className="gz-glow gz-glow--cyan" aria-hidden /><div className="gz-glow gz-glow--teal" aria-hidden />
        <div className="template-shell gz-hero__content">
          <span className="gz-pill"><span className="gz-live-dot" aria-hidden />{ar ? "من أول فكرة لحد ما تحل بإيدك" : "Your learning space, from first steps to new possibilities"}</span>
          <h1>{ar && heroTitle === "اتعلم مع أفضل المدرسين في مكان واحد" ? <>اتعلم مع <span>أفضل</span><br /><span>المدرسين</span> في مكان واحد</> : <>{words.join(" ")} <span>{emphasis}</span></>}</h1>
          <div className="gz-hero__brand">{logo}<strong>{name}</strong></div>
          <p>{copy("HERO", "body", settings.shortAbout || (ar ? "اتعلم مع مدرسين متخصصين، واكتشف الكورسات التي تساعدك على تحقيق هدفك بخطوات واضحة." : "Learn with specialist teachers and discover courses that help you reach your goals."))}</p>
          <div className="gz-hero__actions"><Link href={sectionHref("HERO", "/register")} className="gz-button"><Rocket size={21} aria-hidden />{copy("HERO", "buttonLabel", ar ? "ابدأ معايا" : "Start your learning journey")}</Link><Link href="/courses" className="gz-button gz-button--secondary"><PlayCircle size={21} aria-hidden />{ar ? "تصفح الكورسات" : "Explore courses"}</Link></div>
        </div>
      </section>}

      {showTeachers && section("TEACHERS") && <section id="teachers" className="gz-section gz-teachers" style={sectionStyle("TEACHERS")}><div className="template-shell">
        <div className="gz-section-heading gz-section-heading--split"><div><span>{ar ? "طاقم التدريس" : "Meet the faculty"}</span><h2>{copy("TEACHERS", "title", ar ? "اتعرف على مدرسك" : "Meet your teacher")}</h2></div><Link href="/teachers" className="gz-text-link">{ar ? "عرض كل المدرسين" : "Meet all teachers"}<Arrow size={18} aria-hidden /></Link></div>
        <div className="gz-teacher-grid">{content.teachers.map(teacher => <article key={teacher.id} className="gz-teacher">
          <div className="gz-teacher__photo">{teacher.teacherAvatarUrl ? <img src={teacher.teacherAvatarUrl} alt={teacher.name} loading="lazy" /> : <div className="gz-teacher__placeholder"><GraduationCap size={60} aria-hidden /><span>{monogram(teacher.name)}</span></div>}</div>
          <div className="gz-teacher__body"><div className="gz-teacher__title"><div><h3>{teacher.name}</h3><p>{teacher.teacherSubject}</p></div><span className="gz-teacher__icon"><GraduationCap size={23} aria-hidden /></span></div>{teacher.bio && <p className="gz-teacher__bio">{teacher.bio}</p>}<Link href="/teachers" className="gz-teacher__link">{ar ? "اتعرف على المدرسين ودوراتهم" : "Explore teachers and their courses"}<Arrow size={20} aria-hidden /></Link></div>
        </article>)}</div>
      </div></section>}

      {(section("RESULTS") || section("STATS") || section("SOCIAL_PROOF")) && stats.length > 0 && <section className="gz-section gz-community" style={sectionStyle(section("RESULTS") ? "RESULTS" : section("STATS") ? "STATS" : "SOCIAL_PROOF")} aria-label={ar ? "مجتمع التعلم" : "Our learning community"}><div className="template-shell"><div className="gz-stats">{stats.map(({ value, label, Icon }) => <div key={label} className="gz-stat"><span><Icon size={26} aria-hidden /></span><strong>{value.toLocaleString(ar ? "ar-EG" : "en-EG")}</strong><p>{label}</p></div>)}</div><div className="gz-contact-chips"><Link href="/courses"><BookOpen size={18} aria-hidden />{ar ? "استكشف المحتوى" : "Explore learning content"}</Link>{section("FAQ") && <a href="#faq"><Check size={18} aria-hidden />{ar ? "إجابات لأسئلتك" : "Your questions answered"}</a>}{settings.contactDetails.phone && <a href={`tel:${settings.contactDetails.phone}`}><Phone size={18} aria-hidden /><bdi>{settings.contactDetails.phone}</bdi></a>}{cta.startsWith("https://wa.me/") && <a href={cta}><MessageSquare size={18} aria-hidden />{ar ? "واتساب" : "WhatsApp"}</a>}</div></div></section>}

      {hasAbout && <section id="about" className="gz-section gz-features" style={sectionStyle("ABOUT")}><div className="template-shell"><div className="gz-section-heading gz-section-heading--center"><h2>{copy("ABOUT", "title", ar ? "عن المدرس" : "About your teacher")}</h2><p>{copy("ABOUT", "body", settings.shortAbout || "")}</p></div></div></section>}
      {section("FEATURES") && <section className="gz-section gz-features" style={sectionStyle("FEATURES")}><div className="template-shell"><div className="gz-section-heading gz-section-heading--center"><h2>{copy("FEATURES", "title", ar ? "هنذاكر إزاي؟" : "How we learn")}</h2><p>{copy("FEATURES", "body")}</p></div><div className="gz-feature-grid">{features.map((feature, index) => { const Icon = [GraduationCap, Video, Check][index % 3]; return <article key={index} className="gz-feature"><span><Icon size={27} aria-hidden /></span><h3>{feature.title}</h3><p>{feature.body}</p></article>; })}</div></div></section>}

      {section("COURSES") && <section id="courses" className="gz-section gz-courses" style={sectionStyle("COURSES")}><div className="template-shell"><div className="gz-section-heading gz-section-heading--split"><div><span>{ar ? "خطوتك القادمة" : "Your next chapter"}</span><h2>{copy("COURSES", "title", ar ? "اختار الكورس المناسب ليك" : "Find your next course")}</h2><p>{copy("COURSES", "body")}</p></div><Link href="/courses" className="gz-text-link">{ar ? "كل الكورسات" : "All courses"}<Arrow size={18} aria-hidden /></Link></div>
        <TemplateCourseCatalog locale={locale} className="gz-course-grid" courses={courses.map(course => ({ id: course.id, title: ar ? course.titleAr || course.title : course.title, category: ar ? course.category?.nameAr || course.category?.name || "" : course.category?.name || "" }))}>
          {courses.map(course => { const title = ar ? course.titleAr || course.title : course.title; const category = ar ? course.category?.nameAr || course.category?.name : course.category?.name; const amount = Number(course.price); const price = Number.isFinite(amount) && amount > 0 ? `${amount.toLocaleString(ar ? "ar-EG" : "en-EG", { maximumFractionDigits: 2 })} ${ar ? "جنيه" : "EGP"}` : ar ? "مجاني" : "Free";
            return <article key={course.id} className="gz-course"><Link className="gz-course__media" href={`/courses/${course.slug}`} aria-label={title}>{course.imageUrl ? <img src={course.imageUrl} alt="" loading="lazy" /> : <div className="gz-course__art"><BookOpen size={36} strokeWidth={1.4} aria-hidden /><span>{category}</span><strong>{title}</strong></div>}</Link><div className="gz-course__body"><span>{category}</span><h3>{title}</h3><p>{ar ? course.shortDesc : course.shortDescEn || course.shortDesc}</p><div className="gz-course__footer"><strong>{price}</strong><Link href={`/courses/${course.slug}`}>{ar ? "تفاصيل الكورس" : "Course details"}<Arrow size={18} aria-hidden /></Link></div></div></article>;
          })}
        </TemplateCourseCatalog>
      </div></section>}

      {section("CATEGORIES") && content.categories.length > 0 && <section className="gz-subjects" style={sectionStyle("CATEGORIES")}><div className="template-shell"><h2>{copy("CATEGORIES", "title", ar ? "اختر مادتك" : "Choose a subject")}</h2><div>{content.categories.map(category => <Link key={category.id} href={`/courses?category=${category.slug}`}><BookOpen size={18} aria-hidden /><span>{ar ? category.nameAr || category.name : category.name}</span><small>{category._count.courses.toLocaleString(ar ? "ar-EG" : "en-EG")}</small><Arrow size={16} aria-hidden /></Link>)}</div></div></section>}

      {section("TESTIMONIALS") && content.testimonials.length > 0 && <section className="gz-section" style={sectionStyle("TESTIMONIALS")}><div className="template-shell"><div className="gz-section-heading gz-section-heading--center"><h2>{copy("TESTIMONIALS", "title", ar ? "تجارب طلابنا" : "From our students")}</h2></div><div className="gz-review-grid">{content.testimonials.map(review => <figure className="gz-review" key={review.id}><MessageSquare size={26} aria-hidden /><blockquote>{ar ? review.text : review.textEn || review.text}</blockquote><figcaption><span className="gz-review__avatar">{monogram(review.authorName)}</span><span><strong>{review.authorName}</strong><small>{ar ? review.authorTitle : review.authorTitleEn || review.authorTitle}</small></span></figcaption></figure>)}</div></div></section>}

      {section("FAQ") && rows("FAQ").length > 0 && <section id="faq" className="gz-section gz-faq" style={sectionStyle("FAQ")}><div className="template-shell"><div className="gz-section-heading gz-section-heading--center"><h2>{copy("FAQ", "title", ar ? "أسئلة شائعة" : "Frequently asked questions")}</h2></div><div className="gz-faq__list">{rows("FAQ").map((faq, index) => <details key={index}><summary>{faq.title}<ChevronDown size={20} aria-hidden /></summary><p>{faq.body}</p></details>)}</div></div></section>}

      {(section("CTA") || section("CONTACT")) && <section className="gz-final" style={sectionStyle(section("CTA") ? "CTA" : "CONTACT")}><div className="template-shell"><span className="gz-final__icon"><Rocket size={30} aria-hidden /></span><h2>{copy(section("CTA") ? "CTA" : "CONTACT", "title", ar ? "جاهز لبدء رحلة التفوق؟" : "Ready to start your learning journey?")}</h2><p>{copy(section("CTA") ? "CTA" : "CONTACT", "body")}</p><Link href={sectionHref(section("CTA") ? "CTA" : "CONTACT", "/register")} className="gz-button gz-button--white">{copy(section("CTA") ? "CTA" : "CONTACT", "buttonLabel", ar ? "ابدأ دلوقتي" : "Start your journey")}<Arrow size={20} aria-hidden /></Link><a href={cta} className="gz-final__help">{ar ? "محتار تبدأ بأنهي كورس؟" : "Need help choosing a course?"}</a></div></section>}
    </OrderedTemplateSections>}</main>

    <footer className="gz-footer"><div className="template-shell gz-footer__grid"><div><Link href="/" className="gz-brand">{logo}<span>{name}</span></Link><p>{settings.shortAbout}</p></div><nav aria-label={ar ? "روابط سريعة" : "Quick links"}><h3>{ar ? "روابط سريعة" : "Quick links"}</h3><Link href="/courses">{ar ? "الكورسات" : "Courses"}</Link>{showTeachers && <Link href="/teachers">{ar ? "المدرسين" : "Teachers"}</Link>}<Link href="/login">{ar ? "تسجيل الدخول" : "Sign in"}</Link></nav><nav aria-label={ar ? "المواد" : "Subjects"}><h3>{ar ? "المواد الدراسية" : "Subjects"}</h3>{content.categories.slice(0, 5).map(category => <Link key={category.id} href={`/courses?category=${category.slug}`}>{ar ? category.nameAr || category.name : category.name}</Link>)}</nav><div><h3>{ar ? "تواصل معانا" : "Contact us"}</h3>{settings.contactDetails.phone && <a href={`tel:${settings.contactDetails.phone}`}><bdi>{settings.contactDetails.phone}</bdi></a>}{settings.contactDetails.email && <a href={`mailto:${settings.contactDetails.email}`}>{settings.contactDetails.email}</a>}{Object.entries(settings.socialLinks).map(([platform, url]) => <a key={platform} href={url} target="_blank" rel="noopener noreferrer">{platform}</a>)}</div></div><div className="template-shell gz-footer__bottom">© {new Date().getFullYear()} {name}. {ar ? "جميع الحقوق محفوظة." : "All rights reserved."}</div></footer>
  </div>;
}
