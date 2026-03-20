const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const { asyncHandler } = require("../middleware/async-handler");
const { createLogger } = require("../../logging");
const { parsePositiveInt, getUploadPublicBase, requireJson } = require("./utils/http");
const { AuthError } = require("../../errors");
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
  const creationData = db.treeCreationData && typeof db.treeCreationData.getByTreeId === "function"
    ? await db.treeCreationData.getByTreeId(treeId)
    : null;

  if (!creationData || creationData.creator_user_id === null || creationData.creator_user_id === undefined) {
    return auth;
  }

  if (
    auth.user.role === "admin" ||
    auth.user.role === "guardian" ||
    Number(creationData.creator_user_id) === Number(auth.user.id)
  ) {
    return auth;
  }

  routeLog.warn("auth.denied", {
    treeId,
    userId: auth.user.id,
    creatorUserId: Number(creationData.creator_user_id)
  });
  throw new AuthError("You do not have access to modify this tree");
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

function createUploadsRoute({ db, uploadsDir = DEFAULT_UPLOADS_DIR, uploadPublicBaseUrl = null }) {
  const router = express.Router();

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
      for (const file of uploaded) {
        const photo = await db.photos.create(
          {
            imageUrl: file.url,
            mimeType: file.mimeType
          },
          tx
        );
        await db.treePhotos.add(
          {
            treeId,
            photoId: photo.id
          },
          tx
        );
      }
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
        const publicBase = getUploadPublicBase(req, uploadPublicBaseUrl || process.env.UPLOAD_PUBLIC_BASE_URL || null);

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

        res.json({
          success: true,
          uploaded: uploaded.map((item) => item.url)
        });
        return;
      }

      requireJson(req);
      const photos = Array.isArray(req.body.photos) ? req.body.photos : [];
      if (photos.length === 0) {
        routeLog.warn("validation.failed", { reason: "no-photos" });
        res.status(400).json({ error: "No files uploaded" });
        return;
      }

      const uploaded = photos.map((photo) => {
        if (typeof photo === "string") {
          if (!isAllowedUploadUrl(photo, uploadPublicBaseUrl || process.env.UPLOAD_PUBLIC_BASE_URL || null)) {
            const error = new Error("photos entries must reference previously uploaded /uploads URLs");
            error.name = "ValidationError";
            throw error;
          }
          return { url: photo.trim(), mimeType: null };
        }
        if (!photo || typeof photo !== "object" || typeof photo.url !== "string") {
          routeLog.warn("validation.failed", { reason: "invalid-photo-entry" });
          const error = new Error("photos entries must be strings or { url, mimeType }");
          error.name = "ValidationError";
          throw error;
        }
        if (!isAllowedUploadUrl(photo.url, uploadPublicBaseUrl || process.env.UPLOAD_PUBLIC_BASE_URL || null)) {
          const error = new Error("photos entries must reference previously uploaded /uploads URLs");
          error.name = "ValidationError";
          throw error;
        }
        return {
          url: photo.url.trim(),
          mimeType: photo.mimeType || null
        };
      });

      await attachPhotos(treeId, uploaded);

      routeLog.info("upload.success", {
        treeId,
        count: uploaded.length,
        mode: "json"
      });

      res.json({
        success: true,
        uploaded: uploaded.map((item) => item.url)
      });
    } catch (error) {
      await removeUploadedFiles(req.files);
      throw error;
    }
  };

  router.post(
    "/trees/:treeId/photos",
    runMulterMiddleware(upload.array("photos")),
    asyncHandler(async (req, res) => {
      await uploadHandler(req, res, req.params.treeId);
    })
  );

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
  DEFAULT_UPLOADS_DIR,
  ensureUploadsDirExists
};
