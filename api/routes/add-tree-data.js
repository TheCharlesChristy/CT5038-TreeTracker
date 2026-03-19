const express = require('express');
const db = require("../db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

router.use(express.json());

router.post('/add-tree-data', authenticateToken, async (req, res) => {
  const {
    latitude,
    longitude,
    notes,
    wildlife,
    disease,
    diameter,
    height,
    circumference,
  } = req.body;

  const userId = req.user.userId;
   
  let connection; 
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Insert base tree
    const [treeResult] = await connection.query(
      'INSERT INTO trees (latitude, longitude) VALUES (?, ?)',
      [latitude, longitude]
    );
    const treeId = treeResult.insertId;
      
    // Insert Tree Creation Data
    await connection.query(
      `INSERT INTO tree_creation_data (tree_id, creator_user_id)
       VALUES (?, ?)`,
      [treeId, userId]
    );

    // Insert tree_data
    await connection.query(
      `INSERT INTO tree_data (tree_id, trunk_diameter, trunk_circumference, tree_height)
       VALUES (?, ?, ?, ?)`,
      [treeId, diameter || null, circumference || null, height || null]
    );

    // Insert a base comment for linking observations
    const [commentResult] = await connection.query(
      'INSERT INTO comments (user_id) VALUES (?)',
      [userId]
    );
    const commentId = commentResult.insertId;

    // Insert seen notes
    if (notes) {
      await connection.query(
        'INSERT INTO seen_observations (comment_id, tree_id, observation_notes) VALUES (?, ?, ?)',
        [commentId, treeId, notes]
      );
    }

    // Insert wildlife
    if (wildlife) {
      await connection.query(
        'INSERT INTO wildlife_observations (comment_id, tree_id, wildlife, wildlife_found) VALUES (?, ?, ?, 1)',
        [commentId, treeId, wildlife]
      );
    }

    // Insert disease
    if (disease) {
      await connection.query(
        'INSERT INTO disease_observations (comment_id, tree_id, disease, evidence) VALUES (?, ?, ?, "")',
        [commentId, treeId, disease]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      tree_id: treeId,
      creator_user_id: userId
    });
  } catch (err) {
    console.error("TREE INSERT ERROR:", err);

    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      error: "Failed to create tree",
      details: err.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;