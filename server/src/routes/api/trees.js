const express = require("express");
const { asyncHandler } = require("../middleware/async-handler");
const { createLogger } = require("../../logging");
const { parsePositiveInt, parseListParams, requireJson } = require("./utils/http");
const { requireAuthenticatedUser } = require("./utils/auth");
const fs = require('fs');
const path = require('path');

const DEFAULT_TREE_DATA = {
  treeSpecies: "Unknown",
  avoidedRunoff: 0,
  carbonDioxideStored: 0,
  carbonDioxideRemoved: 0,
  waterIntercepted: 0,
  airQualityImprovement: 0,
  leafArea: 0,
  evapotranspiration: 0,
  trunkCircumference: 0,
  trunkDiameter: 0,
  treeHeight: 0,
  health: "ok"
};

function toFiniteNumberOrDefault(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTreeDataPayload(body) {
  return {
    treeSpecies:
      typeof body.species === "string" && body.species.trim().length > 0
        ? body.species.trim()
        : DEFAULT_TREE_DATA.treeSpecies,
    avoidedRunoff: toFiniteNumberOrDefault(body.avoidedRunoff, DEFAULT_TREE_DATA.avoidedRunoff),
    carbonDioxideStored: toFiniteNumberOrDefault(body.carbonDioxideStored, DEFAULT_TREE_DATA.carbonDioxideStored),
    carbonDioxideRemoved: toFiniteNumberOrDefault(body.carbonDioxideRemoved, DEFAULT_TREE_DATA.carbonDioxideRemoved),
    waterIntercepted: toFiniteNumberOrDefault(body.waterIntercepted, DEFAULT_TREE_DATA.waterIntercepted),
    airQualityImprovement: toFiniteNumberOrDefault(body.airQualityImprovement, DEFAULT_TREE_DATA.airQualityImprovement),
    leafArea: toFiniteNumberOrDefault(body.leafArea, DEFAULT_TREE_DATA.leafArea),
    evapotranspiration: toFiniteNumberOrDefault(body.evapotranspiration, DEFAULT_TREE_DATA.evapotranspiration),
    trunkCircumference: toFiniteNumberOrDefault(body.circumference, DEFAULT_TREE_DATA.trunkCircumference),
    trunkDiameter: toFiniteNumberOrDefault(body.diameter, DEFAULT_TREE_DATA.trunkDiameter),
    treeHeight: toFiniteNumberOrDefault(body.height, DEFAULT_TREE_DATA.treeHeight),
    health:
      body.health === "excellent" ||
      body.health === "good" ||
      body.health === "ok" ||
      body.health === "bad" ||
      body.health === "terrible"
        ? body.health
        : DEFAULT_TREE_DATA.health
  };
}

function normalizeStringList(value) {
  const values = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];

  return values
    .map((entry) => String(entry).trim())
    .filter((entry) => entry.length > 0);
}

function joinObservationValues(rows, key) {
  const values = rows
    .map((row) => row && typeof row[key] === "string" ? row[key].trim() : "")
    .filter((value) => value.length > 0);

  return values.length > 0 ? Array.from(new Set(values)).join(", ") : null;
}

function mapTreeRow(tree, dataRow, seenRows, wildlifeRows, diseaseRows, photos, creationRow, guardianUserIds) {
  return {
    id: tree.id,
    latitude: tree.latitude,
    longitude: tree.longitude,
    species: dataRow ? dataRow.tree_species : null,
    diameter: dataRow ? dataRow.trunk_diameter : null,
    height: dataRow ? dataRow.tree_height : null,
    circumference: dataRow ? dataRow.trunk_circumference : null,
    avoidedRunoff: dataRow ? dataRow.avoided_runoff : null,
    carbonDioxideStored: dataRow ? dataRow.carbon_dioxide_stored : null,
    carbonDioxideRemoved: dataRow ? dataRow.carbon_dioxide_removed : null,
    waterIntercepted: dataRow ? dataRow.water_intercepted : null,
    airQualityImprovement: dataRow ? dataRow.air_quality_improvement : null,
    leafArea: dataRow ? dataRow.leaf_area : null,
    evapotranspiration: dataRow ? dataRow.evapotranspiration : null,
    health: dataRow ? dataRow.health : null,
    notes: seenRows[0] ? seenRows[0].observation_notes : null,
    wildlife: joinObservationValues(wildlifeRows, "wildlife"),
    disease: joinObservationValues(diseaseRows, "disease"),
    photos,
    creator_user_id: creationRow ? Number(creationRow.creator_user_id) : null,
    created_at: creationRow ? creationRow.created_at : null,
    guardian_user_ids: Array.isArray(guardianUserIds)
      ? guardianUserIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : []
  };
}

