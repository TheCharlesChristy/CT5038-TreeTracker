const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const { asyncHandler } = require("../middleware/async-handler");
const { createLogger } = require("../../logging");
const { parsePositiveInt, getUploadPublicBase, requireJson } = require("./utils/http");
const { requireAuthenticatedUser } = require("./utils/auth");

const DEFAULT_UPLOADS_DIR = path.resolve(__dirname, "..", "..", "..", "uploads");
const ALLOWED_UPLOAD_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function ensureUploadsDirExists(uploadsDir) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function extFromMimeType(mimeType) {
  const map = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg"
  };
  return map[String(mimeType || "").toLowerCase()] || ".jpg";
}

const logger = createLogger("routes.api.uploads");

function getRouteLogger(req, extra = {}) {
  return req?.log?.scope ? req.log.scope("routes.api.uploads", extra) : logger.child(extra);
}

async function removeUploadedFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return;
  }

  await Promise.all(
    files.map(async (file) => {
      if (!file?.path) {
        return;
      }
      try {
        await fs.promises.unlink(file.path);
      } catch (error) {
        if (error?.code !== "ENOENT") {
          logger.warn("upload.cleanup.failed", { filePath: file.path, code: error?.code || null });
        }
      }
    })
  );
}

function isAllowedUploadUrl(url, uploadPublicBaseUrl) {
  if (typeof url !== "string" || !url.trim()) {
    return false;
  }

  const trimmed = url.trim();
  if (trimmed.startsWith("/uploads/")) {
    return true;
  }

  if (!uploadPublicBaseUrl) {
    return false;
  }

  const normalizedBase = uploadPublicBaseUrl.replace(/\/+$/, "");
  return trimmed.startsWith(`${normalizedBase}/`);
}

async function authorizeTreeUpload({ req, db, treeId, routeLog }) {
  const auth = await requireAuthenticatedUser({ req, db, routeLog });

  const tree = await db.trees.getById(treeId);
  if (!tree) {
    const error = new Error("Tree not found");
    error.name = "NotFoundError";
    throw error;
  }

  return auth;
}

function runMulterMiddleware(middleware) {
  return (req, res, next) => {
    middleware(req, res, (error) => {
      if (error) {
        next(error);
        return;
      }
      next();
    });
  };
}

