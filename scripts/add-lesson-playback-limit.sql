-- Optional manual migration for existing databases.
-- The application also creates these objects lazily on first use.
ALTER TABLE "Lesson"
  ADD COLUMN IF NOT EXISTS playback_limit_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Lesson"
  ADD COLUMN IF NOT EXISTS playback_required_minutes INTEGER NOT NULL DEFAULT 15;

ALTER TABLE "Lesson"
  ADD COLUMN IF NOT EXISTS playback_max_attempts INTEGER NOT NULL DEFAULT 3;

UPDATE "Lesson" SET playback_limit_enabled = true WHERE playback_limit_enabled = false;

CREATE TABLE IF NOT EXISTS "LessonPlaybackAttempt" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES "Lesson"(id) ON DELETE CASCADE,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  is_playing BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  counted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "LessonPlaybackAttempt_user_lesson_idx"
  ON "LessonPlaybackAttempt"(user_id, lesson_id);

CREATE INDEX IF NOT EXISTS "LessonPlaybackAttempt_active_idx"
  ON "LessonPlaybackAttempt"(user_id, lesson_id, counted_at);
