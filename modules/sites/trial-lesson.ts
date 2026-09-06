import type { TenantPublicSettings } from '@/modules/settings/tenant-settings';
export function trialLessonHref(contacts: TenantPublicSettings['contactDetails']) {
  const number = (contacts.whatsapp || '').replace(/[\s()+-]/g, '').replace(/^00/, '');
  const message = 'Hello, I would like to book a trial Arabic/Quran lesson.';
  if (/^[1-9]\d{7,14}$/.test(number)) return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacts.email || '')) return `mailto:${contacts.email}?subject=Trial%20lesson&body=${encodeURIComponent(message)}`;
  if (/^\+?[\d\s()-]{7,24}$/.test(contacts.phone || '')) return `tel:${contacts.phone.replace(/[\s()-]/g, '')}`;
  return '#academy-contact';
}
