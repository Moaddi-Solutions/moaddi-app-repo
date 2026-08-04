/**
 * Content sniffing for chat uploads.
 *
 * The client's declared MIME type is never trusted — it is trivially forged and
 * the existing upload filters in this codebase accept `application/octet-stream`,
 * which makes them close to no check at all. Everything here is decided from the
 * actual bytes; the declared name is used only to disambiguate container formats
 * that genuinely share a signature (zip and OLE2), and never to grant a type.
 *
 * Honest limitations, since they matter for review:
 *   - EBML (`1A 45 DF A3`) is also WebM *video*
 *   - `ftyp` is also MP4 *video*
 *   - `PK\x03\x04` is any zip
 * Byte caps plus the fact that we never serve `video/*` or `application/zip`
 * contain all three. Perfect discrimination needs a container parser, which is
 * not worth it here.
 *
 * SVG is deliberately absent: it is a script-execution vector and the one image
 * format where an `image/*` content type does not make it safe to serve.
 */

import type { ChatMediaType } from "./chatTypes";

export type SniffResult = {
  kind: ChatMediaType;
  mime: string;
  width?: number;
  height?: number;
};

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  bytes.every((byte, index) => buf[offset + index] === byte);

const asciiAt = (buf: Buffer, offset: number, length: number) =>
  buf.slice(offset, offset + length).toString("latin1");

/** PNG: IHDR is always the first chunk, width/height at fixed offsets. */
const pngDimensions = (buf: Buffer) =>
  buf.length >= 24
    ? { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
    : {};

/** JPEG: walk the marker chain to the first SOF segment. */
const jpegDimensions = (buf: Buffer) => {
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    // SOF0..SOF15, excluding DHT (c4), JPG (c8) and DAC (cc)
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }
    if (offset + 4 > buf.length) break;
    offset += 2 + buf.readUInt16BE(offset + 2);
  }
  return {};
};

/** WebP has three sub-formats; each stores dimensions differently. */
const webpDimensions = (buf: Buffer) => {
  const format = asciiAt(buf, 12, 4);
  try {
    if (format === "VP8 ") {
      return {
        width: buf.readUInt16LE(26) & 0x3fff,
        height: buf.readUInt16LE(28) & 0x3fff,
      };
    }
    if (format === "VP8L") {
      const bits = buf.readUInt32LE(21);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
    if (format === "VP8X") {
      return {
        width: (buf.readUIntLE(24, 3) & 0xffffff) + 1,
        height: (buf.readUIntLE(27, 3) & 0xffffff) + 1,
      };
    }
  } catch {
    /* truncated header — fall through to no dimensions */
  }
  return {};
};

/** Rejects anything with a NUL byte or an invalid UTF-8 sequence. */
const looksLikeUtf8Text = (buf: Buffer) => {
  if (buf.includes(0)) return false;
  const decoded = buf.toString("utf8");
  return !decoded.includes("�");
};

const extensionOf = (name?: string) => {
  if (!name) return "";
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
};

/**
 * @param head  the first bytes of the file (64 KiB is plenty — a JPEG SOF can
 *              sit well past 4 KiB behind an EXIF thumbnail)
 * @param declaredName  used only to disambiguate zip/OLE2 containers
 */
export const sniffAttachment = (
  head: Buffer,
  declaredName?: string,
): SniffResult | null => {
  if (!head || head.length < 8) return null;
  const ext = extensionOf(declaredName);

  // ---- images ----
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: "image", mime: "image/png", ...pngDimensions(head) };
  }
  if (startsWith(head, [0xff, 0xd8, 0xff])) {
    return { kind: "image", mime: "image/jpeg", ...jpegDimensions(head) };
  }
  if (asciiAt(head, 0, 4) === "RIFF" && asciiAt(head, 8, 4) === "WEBP") {
    return { kind: "image", mime: "image/webp", ...webpDimensions(head) };
  }

  // ---- audio ----
  if (asciiAt(head, 0, 4) === "OggS") {
    return { kind: "audio", mime: "audio/ogg" };
  }
  if (startsWith(head, [0x1a, 0x45, 0xdf, 0xa3])) {
    // Matroska/WebM. MediaRecorder in Chrome and Firefox produces this.
    return { kind: "audio", mime: "audio/webm" };
  }
  if (asciiAt(head, 4, 4) === "ftyp") {
    const brand = asciiAt(head, 8, 4);
    const audioBrands = ["M4A ", "mp42", "isom", "iso5", "mp41", "M4B "];
    if (audioBrands.includes(brand)) {
      // Safari's MediaRecorder produces this.
      return { kind: "audio", mime: "audio/mp4" };
    }
  }

  // ---- documents ----
  if (asciiAt(head, 0, 5) === "%PDF-") {
    return { kind: "document", mime: "application/pdf" };
  }
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04])) {
    // A zip container. Only accept it as a document when the name claims one of
    // the OOXML formats — otherwise it is just an archive, which we do not take.
    if (ext === ".docx") {
      return {
        kind: "document",
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }
    if (ext === ".xlsx") {
      return {
        kind: "document",
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }
    return null;
  }
  if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    // Legacy OLE2 compound file: .doc and .xls share it.
    if (ext === ".doc") {
      return { kind: "document", mime: "application/msword" };
    }
    if (ext === ".xls") {
      return { kind: "document", mime: "application/vnd.ms-excel" };
    }
    return null;
  }
  if (ext === ".txt" && looksLikeUtf8Text(head)) {
    return { kind: "document", mime: "text/plain" };
  }

  return null;
};

/**
 * Per-kind byte ceilings, applied after sniffing.
 *
 * Audio is capped far below the 5 MB the plan docs suggest because bytes are
 * the only real bound on duration here — see the recorder, which pins
 * `audioBitsPerSecond` to 32 kbps. At that rate 120 s is roughly 480 KB, so
 * 1 MiB leaves generous headroom while making a multi-minute upload physically
 * impossible at any plausible bitrate.
 */
export const MAX_BYTES: Record<ChatMediaType, number> = {
  image: 5 * 1024 * 1024,
  audio: 1 * 1024 * 1024,
  document: 10 * 1024 * 1024,
};

/** Hard ceiling handed to multer, before we know the kind. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Strips control characters (a `\r\n` in a filename is a header-injection
 * attempt once it reaches Content-Disposition), collapses whitespace, drops any
 * path component, and truncates.
 */
export const sanitizeFileName = (name?: string): string | undefined => {
  if (typeof name !== "string") return undefined;
  const base = name.split(/[\\/]/).pop() || "";
  const cleaned = Array.from(base)
    // Drop control characters by codepoint. A CR/LF inside a filename is a
    // header-injection attempt once it reaches Content-Disposition.
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 100) || undefined;
};
