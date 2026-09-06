import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { globalArabicTemplate, arabicDemoPreset, academyDemoModules } from '../modules/sites/global-arabic';
import { registerSystemWebsiteTemplates } from '../modules/sites/template-service';
import { recordLessonProgressForTenant } from '../modules/learning/progress.repository';

/** Explicit opt-in; fixed demo identity; never patches an existing/live tenant. */
async function main() {
  if (process.env.NEXACLASS_DEMO_SEED !== 'arabic-quran' || process.env.NODE_ENV === 'production') throw new Error('Run only in a demo database with NEXACLASS_DEMO_SEED=arabic-quran.');
  const slug = 'arabic-quran-demo';
  if (await prisma.tenant.findUnique({ where: { slug } })) throw new Error('Demo slug already exists. Refusing to overwrite any tenant.');
  await registerSystemWebsiteTemplates();
  const template = await prisma.websiteTemplate.findUniqueOrThrow({ where: { code: globalArabicTemplate.code } });
  const password = process.env.NEXACLASS_DEMO_PASSWORD || randomBytes(32).toString('hex');
  if (password.length < 12) throw new Error('Demo password must be at least 12 characters.');
  const passwordHash = await hash(password, 12);
  const result = await prisma.$transaction(async tx => {
    const tenant = await tx.tenant.create({ data: { slug, name: 'Arabic & Quran Academy', nameAr: arabicDemoPreset.siteName, settings: { create: {
      platformName: arabicDemoPreset.siteName, platformNameEn: arabicDemoPreset.platformNameEn, defaultLocale: 'en', timezone: 'UTC', currency: 'USD', teachersEnabled: true,
      primaryColor: arabicDemoPreset.primaryColor, secondaryColor: arabicDemoPreset.secondaryColor, accentColor: arabicDemoPreset.accentColor, heroImageUrl: arabicDemoPreset.heroImageUrl,
      seoTitle: 'Online Arabic & Quran Classes | Arabic & Quran Academy', seoDescription: 'Learn Arabic, Quran reading, Tajweed and Quran memorization online with personalized lessons for children and adults.',
      contactDetails: {},
    } } } });
    const teacher = await tx.user.create({ data: { email: 'maryam@arabic-quran-demo.example.invalid', name: 'Ustadha Maryam', password: passwordHash } });
    const student = await tx.user.create({ data: { email: 'sarah@arabic-quran-demo.example.invalid', name: 'Sarah Johnson', password: passwordHash } });
    const teacherMembership = await tx.tenantMembership.create({ data: { tenantId: tenant.id, userId: teacher.id, role: 'TEACHER', displayName: teacher.name, teacherSubject: arabicDemoPreset.teacherSubject, teacherAvatarUrl: '/academy/teacher-lesson.webp', teacherLanguages: 'Arabic, English', teacherBio: 'DEMO profile. Personal guidance for your Arabic and Quran learning journey.' } });
    const studentMembership = await tx.tenantMembership.create({ data: { tenantId: tenant.id, userId: student.id, role: 'STUDENT', displayName: student.name } });
    await tx.site.create({ data: { tenantId: tenant.id, templateId: template.id, templateVersion: template.version, status: 'DRAFT', pages: { create: { slug: 'home', title: 'Home', isHome: true, isPublished: true, sections: { create: globalArabicTemplate.sections.map((s, sortOrder) => ({ ...s, sortOrder, enabled: true })) } } } } });
    const lessonsToComplete: Array<{ courseId: string; lessonId: string }> = [];
    for (const [index, program] of arabicDemoPreset.courses.entries()) {
      const course = await tx.course.create({ data: { tenantId: tenant.id, slug: program.slug, title: program.title, titleAr: program.titleAr, description: program.shortDescEn, descriptionEn: program.shortDescEn, shortDesc: program.shortDesc, shortDescEn: program.shortDescEn, level: index < 2 ? 'Beginner' : 'Guided practice', imageUrl: `/academy/${program.slug}.svg`, isPublished: true, price: 0, createdById: teacher.id, order: index } });
      await tx.enrollment.create({ data: { tenantId: tenant.id, userId: student.id, studentMembershipId: studentMembership.id, courseId: course.id } });
      for (const [moduleIndex, title] of academyDemoModules[program.slug].entries()) {
        const courseModule = await tx.courseModule.create({ data: { courseId: course.id, title, sortOrder: moduleIndex, isPublished: true } });
        for (let lessonIndex = 0; lessonIndex < 5; lessonIndex++) {
          const order = moduleIndex * 5 + lessonIndex;
          const lesson = await tx.lesson.create({ data: { courseId: course.id, moduleId: courseModule.id, title: `${title} — ${['Introduction', 'Listen and notice', 'Guided practice', 'Independent practice', 'Review together'][lessonIndex]}`, slug: `lesson-${order + 1}`, order, content: `<p>DEMO learning material. Work with your teacher on ${title.toLowerCase()}. Read, practise, and bring your questions to your next lesson.</p>`, duration: 10, playbackLimitEnabled: false } });
          if (order < (index === 1 ? 17 : index === 0 ? 10 : 0)) lessonsToComplete.push({ courseId: course.id, lessonId: lesson.id });
        }
      }
      const assignment = await tx.assignment.create({ data: { tenantId: tenant.id, courseId: course.id, createdByMembershipId: teacherMembership.id, title: `${program.title} — weekly practice`, description: 'DEMO: Practise the material from your current module and share your questions with your teacher.', isPublished: true } });
      if (index === 1) await tx.assignmentSubmission.create({ data: { tenantId: tenant.id, assignmentId: assignment.id, studentMembershipId: studentMembership.id, textContent: 'DEMO practice submission', status: 'REVIEWED', grade: 85, feedback: 'DEMO teacher feedback: Your short vowels are clearer. Keep practising letter connections slowly before increasing your pace.', reviewedByMembershipId: teacherMembership.id, reviewedAt: new Date() } });
      const quiz = await tx.quiz.create({ data: { courseId: course.id, title: `${program.title} — foundations check`, isPublished: true, questions: { create: { type: 'MCQ', questionText: 'Which habit supports steady learning?', options: { create: [{ text: 'Regular practice and revision', isCorrect: true }, { text: 'Skipping revision', isCorrect: false }] } } } } });
      if (index === 1) await tx.quizAttempt.create({ data: { tenantId: tenant.id, userId: student.id, studentMembershipId: studentMembership.id, quizId: quiz.id, score: 1, totalQuestions: 1, submittedAt: new Date() } });
      if (index === 1) await tx.liveStream.create({ data: { tenantId: tenant.id, courseId: course.id, title: 'DEMO · Guided Quran reading with Ustadha Maryam', provider: 'external', meetingUrl: 'https://example.invalid/demo-lesson', scheduledAt: new Date(Date.now() + 86400000), description: 'DEMO only. Replace the meeting URL before a real lesson.' } });
    }
    await tx.notification.create({ data: { tenantId: tenant.id, recipientMembershipId: studentMembership.id, kind: 'SYSTEM', title: 'Welcome to your demo academy', message: 'DEMO: Explore your programs, teacher feedback and learning progress.' } });
    return { tenant, student, studentMembership, lessonsToComplete };
  }, { timeout: 60000 });
  for (const item of result.lessonsToComplete) await recordLessonProgressForTenant({ tenantId: result.tenant.id, ...item, actor: { tenantSlug: slug, hostname: 'demo.localhost', domainKind: 'DEVELOPMENT', tenantId: result.tenant.id, userId: result.student.id, membershipId: result.studentMembership.id, role: 'STUDENT' }, positionSeconds: 600, markCompleted: true });
  console.log(`Created DRAFT demo tenant: ${slug}. Preview and publish through Platform Admin. Student: sarah@arabic-quran-demo.example.invalid. ${process.env.NEXACLASS_DEMO_PASSWORD ? 'Uses the supplied demo password.' : 'Login disabled in practice by a random undisclosed password; use the existing password reset flow.'}`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Demo seed failed'); process.exitCode = 1; }).finally(() => prisma.$disconnect());




