import type { TFunction } from "i18next";
import type { ChatMessageType } from "~/types/chat";

/**
 * Localized inbox preview.
 *
 * The server stores a non-localized `textPreview` (a glyph for media) because
 * it cannot know the reader's language. For anything but text we ignore it and
 * render off `type` instead — see the note in chatMessageTypes.ts.
 */
export const previewLabel = (
  t: TFunction,
  type: ChatMessageType | undefined,
  textPreview?: string,
) => {
  switch (type) {
    case "image":
      return t("chatPreviewImage");
    case "audio":
      return t("chatPreviewAudio");
    case "document":
      return t("chatPreviewDocument");
    case "location":
      return t("chatPreviewLocation");
    case "text":
    default:
      return textPreview || "";
  }
};

/** `mm:ss`, for voice notes and the recording timer. */
export const formatDuration = (milliseconds?: number) => {
  const total = Math.max(0, Math.round((milliseconds ?? 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const formatBytes = (bytes?: number) => {
  if (!bytes || bytes < 1) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Clock time on a bubble, e.g. `14:05`. */
export const formatTime = (iso?: string, language?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleTimeString(language, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    // Some Android builds ship a reduced ICU; a manual fallback beats crashing.
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`;
  }
};

/** Inbox timestamp: time today, weekday this week, otherwise a short date. */
export const formatInboxTime = (
  iso: string | undefined,
  language: string | undefined,
  t: TFunction,
) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return formatTime(iso, language);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return t("chatYesterday");

  try {
    const withinWeek = now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000;
    return withinWeek
      ? date.toLocaleDateString(language, { weekday: "short" })
      : date.toLocaleDateString(language, { day: "2-digit", month: "2-digit" });
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

/** Day separator inside a thread. */
export const formatDayLabel = (
  iso: string,
  language: string | undefined,
  t: TFunction,
) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return t("chatToday");

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return t("chatYesterday");

  try {
    return date.toLocaleDateString(language, {
      day: "numeric",
      month: "long",
      year:
        date.getFullYear() === now.getFullYear() ? undefined : "numeric",
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

/** True when `current` starts a new calendar day relative to `previous`. */
export const startsNewDay = (current?: string, previous?: string) => {
  if (!current) return false;
  if (!previous) return true;
  return new Date(current).toDateString() !== new Date(previous).toDateString();
};

/** Role chip under a peer's name in the inbox. */
export const roleLabel = (t: TFunction, role?: string) => {
  switch ((role || "").toLowerCase()) {
    case "admin":
      return t("chatRoleSupport");
    case "vendor":
      return t("chatRoleVendor");
    case "customer":
      return t("chatRoleCustomer");
    case "guest":
      return t("chatRoleGuest");
    default:
      return role || "";
  }
};
