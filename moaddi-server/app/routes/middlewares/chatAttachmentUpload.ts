import multer = require("multer");
import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { repoError } from "../../lib/errors";
import chatStorage = require("../../lib/chatStorage");
import { MAX_UPLOAD_BYTES } from "../../lib/mediaSniff";

/**
 * Upload handling for private chat media.
 *
 * Deliberately NOT reusing `fileHandler.js`: that one writes into `images/`,
 * which is served by express.static with no authentication, keeps the client's
 * original filename verbatim, and sets no size limit at all.
 */
const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    try {
      callback(null, chatStorage.ensureChatUploadDir());
    } catch (error) {
      callback(error as Error, "");
    }
  },
  filename(_req, _file, callback) {
    // Random and extension-less. Never derived from originalname: that would
    // allow traversal and collisions. Extension-less also keeps `nodemon --ext`
    // from restarting on upload, and stops express `send` guessing a type.
    callback(null, randomUUID());
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 4 },
  fileFilter(_req, file, callback) {
    // Cheap first pass only. The real decision is made from magic bytes after
    // the write, in the route handler — a declared MIME proves nothing.
    if (!/^(image|audio|text|application)\//i.test(file.mimetype || "")) {
      callback(new Error("File is not supported"));
      return;
    }
    callback(null, true);
  },
});

const single = upload.single("file");

/**
 * Wraps multer so its errors become correct status codes and no partial file is
 * left behind.
 *
 * Two multer behaviours make this necessary: a `MulterError` carries no
 * `statusCode`, so the central handler would return 500 for an oversized file;
 * and on `LIMIT_FILE_SIZE` multer leaves the truncated bytes on disk.
 */
const uploadChatAttachment = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  single(req, res, async (error: any) => {
    if (!error) return next();

    await chatStorage.safeUnlink(req.file?.path);

    if (error.code === "LIMIT_FILE_SIZE") {
      return next(repoError(413, "File is too large."));
    }
    if (error.code) {
      return next(repoError(400, "Invalid upload."));
    }
    // "File is not supported" is mapped to 415 by the central error handler.
    return next(error);
  });
};

export = { uploadChatAttachment };
