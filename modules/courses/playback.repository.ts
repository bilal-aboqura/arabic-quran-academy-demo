import { prisma } from "@/lib/prisma";

export type TenantLessonPlaybackState = {
  enabled: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  requiredMinutes: number;
  requiredSeconds: number;
  activeAttemptId: string | null;
  watchedSeconds: number;
};

type PlaybackLesson = {
  id: string;
  playbackLimitEnabled: boolean;
  playbackRequiredMinutes: number;
  playbackMaxAttempts: number;
};

function stateFrom(args: {
  lesson: PlaybackLesson;
  attemptsUsed: number;
  active: { id: string; watchedSeconds: number } | null;
}): TenantLessonPlaybackState {
  const requiredMinutes = Math.max(1, args.lesson.playbackRequiredMinutes);
  return {
    enabled: args.lesson.playbackLimitEnabled,
    attemptsUsed: args.attemptsUsed,
    maxAttempts: Math.max(1, args.lesson.playbackMaxAttempts),
    requiredMinutes,
    requiredSeconds: requiredMinutes * 60,
    activeAttemptId: args.active?.id ?? null,
    watchedSeconds: args.active?.watchedSeconds ?? 0,
  };
}

/**
 * All reads and writes require both tenant and identity. A lesson ID is never
 * sufficient authority, even after a route has resolved the lesson once.
 */
export async function getPlaybackStateForTenant(args: {
  tenantId: string;
  userId: string;
  lesson: PlaybackLesson;
}): Promise<TenantLessonPlaybackState> {
  const [attemptsUsed, active] = await Promise.all([
    prisma.lessonPlaybackAttempt.count({
      where: { tenantId: args.tenantId, userId: args.userId, lessonId: args.lesson.id, countedAt: { not: null } },
    }),
    prisma.lessonPlaybackAttempt.findFirst({
      where: { tenantId: args.tenantId, userId: args.userId, lessonId: args.lesson.id, countedAt: null },
      select: { id: true, watchedSeconds: true },
      orderBy: { startedAt: "desc" },
    }),
  ]);
  return stateFrom({ lesson: args.lesson, attemptsUsed, active });
}

export async function startPlaybackForTenant(args: {
  tenantId: string;
  userId: string;
  lesson: PlaybackLesson;
}): Promise<TenantLessonPlaybackState> {
  return prisma.$transaction(async (tx) => {
    const [attemptsUsed, active] = await Promise.all([
      tx.lessonPlaybackAttempt.count({
        where: { tenantId: args.tenantId, userId: args.userId, lessonId: args.lesson.id, countedAt: { not: null } },
      }),
      tx.lessonPlaybackAttempt.findFirst({
        where: { tenantId: args.tenantId, userId: args.userId, lessonId: args.lesson.id, countedAt: null },
        select: { id: true, watchedSeconds: true },
        orderBy: { startedAt: "desc" },
      }),
    ]);
    const current = stateFrom({ lesson: args.lesson, attemptsUsed, active });
    if (!current.enabled || current.attemptsUsed >= current.maxAttempts) return current;
    const nextActive = active
      ? await tx.lessonPlaybackAttempt.update({
          where: { id: active.id },
          data: { isPlaying: true, lastHeartbeatAt: new Date() },
          select: { id: true, watchedSeconds: true },
        })
      : await tx.lessonPlaybackAttempt.create({
          data: { tenantId: args.tenantId, userId: args.userId, lessonId: args.lesson.id, isPlaying: true },
          select: { id: true, watchedSeconds: true },
        });
    return stateFrom({ lesson: args.lesson, attemptsUsed, active: nextActive });
  });
}

export async function heartbeatPlaybackForTenant(args: {
  tenantId: string;
  userId: string;
  lesson: PlaybackLesson;
  attemptId: string;
  playing: boolean;
}): Promise<TenantLessonPlaybackState> {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.lessonPlaybackAttempt.findFirst({
      where: {
        id: args.attemptId,
        tenantId: args.tenantId,
        userId: args.userId,
        lessonId: args.lesson.id,
        countedAt: null,
      },
      select: { id: true, watchedSeconds: true, isPlaying: true, lastHeartbeatAt: true },
    });
    if (!attempt) return getPlaybackStateForTenant(args);

    const elapsedSeconds = Math.max(0, Math.min(30, Math.floor((Date.now() - attempt.lastHeartbeatAt.getTime()) / 1000)));
    const watchedSeconds = Math.min(
      Math.max(1, args.lesson.playbackRequiredMinutes) * 60,
      attempt.watchedSeconds + (attempt.isPlaying ? elapsedSeconds : 0),
    );
    const completed = watchedSeconds >= Math.max(1, args.lesson.playbackRequiredMinutes) * 60;
    await tx.lessonPlaybackAttempt.update({
      where: { id: attempt.id },
      data: { watchedSeconds, isPlaying: completed ? false : args.playing, lastHeartbeatAt: new Date(), countedAt: completed ? new Date() : null },
    });
    const [attemptsUsed, active] = await Promise.all([
      tx.lessonPlaybackAttempt.count({ where: { tenantId: args.tenantId, userId: args.userId, lessonId: args.lesson.id, countedAt: { not: null } } }),
      tx.lessonPlaybackAttempt.findFirst({ where: { tenantId: args.tenantId, userId: args.userId, lessonId: args.lesson.id, countedAt: null }, select: { id: true, watchedSeconds: true }, orderBy: { startedAt: "desc" } }),
    ]);
    return stateFrom({ lesson: args.lesson, attemptsUsed, active });
  });
}

export async function getLessonRatingSummaryForTenant(args: { tenantId: string; lessonId: string; courseId: string; userId: string }) {
  const [lesson, course, own] = await Promise.all([
    prisma.lessonRating.aggregate({ where: { tenantId: args.tenantId, lessonId: args.lessonId, courseId: args.courseId }, _avg: { rating: true }, _count: { rating: true } }),
    prisma.lessonRating.aggregate({ where: { tenantId: args.tenantId, courseId: args.courseId }, _avg: { rating: true }, _count: { rating: true } }),
    prisma.lessonRating.findFirst({ where: { tenantId: args.tenantId, lessonId: args.lessonId, courseId: args.courseId, userId: args.userId }, select: { rating: true } }),
  ]);
  return { lessonId: args.lessonId, courseId: args.courseId, averageRating: lesson._avg.rating, ratingCount: lesson._count.rating, courseAverageRating: course._avg.rating, courseRatingCount: course._count.rating, userRating: own?.rating ?? null };
}

export async function upsertLessonRatingForTenant(args: { tenantId: string; lessonId: string; courseId: string; userId: string; rating: number }) {
  const existing = await prisma.lessonRating.findFirst({ where: { tenantId: args.tenantId, lessonId: args.lessonId, userId: args.userId }, select: { id: true } });
  if (existing) return prisma.lessonRating.update({ where: { id: existing.id }, data: { rating: args.rating, courseId: args.courseId } });
  return prisma.lessonRating.create({ data: args });
}