const logger = createLogger("routes.api.trees");

function getRouteLogger(req, extra = {}) {
  return req?.log?.scope ? req.log.scope("routes.api.trees", extra) : logger.child(extra);
}

function createTreesRoute({ db }) {
  const router = express.Router();

  const createTreeHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "create-tree" });
    const wildlifeInput = req.body?.wildlifeList ?? req.body?.wildlife;
    const diseaseInput = req.body?.diseaseList ?? req.body?.disease;
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url,
      latitudePresent: req.body?.latitude !== undefined,
      longitudePresent: req.body?.longitude !== undefined,
      wildlifeCount: Array.isArray(wildlifeInput) ? wildlifeInput.length : wildlifeInput ? 1 : 0,
      diseaseCount: Array.isArray(diseaseInput) ? diseaseInput.length : diseaseInput ? 1 : 0
    });

    requireJson(req);

    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      routeLog.warn("validation.failed", { reason: "invalid-coordinates" });
      const error = new Error("latitude and longitude are required numbers");
      error.name = "ValidationError";
      throw error;
    }

    routeLog.info("tree.create.begin", {
      latitude,
      longitude,
      notesPresent: Boolean(req.body.notes)
    });
    const auth = await requireAuthenticatedUser({ req, db, routeLog });

    const treeDataFields = normalizeTreeDataPayload(req.body);
    const wildlifeEntries = normalizeStringList(wildlifeInput);
    const diseaseEntries = normalizeStringList(diseaseInput);

    const treeId = await db.transaction(async (tx) => {
      routeLog.debug("tree.transaction.start", {
        wildlifeCount: wildlifeEntries.length,
        diseaseCount: diseaseEntries.length
      });
      const tree = await db.trees.create({ latitude, longitude }, tx);

      await db.treeCreationData.create(
        {
          treeId: tree.id,
          creatorUserId: Number(auth.user.id)
        },
        tx
      );

      await db.guardians.add(
        { treeId: tree.id, userId: Number(auth.user.id) },
        tx
      );

      await db.treeData.create(
        {
          treeId: tree.id,
          ...treeDataFields
        },
        tx
      );

      if (req.body.notes) {
        const comment = await db.comments.create({ userId: Number(auth.user.id) }, tx);
        await db.seenObservations.create(
          {
            commentId: comment.id,
            treeId: tree.id,
            observationNotes: String(req.body.notes)
          },
          tx
        );
      }

      for (const wildlife of wildlifeEntries) {
        const comment = await db.comments.create({ userId: Number(auth.user.id) }, tx);
        await db.wildlifeObservations.create(
          {
            commentId: comment.id,
            treeId: tree.id,
            wildlife,
            wildlifeFound: true,
            observationNotes: null
          },
          tx
        );
      }

      for (const disease of diseaseEntries) {
        const comment = await db.comments.create({ userId: Number(auth.user.id) }, tx);
        await db.diseaseObservations.create(
          {
            commentId: comment.id,
            treeId: tree.id,
            disease,
            evidence: ""
          },
          tx
        );
      }

      return tree.id;
    });

    routeLog.info("tree.create.success", {
      treeId
    });

    res.json({ success: true, tree_id: treeId });
  };

  const listRecentTreesHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "list-recent-trees" });

    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url,
      query: req.query
    });

    const limit = parsePositiveInt(req.query.limit || 6, "limit");

    // Fetch recent creation records
    const recent = await db.treeCreationData.list({
      limit,
      offset: 0,
      order: "desc"
    });

    routeLog.debug("recent.creation.rows", { count: recent.length });

    const result = await Promise.all(
      recent.map(async (creationRow) => {
        const treeId = creationRow.tree_id;

        const [tree, dataRow, user] = await Promise.all([
          db.trees.getById(treeId),
          db.treeData.getByTreeId(treeId),
          creationRow.creator_user_id
            ? db.users.getById(creationRow.creator_user_id)
            : null
        ]);

        if (!tree) return null;

        return {
          id: tree.id,
          latitude: tree.latitude,
          longitude: tree.longitude,
          tree_species: dataRow ? dataRow.tree_species : null,
          created_at: creationRow.created_at,
          creator_user_id: creationRow.creator_user_id,
          creator_username: user ? user.username : null
        };
      })
    );

    const filtered = result.filter(Boolean);

    routeLog.info("request.success", { count: filtered.length });

    res.json(filtered);
  };

  const listTreesHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "list-trees" });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url,
      query: req.query
    });

    const { limit, offset } = parseListParams(req.query);
    routeLog.debug("query.normalized", { limit, offset });
    const trees = await db.trees.list({ limit, offset });
    routeLog.info("trees.list.fetched", { count: trees.length });

    const result = await Promise.all(
      trees.map(async (tree) => {
        const [dataRow, seenRows, wildlifeRows, diseaseRows, photoIds, creationRow, guardianUserIds] = await Promise.all([
          db.treeData.getByTreeId(tree.id),
          db.seenObservations.listByTreeId(tree.id, { limit: 1, offset: 0, order: "desc" }),
          db.wildlifeObservations.listByTreeId(tree.id, { limit: 100, offset: 0, order: "desc" }),
          db.diseaseObservations.listByTreeId(tree.id, { limit: 100, offset: 0, order: "desc" }),
          db.treePhotos.listPhotoIdsByTree(tree.id, { limit: 100, offset: 0 }),
          db.treeCreationData.getByTreeId(tree.id),
          db.guardians.listByTree(tree.id, { limit: 100, offset: 0 })
        ]);

        const photoRows = await Promise.all(photoIds.map((photoId) => db.photos.getById(photoId)));
        const photos = photoRows
          .filter((photo) => photo && typeof photo.image_url === "string")
          .map((photo) => ({
            id: Number(photo.id),
            image_url: photo.image_url,
            mimeType: photo.mime_type || undefined
          }));

        return mapTreeRow(
          tree,
          dataRow,
          seenRows,
          wildlifeRows,
          diseaseRows,
          photos,
          creationRow,
          guardianUserIds
        );
      })
    );

    routeLog.info("request.success", { count: result.length });
    res.json(result);
  };

  const getTreeDetailsHandler = async (req, res, treeIdInput) => {
    const routeLog = getRouteLogger(req, { route: "get-tree-details" });
    const treeId = parsePositiveInt(treeIdInput, "treeId");
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url,
      treeId
    });

    const tree = await db.trees.getById(treeId);
    if (!tree) {
      routeLog.warn("lookup.miss", { treeId });
      res.status(404).json({ error: "Tree not found" });
      return;
    }

    const dataRow = await db.treeData.getByTreeId(treeId);

    routeLog.info("request.success", { treeId });
    res.json({
      id: tree.id,
      latitude: tree.latitude,
      longitude: tree.longitude,
      tree_species: dataRow ? dataRow.tree_species : null,
      trunk_diameter: dataRow ? dataRow.trunk_diameter : null,
      tree_height: dataRow ? dataRow.tree_height : null,
      circumference: dataRow ? dataRow.trunk_circumference : null,
      avoided_runoff: dataRow ? dataRow.avoided_runoff : null,
      carbon_dioxide_stored: dataRow ? dataRow.carbon_dioxide_stored : null,
      carbon_dioxide_removed: dataRow ? dataRow.carbon_dioxide_removed : null,
      water_intercepted: dataRow ? dataRow.water_intercepted : null,
      air_quality_improvement: dataRow ? dataRow.air_quality_improvement : null,
      leaf_area: dataRow ? dataRow.leaf_area : null,
      evapotranspiration: dataRow ? dataRow.evapotranspiration : null,
      health: dataRow ? dataRow.health : null
    });
  };

  router.post("/trees", asyncHandler(createTreeHandler));
  router.post("/add-tree-data", asyncHandler(createTreeHandler));

  router.get("/trees", asyncHandler(listTreesHandler));
  router.get("/get-trees", asyncHandler(listTreesHandler));

  router.get(
    "/trees/recent",
    asyncHandler(listRecentTreesHandler)
  );

  router.get(
    "/trees/:treeId",
    asyncHandler(async (req, res) => {
      await getTreeDetailsHandler(req, res, req.params.treeId);
    })
  );

  router.get(
    "/get-tree-details",
    asyncHandler(async (req, res) => {
      await getTreeDetailsHandler(req, res, req.query.tree_id);
    })
  );

  router.delete(
    "/trees/:treeId",
    asyncHandler(async (req, res) => {
      const routeLog = getRouteLogger(req, { route: "delete-tree" });

      const treeId = parsePositiveInt(req.params.treeId, "treeId");

      routeLog.info("request.start", {
        method: req.method,
        path: req.originalUrl || req.url,
        treeId,
      });

      const auth = await requireAuthenticatedUser({
        req,
        db,
        routeLog,
      });

      let deleted = false;

      await db.transaction(async (tx) => {
        const tree = await db.trees.getById(treeId, tx);

        if (!tree) {
          const error = new Error("Tree not found");
          error.name = "NotFoundError";
          throw error;
        }

        await db.trees.deleteById(treeId, tx);

        deleted = true;
      });

      routeLog.info("request.success", { treeId });

      res.json({
        success: true,
        deleted,
      });
    })
  );

  router.delete(
    "/trees/:treeId/photos/:photoId",
    asyncHandler(async (req, res) => {
      const routeLog = getRouteLogger(req, { route: "delete-tree-photo" });
      const auth = await requireAuthenticatedUser({ req, db, routeLog });

      const treeId = Number(req.params.treeId);
      const photoId = Number(req.params.photoId);
      const userId = Number(auth.user.id);

      if (!treeId || Number.isNaN(treeId) || !photoId || Number.isNaN(photoId)) {
        res.status(400).json({ error: "Invalid tree ID or photo ID." });
        return;
      }

      let deletedImageUrl = null;

      await db.transaction(async (tx) => {
        const photo = await db.photos.getById(photoId, tx);
        const linkedToTree = await db.treePhotos.exists({ treeId, photoId }, tx);

        if (!photo || !linkedToTree) {
          const error = new Error("Photo not found for this tree.");
          error.statusCode = 404;
          throw error;
        }

        const [isAdmin, isGuardian] = await Promise.all([
          db.admins.isAdmin(userId, tx),
          db.guardians.exists({ userId, treeId }, tx)
        ]);

        if (!isAdmin && !isGuardian) {
          const error = new Error("Only admins or guardians of this tree can delete its photos.");
          error.statusCode = 403;
          throw error;
        }

        await db.treePhotos.remove({ treeId, photoId }, tx);

        const remainingCount = await db.treePhotos.countByPhotoId(photoId, tx);

        if (remainingCount === 0) {
          deletedImageUrl = photo.image_url;
          await db.photos.deleteById(photoId, tx);
        }
      });

      if (deletedImageUrl) {
        const relativePath = String(deletedImageUrl).replace(/^\/+/, "");
        const absolutePath = path.join(process.cwd(), relativePath);

        fs.unlink(absolutePath, (err) => {
          if (err) {
            console.warn("Could not delete photo file from disk:", err.message);
          }
        });
      }

      res.json({ success: true });
    })
  );

  router.get(
    "/comments/recent",
    asyncHandler(async (req, res) => {
      const limit = parsePositiveInt(req.query.limit || 8, "limit");
      const items = await db.workflows.trees.getRecentComments({ limit, offset: 0 });
      res.json(items);
    })
  );

  router.get(
    "/trees/:treeId/feed",
    asyncHandler(async (req, res) => {
      const treeId = parsePositiveInt(req.params.treeId, "treeId");
      const { limit, offset } = parseListParams(req.query);

      const items = await db.workflows.trees.getTreeFeed(treeId, { limit, offset });
      res.json(items);
    })
  );

  router.delete(
    "/comments/:commentId",
    asyncHandler(async (req, res) => {
      const commentId = parsePositiveInt(req.params.commentId, "commentId");

      const auth = await requireAuthenticatedUser({
        req,
        db,
        routeLog: getRouteLogger(req, { route: "delete-comment" }),
      });

      await db.workflows.comments.deleteTreeComment({
        commentId,
        userId: Number(auth.user.id),
      });

      res.json({ success: true });
    })
  );

  router.post(
    "/trees/:treeId/comments",
    asyncHandler(async (req, res) => {
      requireJson(req);

      const treeId = parsePositiveInt(req.params.treeId, "treeId");
      const auth = await requireAuthenticatedUser({ req, db, routeLog: getRouteLogger(req, { route: "add-tree-comment"}) });

      const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
      if (!content) {
        const error = new Error("content is required");
        error.name = "ValidationError";
        throw error;
      }

      const result = await db.workflows.comments.addTreeComment({
        treeId,
        userId: Number(auth.user.id),
        content,
        photoIds: Array.isArray(req.body?.photoIds) ? req.body.photoIds : []
      });

      res.status(201).json({
        success: true,
        comment_id: result.commentId
      });
    })
  )

  return router;
}

module.exports = {
  createTreesRoute
};