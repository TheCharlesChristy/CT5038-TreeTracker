const express = require("express");
const { asyncHandler } = require("../middleware/async-handler");
const { parsePositiveInt, parseListParams, requireJson } = require("./utils/http");

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

function mapTreeRow(tree, dataRow, seenRows, wildlifeRows, diseaseRows, photos) {
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
    photos
  };
}

function createTreesRoute({ db }) {
  const router = express.Router();

  const createTreeHandler = async (req, res) => {
    requireJson(req);

    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      const error = new Error("latitude and longitude are required numbers");
      error.name = "ValidationError";
      throw error;
    }

    const treeDataFields = normalizeTreeDataPayload(req.body);
    const wildlifeEntries = normalizeStringList(req.body.wildlifeList ?? req.body.wildlife);
    const diseaseEntries = normalizeStringList(req.body.diseaseList ?? req.body.disease);

    const treeId = await db.transaction(async (tx) => {
      const tree = await db.trees.create({ latitude, longitude }, tx);
      const creatorUserId = req.body.creatorUserId === undefined ? 1 : req.body.creatorUserId;

      await db.treeCreationData.create(
        {
          treeId: tree.id,
          creatorUserId: creatorUserId === null ? null : Number(creatorUserId)
        },
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
        const comment = await db.comments.create({ userId: null }, tx);
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
        const comment = await db.comments.create({ userId: null }, tx);
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
        const comment = await db.comments.create({ userId: null }, tx);
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

    res.json({ success: true, tree_id: treeId });
  };

  const listTreesHandler = async (req, res) => {
    const { limit, offset } = parseListParams(req.query);
    const trees = await db.trees.list({ limit, offset });

    const result = await Promise.all(
      trees.map(async (tree) => {
        const [dataRow, seenRows, wildlifeRows, diseaseRows, photoIds] = await Promise.all([
          db.treeData.getByTreeId(tree.id),
          db.seenObservations.listByTreeId(tree.id, { limit: 1, offset: 0, order: "desc" }),
          db.wildlifeObservations.listByTreeId(tree.id, { limit: 100, offset: 0, order: "desc" }),
          db.diseaseObservations.listByTreeId(tree.id, { limit: 100, offset: 0, order: "desc" }),
          db.treePhotos.listPhotoIdsByTree(tree.id, { limit: 100, offset: 0 })
        ]);

        const photoRows = await Promise.all(photoIds.map((photoId) => db.photos.getById(photoId)));
        const photos = photoRows
          .filter((photo) => photo && typeof photo.image_url === "string")
          .map((photo) => photo.image_url);

        return mapTreeRow(tree, dataRow, seenRows, wildlifeRows, diseaseRows, photos);
      })
    );

    res.json(result);
  };

  const getTreeDetailsHandler = async (req, res, treeIdInput) => {
    const treeId = parsePositiveInt(treeIdInput, "treeId");
    const tree = await db.trees.getById(treeId);
    if (!tree) {
      res.status(404).json({ error: "Tree not found" });
      return;
    }

    const dataRow = await db.treeData.getByTreeId(treeId);

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

  return router;
}

module.exports = {
  createTreesRoute
};
