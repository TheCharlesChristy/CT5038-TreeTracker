function createTreeEndpoints(ctx) {
  const { run, selectOne, runtimeExecutor, toDateInput, buildUpdate, validators, NotFoundError } = ctx;
  const {
    assert,
    ensurePositiveInt,
    ensureLatitude,
    ensureLongitude,
    ensureNumberOrNull,
    ensureStringMax,
    normalizeListParams
  } = validators;

  const trees = {
    async create(payload, tx) {
      ensureLatitude(payload.latitude);
      ensureLongitude(payload.longitude);
      const result = await run(runtimeExecutor(tx), "INSERT INTO trees (latitude, longitude) VALUES (?, ?)", [
        payload.latitude,
        payload.longitude
      ]);
      return this.getById(Number(result.insertId), tx);
    },

    async getById(id, tx) {
      ensurePositiveInt("id", id);
      return selectOne(runtimeExecutor(tx), "SELECT id, latitude, longitude FROM trees WHERE id = ?", [id]);
    },

    async list(params = {}, tx) {
      const { limit, offset } = normalizeListParams(params);
      return run(runtimeExecutor(tx), "SELECT id, latitude, longitude FROM trees ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset]);
    },

    async updateById(id, fields, tx) {
      ensurePositiveInt("id", id);
      if (fields.latitude !== undefined) ensureLatitude(fields.latitude);
      if (fields.longitude !== undefined) ensureLongitude(fields.longitude);
      const { updates, params } = buildUpdate(fields, {
        latitude: "latitude",
        longitude: "longitude"
      });
      const result = await run(runtimeExecutor(tx), `UPDATE trees SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);
      if (result.affectedRows === 0) {
        throw new NotFoundError(`Tree ${id} not found`);
      }
      return this.getById(id, tx);
    },

    async deleteById(id, tx) {
      ensurePositiveInt("id", id);
      const result = await run(runtimeExecutor(tx), "DELETE FROM trees WHERE id = ?", [id]);
      return { deleted: result.affectedRows > 0 };
    },

    async findByBoundingBox(params, tx) {
      ensureLatitude(params.latMin);
      ensureLatitude(params.latMax);
      ensureLongitude(params.lonMin);
      ensureLongitude(params.lonMax);
      const { limit, offset } = normalizeListParams(params);

      return run(
        runtimeExecutor(tx),
        "SELECT id, latitude, longitude FROM trees WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ? ORDER BY id DESC LIMIT ? OFFSET ?",
        [params.latMin, params.latMax, params.lonMin, params.lonMax, limit, offset]
      );
    },

    async findNear(params, tx) {
      ensureLatitude(params.latitude);
      ensureLongitude(params.longitude);
      assert(Number.isFinite(params.radiusMeters) && params.radiusMeters > 0, "radiusMeters must be a finite number > 0");
      const limit = params.limit === undefined ? 50 : Number(params.limit);
      assert(Number.isInteger(limit) && limit > 0 && limit <= 500, "limit must be integer 1..500");

      const latDelta = params.radiusMeters / 111320;
      const lonBase = Math.cos((params.latitude * Math.PI) / 180);
      const lonDelta = params.radiusMeters / (111320 * Math.max(Math.abs(lonBase), 0.01));

      return run(
        runtimeExecutor(tx),
        "SELECT id, latitude, longitude FROM trees WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ? LIMIT ?",
        [params.latitude - latDelta, params.latitude + latDelta, params.longitude - lonDelta, params.longitude + lonDelta, limit]
      );
    },

    async count(tx) {
      const row = await selectOne(runtimeExecutor(tx), "SELECT COUNT(*) AS total FROM trees");
      return row ? Number(row.total) : 0;
    }
  };

  const treeCreationData = {
    async create(payload, tx) {
      ensurePositiveInt("treeId", payload.treeId);
      if (payload.creatorUserId !== undefined && payload.creatorUserId !== null) {
        ensurePositiveInt("creatorUserId", payload.creatorUserId);
      }
      const createdAt = toDateInput("createdAt", payload.createdAt);

      const result = await run(
        runtimeExecutor(tx),
        "INSERT INTO tree_creation_data (tree_id, creator_user_id, created_at) VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP))",
        [payload.treeId, payload.creatorUserId || null, createdAt || null]
      );
      return this.getById(Number(result.insertId), tx);
    },

    async getById(id, tx) {
      ensurePositiveInt("id", id);
      return selectOne(
        runtimeExecutor(tx),
        "SELECT id, tree_id, creator_user_id, created_at FROM tree_creation_data WHERE id = ?",
        [id]
      );
    },

    async getByTreeId(treeId, tx) {
      ensurePositiveInt("treeId", treeId);
      return selectOne(
        runtimeExecutor(tx),
        "SELECT id, tree_id, creator_user_id, created_at FROM tree_creation_data WHERE tree_id = ? ORDER BY id DESC LIMIT 1",
        [treeId]
      );
    },

    async list(params = {}, tx) {
      const { limit, offset } = normalizeListParams(params);
      return run(
        runtimeExecutor(tx),
        "SELECT id, tree_id, creator_user_id, created_at FROM tree_creation_data ORDER BY id DESC LIMIT ? OFFSET ?",
        [limit, offset]
      );
    },

    async updateById(id, fields, tx) {
      ensurePositiveInt("id", id);
      if (fields.creatorUserId !== undefined && fields.creatorUserId !== null) {
        ensurePositiveInt("creatorUserId", fields.creatorUserId);
      }
      if (fields.createdAt !== undefined && fields.createdAt !== null) {
        fields.createdAt = toDateInput("createdAt", fields.createdAt);
      }

      const { updates, params } = buildUpdate(fields, {
        creatorUserId: "creator_user_id",
        createdAt: "created_at"
      });

      const result = await run(runtimeExecutor(tx), `UPDATE tree_creation_data SET ${updates.join(", ")} WHERE id = ?`, [
        ...params,
        id
      ]);
      if (result.affectedRows === 0) {
        throw new NotFoundError(`tree_creation_data ${id} not found`);
      }
      return this.getById(id, tx);
    },

    async deleteById(id, tx) {
      ensurePositiveInt("id", id);
      const result = await run(runtimeExecutor(tx), "DELETE FROM tree_creation_data WHERE id = ?", [id]);
      return { deleted: result.affectedRows > 0 };
    },

    async deleteByTreeId(treeId, tx) {
      ensurePositiveInt("treeId", treeId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM tree_creation_data WHERE tree_id = ?", [treeId]);
      return { count: result.affectedRows };
    }
  };

  const TREE_DATA_NUMERIC_FIELDS = {
    avoidedRunoff: "avoided_runoff",
    carbonDioxideStored: "carbon_dioxide_stored",
    carbonDioxideRemoved: "carbon_dioxide_removed",
    waterIntercepted: "water_intercepted",
    airQualityImprovement: "air_quality_improvement",
    leafArea: "leaf_area",
    evapotranspiration: "evapotranspiration",
    trunkCircumference: "trunk_circumference",
    trunkDiameter: "trunk_diameter",
    treeHeight: "tree_height"
  };
  const TREE_HEALTH_VALUES = new Set(["good", "ok", "bad"]);

  const treeData = {
    async create(payload, tx) {
      ensurePositiveInt("treeId", payload.treeId);
      ensureStringMax("treeSpecies", payload.treeSpecies, 255);
      if (payload.health !== undefined && payload.health !== null) {
        assert(TREE_HEALTH_VALUES.has(payload.health), "health must be one of good, ok, bad");
      }
      for (const field of Object.keys(TREE_DATA_NUMERIC_FIELDS)) {
        ensureNumberOrNull(field, payload[field]);
      }

      const result = await run(
        runtimeExecutor(tx),
        `INSERT INTO tree_data (
          tree_id, tree_species, avoided_runoff, carbon_dioxide_stored, carbon_dioxide_removed,
          water_intercepted, air_quality_improvement, leaf_area, evapotranspiration,
          trunk_circumference, trunk_diameter, tree_height, health
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.treeId,
          payload.treeSpecies ?? null,
          payload.avoidedRunoff ?? null,
          payload.carbonDioxideStored ?? null,
          payload.carbonDioxideRemoved ?? null,
          payload.waterIntercepted ?? null,
          payload.airQualityImprovement ?? null,
          payload.leafArea ?? null,
          payload.evapotranspiration ?? null,
          payload.trunkCircumference ?? null,
          payload.trunkDiameter ?? null,
          payload.treeHeight ?? null,
          payload.health ?? null
        ]
      );
      return this.getById(Number(result.insertId), tx);
    },

    async getImpactTotals(tx) {
      const row = await selectOne(
        runtimeExecutor(tx),
        `SELECT
          COALESCE(SUM(avoided_runoff), 0) AS avoided_runoff_total,
          COALESCE(SUM(carbon_dioxide_stored), 0) AS carbon_dioxide_stored_total,
          COALESCE(SUM(carbon_dioxide_removed), 0) AS carbon_dioxide_removed_total,
          COALESCE(SUM(water_intercepted), 0) AS water_intercepted_total,
          COALESCE(SUM(air_quality_improvement), 0) AS air_quality_improvement_total,
          COALESCE(SUM(leaf_area), 0) AS leaf_area_total,
          COALESCE(SUM(evapotranspiration), 0) AS evapotranspiration_total,
          COALESCE(SUM(trunk_circumference), 0) AS trunk_circumference_total,
          COALESCE(SUM(trunk_diameter), 0) AS trunk_diameter_total,
          COALESCE(SUM(tree_height), 0) AS tree_height_total
        FROM tree_data`
      );

      return {
        avoidedRunoff: Number(row?.avoided_runoff_total ?? 0),
        carbonDioxideStored: Number(row?.carbon_dioxide_stored_total ?? 0),
        carbonDioxideRemoved: Number(row?.carbon_dioxide_removed_total ?? 0),
        waterIntercepted: Number(row?.water_intercepted_total ?? 0),
        airQualityImprovement: Number(row?.air_quality_improvement_total ?? 0),
        leafArea: Number(row?.leaf_area_total ?? 0),
        evapotranspiration: Number(row?.evapotranspiration_total ?? 0),
        trunkCircumference: Number(row?.trunk_circumference_total ?? 0),
        trunkDiameter: Number(row?.trunk_diameter_total ?? 0),
        treeHeight: Number(row?.tree_height_total ?? 0)
      };
    },

    async getById(id, tx) {
      ensurePositiveInt("id", id);
      return selectOne(runtimeExecutor(tx), "SELECT * FROM tree_data WHERE id = ?", [id]);
    },

    async getByTreeId(treeId, tx) {
      ensurePositiveInt("treeId", treeId);
      return selectOne(runtimeExecutor(tx), "SELECT * FROM tree_data WHERE tree_id = ? ORDER BY id DESC LIMIT 1", [treeId]);
    },

    async updateByTreeId(treeId, fields, tx) {
      ensurePositiveInt("treeId", treeId);
      if (Object.prototype.hasOwnProperty.call(fields, "treeSpecies")) {
        ensureStringMax("treeSpecies", fields.treeSpecies, 255);
      }
      if (Object.prototype.hasOwnProperty.call(fields, "health") && fields.health !== null) {
        assert(TREE_HEALTH_VALUES.has(fields.health), "health must be one of good, ok, bad");
      }
      for (const field of Object.keys(TREE_DATA_NUMERIC_FIELDS)) {
        if (Object.prototype.hasOwnProperty.call(fields, field)) {
          ensureNumberOrNull(field, fields[field]);
        }
      }

      const { updates, params } = buildUpdate(fields, {
        treeSpecies: "tree_species",
        health: "health",
        ...TREE_DATA_NUMERIC_FIELDS
      });

      const result = await run(runtimeExecutor(tx), `UPDATE tree_data SET ${updates.join(", ")} WHERE tree_id = ?`, [
        ...params,
        treeId
      ]);
      if (result.affectedRows === 0) {
        throw new NotFoundError(`tree_data for tree ${treeId} not found`);
      }
      return this.getByTreeId(treeId, tx);
    },

    async deleteByTreeId(treeId, tx) {
      ensurePositiveInt("treeId", treeId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM tree_data WHERE tree_id = ?", [treeId]);
      return { deleted: result.affectedRows > 0 };
    },

    async list(params = {}, tx) {
      const { limit, offset } = normalizeListParams(params);
      return run(runtimeExecutor(tx), "SELECT * FROM tree_data ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset]);
    }
  };

  const guardians = {
    async add(payload, tx) {
      ensurePositiveInt("userId", payload.userId);
      ensurePositiveInt("treeId", payload.treeId);
      const result = await run(runtimeExecutor(tx), "INSERT IGNORE INTO guardian_trees (user_id, tree_id) VALUES (?, ?)", [
        payload.userId,
        payload.treeId
      ]);
      return { added: result.affectedRows > 0 };
    },

    async remove(payload, tx) {
      ensurePositiveInt("userId", payload.userId);
      ensurePositiveInt("treeId", payload.treeId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM guardian_trees WHERE user_id = ? AND tree_id = ?", [
        payload.userId,
        payload.treeId
      ]);
      return { removed: result.affectedRows > 0 };
    },

    async exists(payload, tx) {
      ensurePositiveInt("userId", payload.userId);
      ensurePositiveInt("treeId", payload.treeId);
      const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM guardian_trees WHERE user_id = ? AND tree_id = ?", [
        payload.userId,
        payload.treeId
      ]);
      return Boolean(row);
    },

    async listByUser(userId, params = {}, tx) {
      ensurePositiveInt("userId", userId);
      const { limit, offset } = normalizeListParams(params);
      const rows = await run(
        runtimeExecutor(tx),
        "SELECT tree_id FROM guardian_trees WHERE user_id = ? ORDER BY tree_id DESC LIMIT ? OFFSET ?",
        [userId, limit, offset]
      );
      return rows.map((row) => row.tree_id);
    },

    async listByTree(treeId, params = {}, tx) {
      ensurePositiveInt("treeId", treeId);
      const { limit, offset } = normalizeListParams(params);
      const rows = await run(
        runtimeExecutor(tx),
        "SELECT user_id FROM guardian_trees WHERE tree_id = ? ORDER BY user_id DESC LIMIT ? OFFSET ?",
        [treeId, limit, offset]
      );
      return rows.map((row) => row.user_id);
    },

    async countByUser(userId, tx) {
      ensurePositiveInt("userId", userId);
      const row = await selectOne(runtimeExecutor(tx), "SELECT COUNT(*) AS total FROM guardian_trees WHERE user_id = ?", [userId]);
      return Number(row.total || 0);
    },

    async countByTree(treeId, tx) {
      ensurePositiveInt("treeId", treeId);
      const row = await selectOne(runtimeExecutor(tx), "SELECT COUNT(*) AS total FROM guardian_trees WHERE tree_id = ?", [treeId]);
      return Number(row.total || 0);
    }
  };

  return {
    trees,
    treeCreationData,
    treeData,
    guardians
  };
}

module.exports = {
  createTreeEndpoints
};