function createTreeScopedUploadFactories({ db, uploadsDir = DEFAULT_UPLOADS_DIR, uploadPublicBaseUrl = null }) {
  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
      ensureUploadsDirExists(uploadsDir);
      callback(null, uploadsDir);
    },
    filename: (_req, file, callback) => {
      const safeExt = extFromMimeType(file.mimetype);
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
      callback(null, fileName);
    }
  });

  const upload = multer({
    storage,
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_UPLOAD_MIME_TYPES.has(String(file.mimetype || "").toLowerCase())) {
        const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
        error.message = "Only JPEG, PNG, WEBP, and GIF uploads are allowed";
        callback(error);
        return;
      }
      callback(null, true);
    },
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 12
    }
  });

  async function persistUploadedPhotoRows(uploaded, tx) {
    const createdPhotos = [];

    for (const file of uploaded) {
      const photo = await db.photos.create(
        {
          imageUrl: file.url,
          mimeType: file.mimeType
        },
        tx
      );

      createdPhotos.push(photo);
    }

    return createdPhotos;
  }

  async function attachPhotos(treeId, uploaded) {
    const tree = await db.trees.getById(treeId);
    if (!tree) {
      logger.warn("upload.tree.missing", { treeId });
      const error = new Error("Tree not found");
      error.name = "NotFoundError";
      throw error;
    }

    logger.info("upload.attach.begin", {
      treeId,
      photoCount: uploaded.length
    });

    return db.transaction(async (tx) => {
      const createdPhotos = await persistUploadedPhotoRows(uploaded, tx);

      for (const photo of createdPhotos) {
        await db.treePhotos.add(
          {
            treeId,
            photoId: photo.id
          },
          tx
        );
      }

      return createdPhotos;
    });
  }

  async function createCommentDraftPhotos(treeId, uploaded) {
    const tree = await db.trees.getById(treeId);
    if (!tree) {
      logger.warn("upload.comment.tree.missing", { treeId });
      const error = new Error("Tree not found");
      error.name = "NotFoundError";
      throw error;
    }

    return db.transaction(async (tx) => {
      return persistUploadedPhotoRows(uploaded, tx);
    });
  }

  const uploadHandler = async (req, res, treeIdInput) => {
    const routeLog = getRouteLogger(req, { route: "upload-photos" });
    const treeId = parsePositiveInt(treeIdInput, "treeId");
    await authorizeTreeUpload({ req, db, treeId, routeLog });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url,
      treeId,
      multipart: Array.isArray(req.files) && req.files.length > 0
    });

    try {
      if (Array.isArray(req.files) && req.files.length > 0) {
        const publicBase = getUploadPublicBase(
          req,
          uploadPublicBaseUrl || process.env.UPLOAD_PUBLIC_BASE_URL || null
        );

        const uploaded = req.files.map((file) => ({
          url: `${publicBase}/${file.filename}`,
          mimeType: file.mimetype || "application/octet-stream"
        }));

        await attachPhotos(treeId, uploaded);

        routeLog.info("upload.success", {
          treeId,
          count: uploaded.length,
          mode: "multipart"
        });

        return res.json({
          success: true,
          uploaded: uploaded.map((item) => item.url)
        });
      }

      requireJson(req);
      const photos = Array.isArray(req.body.photos) ? req.body.photos : [];
      if (photos.length === 0) {
        routeLog.warn("validation.failed", { reason: "no-photos" });
        return res.status(400).json({ error: "No files uploaded" });
      }

      let uploaded;

      try {
        uploaded = photos.map((photo) => {
          if (typeof photo === "string") {
            if (!isAllowedUploadUrl(photo, uploadPublicBaseUrl || process.env.UPLOAD_PUBLIC_BASE_URL || null)) {
              throw new Error("Invalid upload URL");
            }
            return { url: photo.trim(), mimeType: null };
          }

          if (!photo || typeof photo !== "object" || typeof photo.url !== "string") {
            throw new Error("Invalid photo format");
          }

          if (!isAllowedUploadUrl(photo.url, uploadPublicBaseUrl || process.env.UPLOAD_PUBLIC_BASE_URL || null)) {
            throw new Error("Invalid upload URL");
          }

          return {
            url: photo.url.trim(),
            mimeType: photo.mimeType || null
          };
        });
      } catch (err) {
        routeLog.warn("validation.failed", { error: err.message });
        return res.status(400).json({ error: err.message });
      }

      if (!Array.isArray(uploaded) || uploaded.length === 0) {
        routeLog.warn("upload.failed", { reason: "no_valid_uploaded_data" });
        return res.status(400).json({ error: "No valid upload data provided" });
      }

      let createdPhotos;

      try {
        createdPhotos = await attachPhotos(treeId, uploaded);
      } catch (err) {
        routeLog.error("upload.attach.failed", { error: err.message });
        return res.status(500).json({ error: "Failed to attach photos" });
      }

      return res.json({
        success: true,
        uploaded: createdPhotos.map((photo) => ({
          id: photo.id,
          image_url: photo.image_url || photo.imageUrl
        }))
      });

    } catch (error) {
      await removeUploadedFiles(req.files);
      routeLog.error("upload.failed", { error: error.message });
      throw error;
    }
  };

  const commentPhotoUploadHandler = async (req, res, treeIdInput) => {
    const routeLog = getRouteLogger(req, { route: "upload-comment-photos" });
    const treeId = parsePositiveInt(treeIdInput, "treeId");
    await authorizeTreeUpload({ req, db, treeId, routeLog });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url,
      treeId,
      multipart: Array.isArray(req.files) && req.files.length > 0
    });

    try {
      if (!Array.isArray(req.files) || req.files.length === 0) {
        routeLog.warn("validation.failed", { reason: "no-files" });
        return res.status(400).json({ error: "No files uploaded" });
      }

      const publicBase = getUploadPublicBase(
        req,
        uploadPublicBaseUrl || process.env.UPLOAD_PUBLIC_BASE_URL || null
      );

      const uploaded = req.files.map((file) => ({
        url: `${publicBase}/${file.filename}`,
        mimeType: file.mimetype || "application/octet-stream"
      }));

      const createdPhotos = await createCommentDraftPhotos(treeId, uploaded);

      routeLog.info("upload.success", {
        treeId,
        count: createdPhotos.length,
        mode: "comment-draft"
      });

      return res.json({
        success: true,
        photos: createdPhotos.map((photo) => ({
          id: Number(photo.id),
          image_url: photo.image_url || photo.imageUrl
        }))
      });
    } catch (error) {
      await removeUploadedFiles(req.files);
      routeLog.error("upload.failed", { error: error.message });
      throw error;
    }
  };

  return { upload, uploadHandler, commentPhotoUploadHandler };
}

