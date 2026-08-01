"use client";

import { Button } from "@/../components/ui/button";
import { Mic, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const MAX_DURATION_MS = 120_000;
// Pins the bitrate low enough that byte size alone bounds duration server-side
// (see MAX_BYTES.audio in mediaSniff.ts) — a truthful duration is not load-bearing.
const AUDIO_BITS_PER_SECOND = 32_000;

/**
 * Chrome/Firefox and Safari support disjoint MediaRecorder mime types; try
 * each in order and let the browser tell us which one it actually supports,
 * rather than assuming.
 */
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];
let micDeniedForSession = false;

export function isVoiceRecordingSupported() {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !micDeniedForSession &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function pickMimeType(): string | undefined {
  return MIME_CANDIDATES.find(
    (candidate) => MediaRecorder.isTypeSupported?.(candidate),
  );
}

function extensionForMime(mime: string) {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Replaces the composer row while recording. Unmounting this component (via
 * cancel, send, or the parent navigating away) always stops every track —
 * forgetting that is the single most common bug in web audio recorders, since
 * a track left open keeps the browser's mic indicator lit indefinitely.
 */
export function VoiceRecorder({
  onSend,
  onCancel,
  onUnavailable,
}: {
  onSend: (file: File, durationMs: number) => void;
  onCancel: () => void;
  onUnavailable?: () => void;
}) {
  const t = useTranslations("Chat");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [ready, setReady] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>("audio/webm");
  const startedAtRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const unmountedRef = useRef(false);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopTimer = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    unmountedRef.current = false;

    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        const mimeType = pickMimeType();
        mimeRef.current = mimeType || "audio/webm";
        const recorder = mimeType
          ? new MediaRecorder(stream, {
              mimeType,
              audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
            })
          : new MediaRecorder(stream);
        recorderRef.current = recorder;
        // Some browsers only report the effective mimeType after start().
        mimeRef.current = recorder.mimeType || mimeRef.current;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        recorder.start();
        startedAtRef.current = Date.now();
        setReady(true);

        intervalRef.current = window.setInterval(() => {
          const elapsed = Date.now() - startedAtRef.current;
          setElapsedMs(elapsed);
          if (elapsed >= MAX_DURATION_MS) {
            toast.info(t("media.recordingTooLong"));
            finishAndSend();
          }
        }, 200);
      })
      .catch((error) => {
        // Browsers do not re-prompt after a hard deny in this session, so a
        // retry button would be a dead end — surface it once and back out.
        if (
          error instanceof DOMException &&
          error.name === "NotAllowedError"
        ) {
          if (!micDeniedForSession) toast.error(t("media.micDenied"));
          micDeniedForSession = true;
          onUnavailable?.();
        } else {
          toast.error(t("media.micDenied"));
        }
        onCancel();
      });

    return () => {
      cancelled = true;
      unmountedRef.current = true;
      stopTimer();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      stopTracks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishAndSend = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      onCancel();
      return;
    }

    recorder.onstop = () => {
      if (unmountedRef.current) return;
      const durationMs = Date.now() - startedAtRef.current;
      const blob = new Blob(chunksRef.current, { type: mimeRef.current });
      const file = new File(
        [blob],
        `voice-${Date.now()}.${extensionForMime(mimeRef.current)}`,
        { type: mimeRef.current },
      );
      stopTracks();
      stopTimer();
      onSend(file, durationMs);
    };
    recorder.stop();
  };

  const cancel = () => {
    finishedRef.current = true;
    stopTimer();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    stopTracks();
    onCancel();
  };

  return (
    <div
      role="status"
      className="border-border bg-card flex min-h-12 items-center gap-3 rounded-xl border px-3"
    >
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 animate-pulse rounded-full bg-destructive"
      />
      <span className="moaddi-chat-time flex-1 text-sm font-semibold" dir="ltr">
        {ready ? formatElapsed(elapsedMs) : t("media.recording")}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("media.cancelRecording")}
        onClick={cancel}
      >
        <X aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="default"
        size="icon-sm"
        aria-label={t("media.sendVoice")}
        disabled={!ready}
        onClick={finishAndSend}
      >
        <Send className="rtl:rotate-180" aria-hidden="true" />
      </Button>
    </div>
  );
}

export function VoiceRecorderTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  const t = useTranslations("Chat");
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={t("media.recordVoice")}
      onClick={onClick}
    >
      <Mic aria-hidden="true" />
    </Button>
  );
}
