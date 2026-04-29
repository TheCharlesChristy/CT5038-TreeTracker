const express = require("express");
const { asyncHandler } = require("../middleware/async-handler");
const { createLogger } = require("../../logging");
const { requireAuthenticatedUser } = require("./utils/auth");

const logger = createLogger("routes.api.otm");

function getRouteLogger(req, extra = {}) {
  return req?.log?.scope ? req.log.scope("routes.api.otm", extra) : logger.child(extra);
}

function createOtmRoute({ otmClient, otmConfig, otmSpeciesCache, otmTreeCache, otmSyncQueue }) {
  const router = express.Router();

  // Health check — verify OTM connectivity
  router.get(
    "/otm/health",
    asyncHandler(async (req, res) => {
      const routeLog = getRouteLogger(req, { route: "otm-health" });
      routeLog.info("request.start");

      if (!otmConfig.enabled) {
        res.status(503).json({ ok: false, reason: "not-configured" });
        return;
      }

      const result = await otmClient.health();
      routeLog.info("otm.health.result", result);
      res.status(result.ok ? 200 : 503).json(result);
    })
  );

  // Fetch OTM trees in a bounding box: ?swLat=&swLng=&neLat=&neLng=
  router.get(
    "/otm/trees",
    asyncHandler(async (req, res) => {
      const routeLog = getRouteLogger(req, { route: "otm-trees" });

      if (!otmConfig.enabled) {
        res.json([]);
        return;
      }

      const swLat = parseFloat(req.query.swLat);
      const swLng = parseFloat(req.query.swLng);
      const neLat = parseFloat(req.query.neLat);
      const neLng = parseFloat(req.query.neLng);

      if ([swLat, swLng, neLat, neLng].some((v) => !Number.isFinite(v))) {
        const err = new Error("swLat, swLng, neLat, neLng are required numbers");
        err.name = "ValidationError";
        throw err;
      }

      const cacheKey = `${swLat},${swLng},${neLat},${neLng}`;
      const cached = otmTreeCache.get(cacheKey);
      if (cached) {
        routeLog.info("otm.trees.cache-hit", { cacheKey });
        res.json(cached);
        return;
      }

      routeLog.info("otm.trees.fetch", { swLat, swLng, neLat, neLng });

      let data;
      try {
        const path = `/${otmConfig.instanceName}/plots/?bbox=${swLng},${swLat},${neLng},${neLat}&format=json`;
        data = await otmClient.get(path);
      } catch (err) {
        routeLog.error("otm.trees.fetch-failed", { error: err.message });
        res.json([]);
        return;
      }

      const plots = Array.isArray(data) ? data : (data?.results ?? []);
      const mapped = plots.map((plot) => ({
        id: plot.id,
        latitude: plot.geom?.lat ?? plot.lat,
        longitude: plot.geom?.lng ?? plot.lng,
        species: plot.tree?.species?.common_name ?? null,
        scientificName: plot.tree?.species?.scientific_name ?? null,
        diameter: plot.tree?.diameter ?? null,
        condition: plot.tree?.condition ?? null,
        datePlanted: plot.tree?.date_planted ?? null,
        otmUrl: `${otmConfig.baseUrl}/${otmConfig.instanceName}/plots/${plot.id}/`
      }));

      otmTreeCache.set(cacheKey, mapped);
      routeLog.info("otm.trees.success", { count: mapped.length });
      res.json(mapped);
    })
  );

  // Cached OTM species list
  router.get(
    "/otm/species",
    asyncHandler(async (req, res) => {
      const routeLog = getRouteLogger(req, { route: "otm-species" });

      if (!otmConfig.enabled) {
        res.json([]);
        return;
      }

      const cached = otmSpeciesCache.get("species");
      if (cached) {
        routeLog.info("otm.species.cache-hit");
        res.json(cached);
        return;
      }

      routeLog.info("otm.species.fetch");
      let data;
      try {
        data = await otmClient.get(`/${otmConfig.instanceName}/species/`);
      } catch (err) {
        routeLog.error("otm.species.fetch-failed", { error: err.message });
        res.json([]);
        return;
      }

      const species = Array.isArray(data) ? data : (data?.results ?? []);
      const mapped = species.map((s) => ({
        otmId: s.id,
        commonName: s.common_name ?? "",
        scientificName: s.scientific_name ?? "",
        usdaSymbol: s.otm_code ?? s.symbol ?? "",
        itreeCode: s.itree_code ?? ""
      }));

      otmSpeciesCache.set("species", mapped);
      routeLog.info("otm.species.success", { count: mapped.length });
      res.json(mapped);
    })
  );

  // iTree ecoservice data for a plot
  router.get(
    "/otm/ecoservice",
    asyncHandler(async (req, res) => {
      const routeLog = getRouteLogger(req, { route: "otm-ecoservice" });

      const plotId = req.query.plot_id;
      if (!plotId) {
        const err = new Error("plot_id is required");
        err.name = "ValidationError";
        throw err;
      }

      if (!otmConfig.enabled) {
        res.json(null);
        return;
      }

      routeLog.info("otm.ecoservice.fetch", { plotId });
      let data;
      try {
        data = await otmClient.get(`/${otmConfig.instanceName}/plots/${plotId}/`);
      } catch (err) {
        routeLog.error("otm.ecoservice.fetch-failed", { plotId, error: err.message });
        res.json(null);
        return;
      }

      const benefits = data?.tree?.eco ?? data?.eco ?? null;
      res.json({
        plotId,
        benefits,
        source: "OpenTreeMap / iTree"
      });
    })
  );

  // Admin: OTM sync status
  router.get(
    "/otm/sync-status",
    asyncHandler(async (req, res) => {
      await requireAuthenticatedUser({ req, db: null, routeLog: getRouteLogger(req, { route: "otm-sync-status" }) });
      res.json(otmSyncQueue.getStatus());
    })
  );

  return router;
}

module.exports = { createOtmRoute };