function normalizeCommentPhotoIds(body) {
  if (!body || !Array.isArray(body.photoIds)) {
    return [];
  }

  return body.photoIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 12);
}

/**
 * JSON reply endpoints live here so they match the same router as comment-photos (mounted first in api/index).
 */
function registerTreeCommentReplyJsonRoutes(router, { db }) {
  router.post(
    "/trees/:treeId/comment-replies",
    asyncHandler(async (req, res) => {
      requireJson(req);

      const treeId = parsePositiveInt(req.params.treeId, "treeId");
      const rawParent =
        req.body?.parentCommentId ?? req.body?.parent_comment_id ?? req.body?.parentId;
      const parentCommentId = parsePositiveInt(rawParent, "parentCommentId");
      const auth = await requireAuthenticatedUser({
        req,
        db,
        routeLog: getRouteLogger(req, { route: "add-comment-reply-flat" })
      });

      const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
      const photoIds = normalizeCommentPhotoIds(req.body);

      if (!content && photoIds.length === 0) {
        const error = new Error("Either non-empty content or at least one image attachment is required");
        error.name = "ValidationError";
        throw error;
      }

      const result = await db.workflows.comments.replyToComment({
        treeId,
        parentCommentId,
        userId: Number(auth.user.id),
        content,
        photoIds
      });

      res.status(201).json({
        success: true,
        comment_id: result.commentId
      });
    })
  );

  router.post(
    "/trees/:treeId/comments/:parentCommentId/replies",
    asyncHandler(async (req, res) => {
      requireJson(req);

      const treeId = parsePositiveInt(req.params.treeId, "treeId");
      const parentCommentId = parsePositiveInt(req.params.parentCommentId, "parentCommentId");
      const auth = await requireAuthenticatedUser({
        req,
        db,
        routeLog: getRouteLogger(req, { route: "add-comment-reply" })
      });

      const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
      const photoIds = normalizeCommentPhotoIds(req.body);

      if (!content && photoIds.length === 0) {
        const error = new Error("Either non-empty content or at least one image attachment is required");
        error.name = "ValidationError";
        throw error;
      }

      const result = await db.workflows.comments.replyToComment({
        treeId,
        parentCommentId,
        userId: Number(auth.user.id),
        content,
        photoIds
      });

      res.status(201).json({
        success: true,
        comment_id: result.commentId
      });
    })
  );
}

/** Registers POST /trees/:treeId/photos and POST /trees/:treeId/comment-photos (used by createUploadsRoute). */
function registerTreeScopedMultipartRoutes(router, deps) {
  const { upload, uploadHandler, commentPhotoUploadHandler } = createTreeScopedUploadFactories(deps);

  router.post(
    "/trees/:treeId/photos",
    runMulterMiddleware(upload.array("photos")),
    asyncHandler(async (req, res) => {
      await uploadHandler(req, res, req.params.treeId);
    })
  );

  router.post(
    "/trees/:treeId/comment-photos",
    runMulterMiddleware(upload.array("photos")),
    asyncHandler(async (req, res) => {
      await commentPhotoUploadHandler(req, res, req.params.treeId);
    })
  );
}

function createUploadsRoute({ db, uploadsDir = DEFAULT_UPLOADS_DIR, uploadPublicBaseUrl = null }) {
  const router = express.Router();
  registerTreeCommentReplyJsonRoutes(router, { db });
  registerTreeScopedMultipartRoutes(router, { db, uploadsDir, uploadPublicBaseUrl });
  const { upload, uploadHandler } = createTreeScopedUploadFactories({ db, uploadsDir, uploadPublicBaseUrl });

  router.post(
    "/upload-photos",
    runMulterMiddleware(upload.array("photos")),
    asyncHandler(async (req, res) => {
      await uploadHandler(req, res, req.body.tree_id);
    })
  );

  return router;
}

module.exports = {
  createUploadsRoute,
  registerTreeScopedMultipartRoutes,
  DEFAULT_UPLOADS_DIR,
  ensureUploadsDirExists
};
