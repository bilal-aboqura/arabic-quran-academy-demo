import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, GraduationCap } from "lucide-react";

export function MathClassroomHero({ heading, body, name, image, locale, buttonLabel, buttonHref }: {
  buttonLabel: string; buttonHref: string; heading: string; body: string; name: string; image: string | null; locale: "ar" | "en";
}) {
  const ar = locale === "ar";
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return <section className="math-hero" id="home"><div className="template-shell math-hero__inner">
    <div className="math-hero__copy"><span className="template-badge"><BookOpen size={17} aria-hidden />{ar ? "نفهم الماث ونحل سوا" : "A clearer, more enjoyable way to learn maths"}</span><h1>{heading}</h1><p>{body}</p><div className="math-hero__actions"><Link href={buttonHref} className="template-button">{buttonLabel}<Arrow size={19} aria-hidden /></Link><Link href="/courses" className="math-hero__browse">{ar ? "شوف الكورسات" : "Explore courses"}</Link></div></div>
    <div className="math-hero__visual"><div className="math-hero__ring" aria-hidden /><div className="math-hero__portrait">{image ? (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={image} alt={name} width={460} height={460} fetchPriority="high" />
    ) : <div className="math-hero__placeholder"><GraduationCap size={90} strokeWidth={1} aria-hidden /><strong>{name}</strong></div>}</div><div className="math-hero__symbols" aria-hidden>{["%", "√", "Σ", "+", "×", "−"].map((symbol, i) => <span key={symbol} className={`math-symbol math-symbol--${i + 1}`}>{symbol}</span>)}</div><span className="math-chip math-chip--1"><span aria-hidden>△</span>{ar ? "الهندسة" : "Geometry"}</span><span className="math-chip math-chip--2"><span aria-hidden>＋</span>{ar ? "الجبر" : "Algebra"}</span><span className="math-chip math-chip--3"><span aria-hidden>▥</span>{ar ? "الإحصاء" : "Statistics"}</span></div>
  </div></section>;
}
