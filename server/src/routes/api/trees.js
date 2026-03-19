const express = require("express");
const { asyncHandler } = require("../middleware/async-handler");
const { parsePositiveInt, parseListParams, requireJson } = require("./utils/http");

function mapTreeRow(tree, dataRow, seenRows, wildlifeRows, diseaseRows, photos) {
  return {
    id: tree.id,
    latitude: tree.latitude,
    longitude: tree.longitude,
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
    wildlife: wildlifeRows[0] ? wildlifeRows[0].wildlife : null,
    disease: diseaseRows[0] ? diseaseRows[0].disease : null,
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
          trunkDiameter: req.body.diameter ?? null,
          trunkCircumference: req.body.circumference ?? null,
          treeHeight: req.body.height ?? null
        },
        tx
      );

      const comment = await db.comments.create({ userId: null }, tx);

      if (req.body.notes) {
        await db.seenObservations.create(
          {
            commentId: comment.id,
            treeId: tree.id,
            observationNotes: String(req.body.notes)
          },
          tx
        );
      }

      if (req.body.wildlife) {
        await db.wildlifeObservations.create(
          {
            commentId: comment.id,
            treeId: tree.id,
            wildlife: String(req.body.wildlife),
            wildlifeFound: true,
            observationNotes: null
          },
          tx
        );
      }

      if (req.body.disease) {
        await db.diseaseObservations.create(
          {
            commentId: comment.id,
            treeId: tree.id,
            disease: String(req.body.disease),
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
          db.wildlifeObservations.listByTreeId(tree.id, { limit: 1, offset: 0, order: "desc" }),
          db.diseaseObservations.listByTreeId(tree.id, { limit: 1, offset: 0, order: "desc" }),
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
