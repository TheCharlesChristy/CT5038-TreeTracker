const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const conn = require("../db");

const router = express.Router();
const uploadDir = path.join(__dirname, "../uploads");

// ensure uploads folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const fileName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, fileName);
  }
});

const upload = multer({ storage });

// POST /api/upload-photos
router.post("/upload-photos", upload.array("photos"), async (req, res) => {
  try {

    const tree_id = Number(req.body.tree_id);

    if (!tree_id) {
      return res.status(400).json({ error: "Missing tree_id" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const uploaded = [];

	for (const file of req.files) {

	  const publicUrl =
		"https://s4316157-ctxxxx.uogs.co.uk/api/uploads/" + file.filename;

	  const [photoResult] = await conn.query(
		`INSERT INTO photos (image_url, mime_type) VALUES (?, ?)`,
		[publicUrl, file.mimetype]
	  );

	  const photo_id = photoResult.insertId;

	  await conn.query(
		`INSERT INTO tree_photos (photo_id, tree_id) VALUES (?, ?)`,
		[photo_id, tree_id]
	  );

	  uploaded.push(publicUrl);
	}

    res.json({
      success: true,
      uploaded
    });

  } catch (err) {

    console.error("Upload photo error:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });

  }
});

module.exports = router;