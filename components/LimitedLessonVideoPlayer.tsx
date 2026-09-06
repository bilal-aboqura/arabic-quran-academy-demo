"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "./LocaleProvider";
import { PlyrVideoPlayer } from "./plyr-video-player";
import type { VideoCopyrightOverlayProps } from "./video-copyright-overlay";

type PlaybackState = {
  enabled: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  requiredSeconds: number;
  activeAttemptId: string | null;
  watchedSeconds: number;
};

type Props = {
  lessonId: string;
  youtubeVideoId: string;
  storageKey: string;
  initialState: PlaybackState;
  copyrightOverlay?: VideoCopyrightOverlayProps;
};

function formatMinutes(seconds: number) {
  return Math.floor(Math.max(0, seconds) / 60);
}

export function LimitedLessonVideoPlayer({
  lessonId,
  youtubeVideoId,
  storageKey,
  initialState,
  copyrightOverlay,
}: Props) {
  const t = useT();
  const [state, setState] = useState(initialState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState("");
  const attemptIdRef = useRef(initialState.activeAttemptId);
  const pauseRef = useRef<(() => void) | null>(null);
  const heartbeatInFlightRef = useRef(false);
  const allowNextPlayRef = useRef(false);

  const applyState = useCallback((next: PlaybackState) => {
    setState(next);
    attemptIdRef.current = next.activeAttemptId;
    if (next.attemptsUsed >= next.maxAttempts && !next.activeAttemptId) {
      pauseRef.current?.();
      setIsPlaying(false);
    }
  }, []);

  const sendHeartbeat = useCallback(async (playing: boolean) => {
    const attemptId = attemptIdRef.current;
    if (!attemptId || heartbeatInFlightRef.current) return;
    heartbeatInFlightRef.current = true;
    try {
      const response = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}/playback/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, playing }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data && typeof data === "object") {
        applyState(data as PlaybackState);
        if ((data as PlaybackState).attemptsUsed >= (data as PlaybackState).maxAttempts && !(data as PlaybackState).activeAttemptId) {
          setError(t("video.playbackLimitReached", "You have used all plays for this lesson."));
        }
      }
    } finally {
      heartbeatInFlightRef.current = false;
    }
  }, [applyState, lessonId, t]);

  useEffect(() => {
    if (!isPlaying || !attemptIdRef.current) return;
    const timer = window.setInterval(() => {
      void sendHeartbeat(true);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [isPlaying, sendHeartbeat]);

  const startPlayback = useCallback(async (play: () => void) => {
    if (!attemptIdRef.current && state.attemptsUsed >= state.maxAttempts) {
      setError(t("video.playbackLimitReached", "You have used all plays for this lesson."));
      return;
    }

    setError("");
    const response = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}/playback/start`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? t("video.playbackStartFailed", "Unable to start this lesson."));
      return;
    }
    const next = data as PlaybackState;
    applyState(next);
    if (next.activeAttemptId) {
      setIsPlaying(true);
      allowNextPlayRef.current = true;
      play();
    }
  }, [applyState, lessonId, state.attemptsUsed, state.maxAttempts, t]);

  const watchedPercent = Math.min(100, (state.watchedSeconds / state.requiredSeconds) * 100);
  const exhausted = state.attemptsUsed >= state.maxAttempts && !state.activeAttemptId;

  return (
    <div>
      {!exhausted ? (
        <PlyrVideoPlayer
          key={`${lessonId}-${youtubeVideoId}`}
          youtubeVideoId={youtubeVideoId}
          storageKey={storageKey}
          className="w-full"
          copyrightOverlay={copyrightOverlay}
          onPlay={({ pause, play }) => {
            pauseRef.current = pause;
            if (allowNextPlayRef.current) {
              allowNextPlayRef.current = false;
              setIsPlaying(true);
              return;
            }
            pause();
            void startPlayback(play);
          }}
          onPause={() => {
            setIsPlaying(false);
            void sendHeartbeat(false);
          }}
        />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-[var(--radius-card)] bg-black px-6 text-center text-white">
          {t("video.playbackLimitReached", "You have used all plays for this lesson.")}
        </div>
      )}

      <div className="mt-3 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-muted)]">
        <div className="flex flex-wrap justify-between gap-2">
          <span>{t("video.playbackAttempts", "Completed plays")}: {state.attemptsUsed}/{state.maxAttempts}</span>
          {state.activeAttemptId && (
            <span>{t("video.playbackProgress", "Current play")}: {formatMinutes(state.watchedSeconds)}/{formatMinutes(state.requiredSeconds)} {t("video.playbackMinutes", "minutes")}</span>
          )}
        </div>
        {state.activeAttemptId && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width]" style={{ width: `${watchedPercent}%` }} />
          </div>
        )}
        {error && <p className="mt-2 text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
