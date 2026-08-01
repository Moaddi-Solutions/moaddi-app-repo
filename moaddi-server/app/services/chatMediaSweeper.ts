import fs = require("fs");
import path = require("path");
import chatStorage = require("../lib/chatStorage");

const chatMessages =
  require("../data/models/chatMessages") as typeof import("../data/models/chatMessages");

/**
 * Deletes uploaded files that were never attached to a message.
 *
 * The upload and send steps are separate, so any upload the user abandons —
 * they close the tab, the send fails, they pick a different file — leaves bytes
 * on disk with nothing referencing them. Without this they accumulate forever.
 *
 * Only files older than the grace period are considered, so an upload that is
 * mid-flight toward its send call is never swept.
 */
const GRACE_MS = 24 * 60 * 60 * 1000;

const sweepOrphanChatMedia = async (): Promise<number> => {
  const dir = chatStorage.chatUploadDir();

  let entries: string[];
  try {
    entries = await fs.promises.readdir(dir);
  } catch {
    return 0; // nothing uploaded yet
  }

  const cutoff = Date.now() - GRACE_MS;
  const candidates: string[] = [];

  for (const entry of entries) {
    const filePath = path.join(dir, entry);
    try {
      const stat = await fs.promises.stat(filePath);
      if (stat.isFile() && stat.mtimeMs < cutoff) candidates.push(entry);
    } catch {
      /* vanished between readdir and stat */
    }
  }

  if (candidates.length === 0) return 0;

  const referenced = await chatMessages
    .find({ "attachment.storageKey": { $in: candidates } })
    .select({ "attachment.storageKey": 1 })
    .lean();

  const referencedKeys = new Set(
    referenced.map((message: any) => message?.attachment?.storageKey),
  );

  let removed = 0;
  for (const entry of candidates) {
    if (referencedKeys.has(entry)) continue;
    await chatStorage.safeUnlink(path.join(dir, entry));
    removed += 1;
  }

  // Count only — a filename here is a storage key, not something to log.
  if (removed > 0) console.log(`Chat media sweeper removed ${removed} file(s)`);
  return removed;
};

const startChatMediaSweeper = () => {
  const run = () => {
    sweepOrphanChatMedia().catch(() => {
      console.error("Chat media sweep failed");
    });
  };
  run();
  setInterval(run, 6 * 60 * 60 * 1000);
};

export = { sweepOrphanChatMedia, startChatMediaSweeper };
