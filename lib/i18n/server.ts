import { cookies, headers } from "next/headers";
import { cache } from 'react';
import { resolveTenantFromHostname } from '@/modules/tenants/repository';
import { prisma } from '@/lib/prisma';
import { LOCALE_COOKIE_NAME } from "./constants";
import { getMessages, makeTranslator, normalizeLocale } from "./core";
import type { Locale } from "./types";

const tenantLocale = cache(async () => {
  const tenant = await resolveTenantFromHostname((await headers()).get('host'));
  if (!tenant) return undefined;
  const site = await prisma.site.findUnique({ where: { tenantId: tenant.tenantId }, select: { template: { select: { code: true } } } });
  if (site?.template?.code === 'global-arabic-quran') return 'en';
  return undefined;
});

export async function getLocaleFromCookie(fallback?: Locale): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  return normalizeLocale(cookieValue ?? fallback ?? await tenantLocale());
}

export async function getServerMessages() {
  return getMessages(await getLocaleFromCookie());
}

export async function getServerTranslator() {
  return makeTranslator(await getLocaleFromCookie());
}
