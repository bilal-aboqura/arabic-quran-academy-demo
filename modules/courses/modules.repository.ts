import { prisma } from "@/lib/prisma";
import { canManageCourse } from "@/modules/tenants/authorization";
import type { TenantActor } from "@/modules/tenants/types";

/**
 * Course sections are deliberately managed independently of the legacy course
 * edit form. This keeps every existing lesson and quiz ID stable while the
 * editor is migrated to a section-aware tree.
 */
type ContentKind = "LESSON" | "QUIZ";

type ModuleWrite = {
  title: string;
  description?: string | null;
  isPublished?: boolean;
  sortOrder?: number;
};

function courseWhere(tenantId: string, courseId: string, actor: TenantActor) {
  return actor.role === "TEACHER"
    ? { id: courseId, tenantId, createdById: actor.userId }
    : { id: courseId, tenantId };
}

function assertCourseManager(actor: TenantActor) {
  if (!canManageCourse(actor)) throw new Error("FORBIDDEN");
}

async function findManagedCourse(tenantId: string, courseId: string, actor: TenantActor) {
  assertCourseManager(actor);
  return prisma.course.findFirst({ where: courseWhere(tenantId, courseId, actor), select: { id: true } });
}

/** Tenant-safe module listing for the course-builder. */
export async function listCourseModulesForTenant(args: { tenantId: string; courseId: string; actor: TenantActor }) {
  const course = await findManagedCourse(args.tenantId, args.courseId, args.actor);
  if (!course) return null;
  return prisma.courseModule.findMany({
    where: { courseId: course.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      lessons: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      quizzes: { orderBy: [{ order: "asc" }, { createdAt: "asc" }], include: { _count: { select: { questions: true } } } },
    },
  });
}

export async function createCourseModuleForTenant(args: {
  tenantId: string;
  courseId: string;
  actor: TenantActor;
  input: ModuleWrite;
}) {
  const course = await findManagedCourse(args.tenantId, args.courseId, args.actor);
  if (!course) return null;

  return prisma.$transaction(async (tx) => {
    const last = args.input.sortOrder === undefined
      ? await tx.courseModule.findFirst({ where: { courseId: course.id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } })
      : null;
    return tx.courseModule.create({
      data: {
        courseId: course.id,
        title: args.input.title.trim(),
        description: args.input.description ?? null,
        isPublished: args.input.isPublished ?? false,
        sortOrder: args.input.sortOrder ?? (last ? last.sortOrder + 1 : 0),
      },
    });
  });
}

export async function updateCourseModuleForTenant(args: {
  tenantId: string;
  courseId: string;
  moduleId: string;
  actor: TenantActor;
  input: Partial<ModuleWrite>;
}) {
  const course = await findManagedCourse(args.tenantId, args.courseId, args.actor);
  if (!course) return null;
  const courseModule = await prisma.courseModule.findFirst({ where: { id: args.moduleId, courseId: course.id }, select: { id: true } });
  if (!courseModule) return null;
  return prisma.courseModule.update({
    where: { id: courseModule.id },
    data: {
      ...(args.input.title === undefined ? {} : { title: args.input.title.trim() }),
      ...(args.input.description === undefined ? {} : { description: args.input.description }),
      ...(args.input.isPublished === undefined ? {} : { isPublished: args.input.isPublished }),
      ...(args.input.sortOrder === undefined ? {} : { sortOrder: args.input.sortOrder }),
    },
  });
}

/** Deletion un-groups contents (onDelete:SetNull); it never recreates them. */
export async function deleteCourseModuleForTenant(args: {
  tenantId: string;
  courseId: string;
  moduleId: string;
  actor: TenantActor;
}) {
  const course = await findManagedCourse(args.tenantId, args.courseId, args.actor);
  if (!course) return false;
  const courseModule = await prisma.courseModule.findFirst({ where: { id: args.moduleId, courseId: course.id }, select: { id: true } });
  if (!courseModule) return false;
  await prisma.courseModule.delete({ where: { id: courseModule.id } });
  return true;
}

