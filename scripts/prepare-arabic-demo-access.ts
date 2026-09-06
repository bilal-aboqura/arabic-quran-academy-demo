import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { prisma } from '../lib/prisma';

/** Local sales-demo setup only; refuses repurposed tenants and shared identities. */
async function main() {
  if (process.env.NEXACLASS_DEMO_SEED !== 'arabic-quran' || process.env.NODE_ENV === 'production') throw new Error('Explicit demo opt-in required.');
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'arabic-quran-demo' }, include: { site: { include: { template: true } }, memberships: { include: { user: { include: { tenantMemberships: { select: { tenantId: true } } } } } } } });
  const allowed = new Set(['maryam@arabic-quran-demo.example.invalid', 'sarah@arabic-quran-demo.example.invalid']);
  if (tenant.site?.template?.code !== 'global-arabic-quran' || tenant.memberships.length !== 2 || tenant.memberships.some(m => !allowed.has(m.user.email) || m.user.tenantMemberships.length !== 1)) throw new Error('Tenant is not the isolated academy demo.');
  const password = randomBytes(24).toString('base64url');
  const hostname = 'arabic-quran-demo.localhost';
  const domain = await prisma.tenantDomain.findUnique({ where: { hostname } });
  if (domain && domain.tenantId !== tenant.id) throw new Error('Demo hostname is already assigned to another tenant.');
  const passwordHash = await hash(password, 12);
  await prisma.$transaction([
    prisma.tenantDomain.upsert({ where: { hostname }, update: {}, create: { tenantId: tenant.id, hostname, kind: 'CUSTOM', status: 'ACTIVE', isPrimary: true, verifiedAt: new Date() } }),
    ...tenant.memberships.map(m => prisma.user.update({ where: { id: m.userId }, data: { password: passwordHash, currentSessionId: null } })),
    prisma.site.update({ where: { id: tenant.site.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } }),
  ]);
  await writeFile('.env.arabic-demo.local', `# Local sales-demo credentials. Git ignored.\nNEXACLASS_DEV_TENANT_SLUG=arabic-quran-demo\nDEMO_STUDENT_EMAIL=sarah@arabic-quran-demo.example.invalid\nDEMO_TEACHER_EMAIL=maryam@arabic-quran-demo.example.invalid\nDEMO_PASSWORD=${password}\n`, { mode: 0o600 });
  console.log('Demo published. Local credentials saved to git-ignored .env.arabic-demo.local. No credentials printed.');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Demo access setup failed'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
