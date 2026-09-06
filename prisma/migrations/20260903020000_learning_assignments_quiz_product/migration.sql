-- NexaClass V1 learning, assignments, and per-quiz product settings.
-- Additive migration: existing flat course content remains valid until a
-- teacher moves it into an optional CourseModule through stable CRUD APIs.

DO $$ BEGIN
  CREATE TYPE "AssignmentSubmissionStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'LATE', 'REVIEWED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE "CourseModule" (
  "id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_published" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CourseModule_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CourseModule_course_id_sort_order_idx" ON "CourseModule"("course_id", "sort_order");

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "module_id" TEXT;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "module_id" TEXT;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "max_attempts" INTEGER;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "passing_score" INTEGER;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "is_published" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "available_from" TIMESTAMP(3);
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "available_until" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Lesson_module_id_order_idx" ON "Lesson"("module_id", "order");
CREATE INDEX IF NOT EXISTS "Quiz_module_id_order_idx" ON "Quiz"("module_id", "order");
CREATE INDEX IF NOT EXISTS "Quiz_is_published_available_from_available_until_idx" ON "Quiz"("is_published", "available_from", "available_until");
DO $$ BEGIN ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE "LessonProgress" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "student_membership_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "lesson_id" TEXT NOT NULL,
  "position_seconds" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "last_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LessonProgress_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LessonProgress_student_membership_id_fkey" FOREIGN KEY ("student_membership_id") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LessonProgress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LessonProgress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LessonProgress_tenant_id_student_membership_id_lesson_id_key" ON "LessonProgress"("tenant_id", "student_membership_id", "lesson_id");
CREATE INDEX "LessonProgress_tenant_id_student_membership_id_course_id_last_viewed_at_idx" ON "LessonProgress"("tenant_id", "student_membership_id", "course_id", "last_viewed_at" DESC);

CREATE TABLE "CourseProgress" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "student_membership_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "completed_lessons" INTEGER NOT NULL DEFAULT 0,
  "total_lessons" INTEGER NOT NULL DEFAULT 0,
  "progress_percent" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "last_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CourseProgress_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CourseProgress_student_membership_id_fkey" FOREIGN KEY ("student_membership_id") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CourseProgress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CourseProgress_tenant_id_student_membership_id_course_id_key" ON "CourseProgress"("tenant_id", "student_membership_id", "course_id");
CREATE INDEX "CourseProgress_tenant_id_student_membership_id_last_viewed_at_idx" ON "CourseProgress"("tenant_id", "student_membership_id", "last_viewed_at" DESC);

CREATE TABLE "Assignment" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "module_id" TEXT,
  "created_by_membership_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "deadline" TIMESTAMP(3),
  "max_grade" INTEGER NOT NULL DEFAULT 100,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Assignment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Assignment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Assignment_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Assignment_created_by_membership_id_fkey" FOREIGN KEY ("created_by_membership_id") REFERENCES "TenantMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Assignment_tenant_id_course_id_is_published_order_idx" ON "Assignment"("tenant_id", "course_id", "is_published", "order");

CREATE TABLE "AssignmentSubmission" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "assignment_id" TEXT NOT NULL,
  "student_membership_id" TEXT NOT NULL,
  "text_content" TEXT,
  "files" JSONB,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "AssignmentSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
  "grade" DECIMAL(7,2),
  "feedback" TEXT,
  "reviewed_by_membership_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssignmentSubmission_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssignmentSubmission_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssignmentSubmission_student_membership_id_fkey" FOREIGN KEY ("student_membership_id") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssignmentSubmission_reviewed_by_membership_id_fkey" FOREIGN KEY ("reviewed_by_membership_id") REFERENCES "TenantMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AssignmentSubmission_tenant_id_assignment_id_student_membership_id_key" ON "AssignmentSubmission"("tenant_id", "assignment_id", "student_membership_id");
CREATE INDEX "AssignmentSubmission_tenant_id_student_membership_id_status_submitted_at_idx" ON "AssignmentSubmission"("tenant_id", "student_membership_id", "status", "submitted_at" DESC);
