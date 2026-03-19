const path = require("path");
const express = require("express");
const multer = require("multer");
const { asyncHandler } = require("../middleware/async-handler");
const { parsePositiveInt, getUploadPublicBase, requireJson } = require("./utils/http");

const DEFAULT_UPLOADS_DIR = path.resolve(__dirname, "..", "..", "..", "uploads");

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

function createUploadsRoute({ db, uploadsDir = DEFAULT_UPLOADS_DIR, uploadPublicBaseUrl = null }) {
  const router = express.Router();

  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, uploadsDir);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || "") || extFromMimeType(file.mimetype);
      const safeExt = extension.replace(/[^A-Za-z0-9._-]/g, "") || ".jpg";
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
      callback(null, fileName);
    }
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 12
    }
  });

  async function attachPhotos(treeId, uploaded) {
    const tree = await db.trees.getById(treeId);
    if (!tree) {
      const error = new Error("Tree not found");
      error.name = "NotFoundError";
      throw error;
    }

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
    const treeId = parsePositiveInt(treeIdInput, "treeId");

    if (Array.isArray(req.files) && req.files.length > 0) {
      const publicBase = getUploadPublicBase(req, uploadPublicBaseUrl || process.env.UPLOAD_PUBLIC_BASE_URL || null);

      const uploaded = req.files.map((file) => ({
        url: `${publicBase}/${file.filename}`,
        mimeType: file.mimetype || "application/octet-stream"
      }));

      await attachPhotos(treeId, uploaded);

      res.json({
        success: true,
        uploaded: uploaded.map((item) => item.url)
      });
      return;
    }

    requireJson(req);
    const photos = Array.isArray(req.body.photos) ? req.body.photos : [];
    if (photos.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const uploaded = photos.map((photo) => {
      if (typeof photo === "string") {
        return { url: photo, mimeType: null };
      }
      if (!photo || typeof photo !== "object" || typeof photo.url !== "string") {
        const error = new Error("photos entries must be strings or { url, mimeType }");
        error.name = "ValidationError";
        throw error;
      }
      return {
        url: photo.url,
        mimeType: photo.mimeType || null
      };
    });

    await attachPhotos(treeId, uploaded);

    res.json({
      success: true,
      uploaded: uploaded.map((item) => item.url)
    });
  };

  router.post(
    "/trees/:treeId/photos",
    upload.array("photos"),
    asyncHandler(async (req, res) => {
      await uploadHandler(req, res, req.params.treeId);
    })
  );

  router.post(
    "/upload-photos",
    upload.array("photos"),
    asyncHandler(async (req, res) => {
      await uploadHandler(req, res, req.body.tree_id);
    })
  );

  return router;
}

module.exports = {
  createUploadsRoute,
  DEFAULT_UPLOADS_DIR
};
