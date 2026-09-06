import { prisma } from "@/lib/prisma";
import { AssignmentSubmissionStatus, type Prisma } from "@prisma/client";
import { getTenantCourseContentAccess } from "@/modules/courses/repository";
import { isTenantObjectKeyForActor } from "@/modules/storage/tenant-storage";
import { canManageCourse, canReviewAssignments } from "@/modules/tenants/authorization";
import type { TenantActor, TenantRole } from "@/modules/tenants/types";

type AssignmentWriteInput = {
  title: string;
  description?: string | null;
  deadline?: Date | null;
  maxGrade?: number;
  isPublished?: boolean;
  moduleId?: string | null;
  order?: number;
};

type AttachmentInput = { storageKey: string; fileName?: string | null };

function courseWhere(tenantId: string, courseId: string, actor: TenantActor) {
  return actor.role === "TEACHER"
    ? { id: courseId, tenantId, createdById: actor.userId }
    : { id: courseId, tenantId };
}

async function requireActiveMembership(args: { tenantId: string; actor: TenantActor; roles: readonly TenantRole[] }) {
  if (!args.roles.includes(args.actor.role)) return null;
  return prisma.tenantMembership.findFirst({
    where: {
      id: args.actor.membershipId,
      tenantId: args.tenantId,
      userId: args.actor.userId,
      role: args.actor.role,
      status: "ACTIVE",
    },
    select: { id: true },
  });
}

async function findManagedCourse(args: { tenantId: string; courseId: string; actor: TenantActor }) {
  if (!canManageCourse(args.actor)) return null;
  const membership = await requireActiveMembership({
    ...args,
    roles: ["OWNER", "ADMIN", "ASSISTANT", "TEACHER"],
  });
  if (!membership) return null;
  const course = await prisma.course.findFirst({ where: courseWhere(args.tenantId, args.courseId, args.actor), select: { id: true } });
  return course ? { course, membership } : null;
}

async function assertModuleInCourse(args: { courseId: string; moduleId: string | null | undefined }) {
  if (!args.moduleId) return true;
  const courseModule = await prisma.courseModule.findFirst({ where: { id: args.moduleId, courseId: args.courseId }, select: { id: true } });
  return Boolean(courseModule);
}

function validateAssignmentInput(input: AssignmentWriteInput) {
  if (input.title !== undefined && !input.title.trim()) throw new Error("ASSIGNMENT_TITLE_REQUIRED");
  if (input.maxGrade !== undefined && (!Number.isInteger(input.maxGrade) || input.maxGrade < 1 || input.maxGrade > 10_000)) {
    throw new Error("INVALID_MAX_GRADE");
  }
}

function sanitizeAttachments(tenantId: string, files: AttachmentInput[] | undefined): Prisma.JsonArray {
  if (!files?.length) return [];
  if (files.length > 20) throw new Error("TOO_MANY_FILES");
  return files.map((file) => {
    if (typeof file.storageKey !== "string" || !isTenantObjectKeyForActor({ tenantId, kind: "assignments", key: file.storageKey })) {
      throw new Error("INVALID_ASSIGNMENT_FILE_KEY");
    }
    return {
      storageKey: file.storageKey,
      ...(typeof file.fileName === "string" && file.fileName.trim() ? { fileName: file.fileName.trim().slice(0, 255) } : {}),
    };
  });
}

export async function createAssignmentForTenant(args: { tenantId: string; courseId: string; actor: TenantActor; input: AssignmentWriteInput }) {
  validateAssignmentInput(args.input);
  const managed = await findManagedCourse(args);
  if (!managed || !(await assertModuleInCourse({ courseId: args.courseId, moduleId: args.input.moduleId }))) return null;
  const last = args.input.order === undefined
    ? await prisma.assignment.findFirst({ where: { tenantId: args.tenantId, courseId: args.courseId }, select: { order: true }, orderBy: { order: "desc" } })
    : null;
  return prisma.assignment.create({
    data: {
      tenantId: args.tenantId,
      courseId: args.courseId,
      moduleId: args.input.moduleId ?? null,
      createdByMembershipId: managed.membership.id,
      title: args.input.title.trim(),
      description: args.input.description ?? "",
      deadline: args.input.deadline ?? null,
      maxGrade: args.input.maxGrade ?? 100,
      isPublished: args.input.isPublished ?? false,
      order: args.input.order ?? (last ? last.order + 1 : 0),
    },
  });
}

