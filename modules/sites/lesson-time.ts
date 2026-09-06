export function formatAcademyLessonTime(iso: string, locale: string, timezone: string) {
  try { return new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short', timeZone: timezone }).format(new Date(iso)) + ` · ${timezone}`; }
  catch { return new Intl.DateTimeFormat('en', { dateStyle: 'full', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(iso)) + ' · UTC'; }
}

