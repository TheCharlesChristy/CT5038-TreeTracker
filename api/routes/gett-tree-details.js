const express = require("express");
const conn = require("../db");

const router = express.Router();

// GET /api/get-tree-details?tree_id=1
router.get("/get-tree-details", (req, res) => {

  const tree_id = req.query.tree_id;

  if (!tree_id) {
    return res.status(400).json({ error: "Missing tree_id" });
  }

  const sql = `
    SELECT
      t.id,
      t.latitude,
      t.longitude,
      td.trunk_diameter,
      td.tree_height,
	  td.circumference
    FROM trees t
    LEFT JOIN tree_data td
      ON td.tree_id = t.id
    WHERE t.id = ?
  `;

  conn.query(sql, [tree_id], (err, results) => {

    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Tree not found" });
    }

    res.json(results[0]); // return single object
  });

});

module.exports = router;