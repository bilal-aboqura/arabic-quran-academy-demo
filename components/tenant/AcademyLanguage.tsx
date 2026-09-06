"use client";
import { LOCALE_COOKIE_NAME } from '@/lib/i18n/constants';
export function AcademyLanguage({ locale }: { locale: 'en' | 'ar' }) {
  return <div className="aq-language" aria-label="Language">{(['en', 'ar'] as const).map(lang => <button key={lang} lang={lang} aria-pressed={locale === lang} onClick={() => { document.cookie = `${LOCALE_COOKIE_NAME}=${lang}; path=/; max-age=31536000; samesite=lax`; window.location.reload(); }}>{lang === 'en' ? 'EN' : 'العربية'}</button>)}</div>;
}
