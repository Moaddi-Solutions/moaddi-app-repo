"use client";

import type { ChatAttachment } from "@/(root)/context/chat-context";
import { Slider } from "@/../components/ui/slider";
import { Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/**
 * Plays a voice note, or degrades to a plain download row when the browser
 * cannot play the stored codec.
 *
 * There is no in-browser transcoding here on purpose: Chrome/Firefox record
 * audio/webm;opus, Safari records audio/mp4 — and this server does not run
 * ffmpeg. `canPlayType` tells us honestly whether THIS browser can decode
 * what was actually uploaded, so a note recorded in Chrome and opened in
 * Safari renders as a download instead of a player with dead controls.
 */
export function AudioBubble({
  src,
  attachment,
}: {
  src: string;
  attachment?: ChatAttachment;
}) {
  const t = useTranslations("Chat");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [supported, setSupported] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  // durationMs is a display hint from the server, not a guarantee — see
  // mediaSniff.ts. audioEl.duration overrides it once real metadata loads,
  // but only when finite: MediaRecorder-produced WebM commonly reports
  // Infinity for duration until the file is fully seekable.
  const [durationSeconds, setDurationSeconds] = useState(
    attachment?.durationMs ? attachment.durationMs / 1000 : 0,
  );

  useEffect(() => {
    const probe = document.createElement("audio");
    const mime = attachment?.mime;
    setSupported(!mime || probe.canPlayType(mime) !== "");
  }, [attachment?.mime]);

  if (!supported) {
    return (
      <a
        href={src}
        download
        className="flex min-w-[13rem] items-center gap-3 px-3.5 py-2.5"
      >
        <span className="bg-background/60 flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Play className="size-4.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {t("media.voiceNote")}
          </span>
          <span className="block text-xs opacity-70">
            {t("media.audioUnsupported")}
          </span>
        </span>
      </a>
    );
  }

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  return (
    <div className="flex w-[15rem] items-center gap-2.5 px-3.5 py-2.5">
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? t("media.pause") : t("media.play")}
        className="bg-background/60 flex size-9 shrink-0 items-center justify-center rounded-full"
      >
        {playing ? (
          <Pause className="size-4" aria-hidden="true" />
        ) : (
          <Play className="size-4" aria-hidden="true" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <Slider
          aria-label={t("media.seek")}
          min={0}
          max={Math.max(durationSeconds, 0.1)}
          step={0.1}
          value={[Math.min(currentTime, durationSeconds || 0)]}
          disabled={!durationSeconds}
          onValueChange={([next = 0]) => {
            const audio = audioRef.current;
            if (!audio) return;
            audio.currentTime = next;
            setCurrentTime(next);
          }}
          className="chat-audio-seek w-full"
          dir="ltr"
        />
        {/* dir="ltr" + tabular figures: an mm:ss readout must not mirror. */}
        <div
          className="moaddi-chat-time mt-0.5 flex justify-between text-[11px] opacity-70"
          dir="ltr"
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(durationSeconds)}</span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onLoadedMetadata={(event) => {
          const { duration } = event.currentTarget;
          if (Number.isFinite(duration)) setDurationSeconds(duration);
        }}
      />
    </div>
  );
}
