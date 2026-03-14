const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/get-trees", async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT
        t.id,
        t.latitude,
        t.longitude,
        td.trunk_diameter AS diameter,
        td.tree_height AS height,
        td.trunk_circumference AS circumference,
        so.observation_notes AS notes,
        wo.wildlife,
        dobs.disease,
        GROUP_CONCAT(p.image_url) AS photos
      FROM trees t
      LEFT JOIN tree_data td
        ON td.tree_id = t.id
      LEFT JOIN seen_observations so
        ON so.tree_id = t.id
      LEFT JOIN wildlife_observations wo
        ON wo.tree_id = t.id
      LEFT JOIN disease_observations dobs
        ON dobs.tree_id = t.id
      LEFT JOIN tree_photos tp
        ON tp.tree_id = t.id
      LEFT JOIN photos p
        ON p.id = tp.photo_id
      WHERE t.latitude IS NOT NULL AND t.longitude IS NOT NULL
      GROUP BY t.id
    `);

    const trees = results.map((tree) => ({
      ...tree,
      photos: tree.photos ? tree.photos.split(",") : [],
    }));

    res.json(trees);
  } catch (err) {
    console.error("GET TREES ERROR:", err);
    res.status(500).json({
      error: "Database error",
      details: err.message
    });
  }
});

module.exports = router;