/**
 * Reorder requires the complete current module set. Rejecting partial sets
 * prevents a stale browser from silently dropping sections during drag/drop.
 */
export async function reorderCourseModulesForTenant(args: {
  tenantId: string;
  courseId: string;
  actor: TenantActor;
  moduleIds: string[];
}) {
  const course = await findManagedCourse(args.tenantId, args.courseId, args.actor);
  if (!course) return { error: "NOT_FOUND" as const };
  if (new Set(args.moduleIds).size !== args.moduleIds.length) return { error: "INVALID_MODULE_SET" as const };

  const modules = await prisma.courseModule.findMany({ where: { courseId: course.id }, select: { id: true } });
  if (modules.length !== args.moduleIds.length || modules.some((module) => !args.moduleIds.includes(module.id))) {
    return { error: "INVALID_MODULE_SET" as const };
  }
  await prisma.$transaction(args.moduleIds.map((id, sortOrder) => prisma.courseModule.update({ where: { id }, data: { sortOrder } })));
  return { ok: true as const };
}

async function findContentInCourse(args: {
  tenantId: string;
  courseId: string;
  contentId: string;
  kind: ContentKind;
}) {
  const where = { id: args.contentId, courseId: args.courseId, course: { tenantId: args.tenantId } };
  return args.kind === "LESSON"
    ? prisma.lesson.findFirst({ where, select: { id: true } })
    : prisma.quiz.findFirst({ where, select: { id: true } });
}

/** Moves a stable lesson/quiz record into a section; no content is recreated. */
export async function moveCourseContentForTenant(args: {
  tenantId: string;
  courseId: string;
  actor: TenantActor;
  kind: ContentKind;
  contentId: string;
  moduleId: string | null;
  order: number;
}) {
  const course = await findManagedCourse(args.tenantId, args.courseId, args.actor);
  if (!course) return { error: "NOT_FOUND" as const };
  const content = await findContentInCourse(args);
  if (!content) return { error: "CONTENT_NOT_FOUND" as const };
  if (args.moduleId) {
    const destination = await prisma.courseModule.findFirst({ where: { id: args.moduleId, courseId: course.id }, select: { id: true } });
    if (!destination) return { error: "MODULE_NOT_FOUND" as const };
  }
  const data = { moduleId: args.moduleId, order: args.order };
  if (args.kind === "LESSON") await prisma.lesson.update({ where: { id: content.id }, data });
  else await prisma.quiz.update({ where: { id: content.id }, data });
  return { ok: true as const };
}

/**
 * Atomically places an ordered list of existing content in a module. Every
 * item is verified against the tenant-owned course before updates begin.
 */
export async function reorderCourseModuleContentForTenant(args: {
  tenantId: string;
  courseId: string;
  actor: TenantActor;
  moduleId: string | null;
  items: Array<{ kind: ContentKind; id: string }>;
}) {
  const course = await findManagedCourse(args.tenantId, args.courseId, args.actor);
  if (!course) return { error: "NOT_FOUND" as const };
  const itemKeys = args.items.map((item) => `${item.kind}:${item.id}`);
  if (new Set(itemKeys).size !== itemKeys.length) return { error: "INVALID_CONTENT_SET" as const };
  if (args.moduleId) {
    const courseModule = await prisma.courseModule.findFirst({ where: { id: args.moduleId, courseId: course.id }, select: { id: true } });
    if (!courseModule) return { error: "MODULE_NOT_FOUND" as const };
  }
  const found = await Promise.all(args.items.map((item) => findContentInCourse({ ...args, contentId: item.id, kind: item.kind })));
  if (found.some((item) => !item)) return { error: "CONTENT_NOT_FOUND" as const };

  await prisma.$transaction(args.items.map((item, order) => item.kind === "LESSON"
    ? prisma.lesson.update({ where: { id: item.id }, data: { moduleId: args.moduleId, order } })
    : prisma.quiz.update({ where: { id: item.id }, data: { moduleId: args.moduleId, order } }),
  ));
  return { ok: true as const };
}
