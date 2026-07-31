import fs = require("fs");
import path = require("path");

/**
 * Private chat media lives here. It must stay outside `public/` and `images/` —
 * both of those are served by express.static with no authentication, and the
 * `/content` handler lets every GET through. Media is only ever readable through
 * the membership-checked stream route.
 */
const chatUploadDir = () =>
  path.resolve(process.env.CHAT_UPLOAD_DIR || "chat-uploads");

const ensureChatUploadDir = () => {
  const dir = chatUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

/**
 * Resolves a stored key to an absolute path, refusing anything that escapes the
 * upload directory. Keys are server-minted uuids so traversal should be
 * impossible, but this costs nothing and turns a future bug into a 404.
 */
const resolveStoragePath = (storageKey: string): string | null => {
  if (typeof storageKey !== "string" || storageKey.length === 0) return null;

  const dir = chatUploadDir();
  const resolved = path.resolve(dir, storageKey);
  if (resolved !== dir && !resolved.startsWith(dir + path.sep)) return null;

  return resolved;
};

/** Deletes a file, ignoring "already gone". Used to clean up rejected uploads. */
const safeUnlink = async (filePath?: string | null) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch {
    /* already gone, or never written */
  }
};

export = {
  chatUploadDir,
  ensureChatUploadDir,
  resolveStoragePath,
  safeUnlink,
};