export async function updateAssignmentForTenant(args: { tenantId: string; courseId: string; assignmentId: string; actor: TenantActor; input: Partial<AssignmentWriteInput> }) {
  validateAssignmentInput(args.input as AssignmentWriteInput);
  const managed = await findManagedCourse(args);
  if (!managed || !(await assertModuleInCourse({ courseId: args.courseId, moduleId: args.input.moduleId }))) return null;
  const assignment = await prisma.assignment.findFirst({
    where: { id: args.assignmentId, tenantId: args.tenantId, courseId: args.courseId }, select: { id: true },
  });
  if (!assignment) return null;
  return prisma.assignment.update({
    where: { id: assignment.id },
    data: {
      ...(args.input.title === undefined ? {} : { title: args.input.title.trim() }),
      ...(args.input.description === undefined ? {} : { description: args.input.description ?? "" }),
      ...(args.input.deadline === undefined ? {} : { deadline: args.input.deadline }),
      ...(args.input.maxGrade === undefined ? {} : { maxGrade: args.input.maxGrade }),
      ...(args.input.isPublished === undefined ? {} : { isPublished: args.input.isPublished }),
      ...(args.input.moduleId === undefined
        ? {}
        : { module: args.input.moduleId ? { connect: { id: args.input.moduleId } } : { disconnect: true } }),
      ...(args.input.order === undefined ? {} : { order: args.input.order }),
    },
  });
}

export async function deleteAssignmentForTenant(args: { tenantId: string; courseId: string; assignmentId: string; actor: TenantActor }) {
  const managed = await findManagedCourse(args);
  if (!managed) return false;
  const assignment = await prisma.assignment.findFirst({ where: { id: args.assignmentId, tenantId: args.tenantId, courseId: args.courseId }, select: { id: true } });
  if (!assignment) return false;
  await prisma.assignment.delete({ where: { id: assignment.id } });
  return true;
}

export async function listManagedAssignmentsForTenant(args: { tenantId: string; courseId: string; actor: TenantActor }) {
  const managed = await findManagedCourse(args);
  if (!managed) return null;
  return prisma.assignment.findMany({
    where: { tenantId: args.tenantId, courseId: args.courseId },
    include: { module: { select: { id: true, title: true, sortOrder: true } }, _count: { select: { submissions: true } } },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

async function findAccessibleAssignment(args: { tenantId: string; assignmentId: string; actor: TenantActor }) {
  const membership = await requireActiveMembership({ ...args, roles: ["STUDENT"] });
  if (!membership) return { error: "FORBIDDEN" as const };
  const assignment = await prisma.assignment.findFirst({
    where: { id: args.assignmentId, tenantId: args.tenantId, isPublished: true, course: { tenantId: args.tenantId, isPublished: true } },
    include: { course: { select: { id: true, tenantId: true, createdById: true, price: true } } },
  });
  if (!assignment) return { error: "NOT_FOUND" as const };
  const access = await getTenantCourseContentAccess(args.tenantId, assignment.course, args.actor);
  if (access.mode === "none") return { error: "FORBIDDEN" as const };
  return { assignment, membershipId: membership.id };
}

export async function submitAssignmentForTenant(args: {
  tenantId: string;
  assignmentId: string;
  actor: TenantActor;
  textContent?: string | null;
  files?: AttachmentInput[];
}) {
  const subject = await findAccessibleAssignment(args);
  if ("error" in subject) return subject;
  const existing = await prisma.assignmentSubmission.findFirst({
    where: { tenantId: args.tenantId, assignmentId: subject.assignment.id, studentMembershipId: subject.membershipId },
    select: { id: true, status: true },
  });
  if (existing?.status === "REVIEWED") return { error: "ALREADY_REVIEWED" as const };
  const submittedAt = new Date();
  const status: AssignmentSubmissionStatus = subject.assignment.deadline && submittedAt > subject.assignment.deadline
    ? AssignmentSubmissionStatus.LATE
    : AssignmentSubmissionStatus.SUBMITTED;
  const data = {
    textContent: args.textContent?.slice(0, 50_000) || null,
    files: sanitizeAttachments(args.tenantId, args.files),
    submittedAt,
    status,
  };
  const submission = existing
    ? await prisma.assignmentSubmission.update({ where: { id: existing.id }, data })
    : await prisma.assignmentSubmission.create({
        data: { tenantId: args.tenantId, assignmentId: subject.assignment.id, studentMembershipId: subject.membershipId, ...data },
      });
  return { submission };
}

/**
 * Returns the assignment only after applying the exact same entitlement and
 * active-membership rules as a submission. Upload routes use this so an
 * object key can never be minted for an arbitrary tenant or assignment.
 */
export async function getAssignmentUploadTargetForTenant(args: { tenantId: string; assignmentId: string; actor: TenantActor }) {
  const subject = await findAccessibleAssignment(args);
  if ("error" in subject) return null;
  return { assignmentId: subject.assignment.id, membershipId: subject.membershipId };
}

export async function listAssignmentsForStudentTenant(args: { tenantId: string; actor: TenantActor }) {
  const membership = await requireActiveMembership({ ...args, roles: ["STUDENT"] });
  if (!membership) return [];
  const assignments = await prisma.assignment.findMany({
    where: { tenantId: args.tenantId, isPublished: true, course: { tenantId: args.tenantId, isPublished: true } },
    include: {
      course: { select: { id: true, tenantId: true, createdById: true, price: true, slug: true, title: true, titleAr: true } },
      module: { select: { id: true, title: true, sortOrder: true } },
      submissions: { where: { tenantId: args.tenantId, studentMembershipId: membership.id }, take: 1 },
    },
    orderBy: [{ deadline: "asc" }, { order: "asc" }],
  });
  const accessible = await Promise.all(assignments.map(async (assignment) => {
    const access = await getTenantCourseContentAccess(args.tenantId, assignment.course, args.actor);
    if (access.mode === "none") return null;
    const submission = assignment.submissions[0] ?? null;
    return { ...assignment, submission, status: submission?.status ?? "NOT_SUBMITTED" as const };
  }));
  return accessible.filter((assignment): assignment is NonNullable<typeof assignment> => assignment !== null);
}

async function findReviewableAssignment(args: { tenantId: string; assignmentId: string; actor: TenantActor }) {
  if (!canReviewAssignments(args.actor)) return null;
  const membership = await requireActiveMembership({ ...args, roles: ["OWNER", "ADMIN", "ASSISTANT", "TEACHER"] });
  if (!membership) return null;
  const assignment = await prisma.assignment.findFirst({
    where: args.actor.role === "TEACHER"
      ? { id: args.assignmentId, tenantId: args.tenantId, course: { tenantId: args.tenantId, createdById: args.actor.userId } }
      : { id: args.assignmentId, tenantId: args.tenantId, course: { tenantId: args.tenantId } },
    select: { id: true, maxGrade: true },
  });
  return assignment ? { assignment, reviewerMembershipId: membership.id } : null;
}

export async function listAssignmentSubmissionsForTenant(args: { tenantId: string; assignmentId: string; actor: TenantActor }) {
  const reviewable = await findReviewableAssignment(args);
  if (!reviewable) return null;
  return prisma.assignmentSubmission.findMany({
    where: { tenantId: args.tenantId, assignmentId: reviewable.assignment.id },
    include: { studentMembership: { select: { id: true, displayName: true, user: { select: { id: true, name: true, email: true } } } } },
    orderBy: { submittedAt: "desc" },
  });
}

export async function gradeAssignmentSubmissionForTenant(args: {
  tenantId: string;
  assignmentId: string;
  submissionId: string;
  actor: TenantActor;
  grade: number;
  feedback?: string | null;
}) {
  const reviewable = await findReviewableAssignment(args);
  if (!reviewable) return { error: "FORBIDDEN" as const };
  if (!Number.isFinite(args.grade) || args.grade < 0 || args.grade > reviewable.assignment.maxGrade) return { error: "INVALID_GRADE" as const };
  const submission = await prisma.assignmentSubmission.findFirst({
    where: { id: args.submissionId, tenantId: args.tenantId, assignmentId: reviewable.assignment.id }, select: { id: true },
  });
  if (!submission) return { error: "NOT_FOUND" as const };
  const reviewedAt = new Date();
  return {
    submission: await prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: { status: "REVIEWED", grade: args.grade, feedback: args.feedback?.slice(0, 50_000) || null, reviewedAt, reviewedByMembershipId: reviewable.reviewerMembershipId },
    }),
  };
}

export async function getAssignmentSubmissionFileForTenant(args: {
  tenantId: string;
  assignmentId: string;
  submissionId: string;
  storageKey: string;
  actor: TenantActor;
}) {
  const submission = await prisma.assignmentSubmission.findFirst({
    where: { id: args.submissionId, tenantId: args.tenantId, assignmentId: args.assignmentId },
    select: { files: true, studentMembershipId: true },
  });
  if (!submission) return null;

  if (args.actor.role === "STUDENT") {
    const membership = await requireActiveMembership({ ...args, roles: ["STUDENT"] });
    if (!membership || membership.id !== submission.studentMembershipId) return null;
  } else if (!(await findReviewableAssignment(args))) {
    return null;
  }

  const files = Array.isArray(submission.files) ? submission.files : [];
  const file = files.find((value): value is { storageKey: string; fileName?: string } =>
    !!value && typeof value === "object" && !Array.isArray(value) &&
    "storageKey" in value && typeof value.storageKey === "string" && value.storageKey === args.storageKey,
  );
  if (!file || !file.storageKey.startsWith(`tenants/${args.tenantId}/`)) return null;
  return file;
}
