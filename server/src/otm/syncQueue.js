const { createLogger } = require("../logging");
const { speciesLabelToUsda } = require("./speciesMap");

const logger = createLogger("otm.syncQueue");

const STATUS_PENDING = "pending";
const STATUS_SYNCED = "synced";
const STATUS_FAILED = "failed";
const STATUS_REVIEW = "needs_review";

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 5000;

/**
 * In-process async queue that submits newly added trees to OTM.
 * On failure it retries with exponential backoff up to MAX_RETRIES times,
 * then marks the record for manual admin review.
 *
 * State is in-memory; on server restart pending items are lost.
 * A production system would persist the queue to the database.
 */
function createOtmSyncQueue({ otmClient, otmConfig, db }) {
  const queue = [];
  let pending = 0;
  let synced = 0;
  let failed = 0;
  let lastSyncedAt = null;
  const failedRecords = [];

  async function submitToOtm(item) {
    const { treeId, latitude, longitude, species, diameterCm, health, createdAt } = item;

    const usdaCode = speciesLabelToUsda(species);
    if (!usdaCode) {
      logger.warn("otm.sync.no-species-match", { treeId, species });
      return { queued: false, reason: "no-species-match" };
    }

    const instancePath = `/${otmConfig.instanceName}`;

    // Create Plot
    const plotPayload = {
      plot: {
        geom: { lat: latitude, lng: longitude },
        feature_type: "Plot"
      }
    };
    const plotResult = await otmClient.post(`${instancePath}/plots/`, plotPayload);
    const plotId = plotResult?.plot?.id ?? plotResult?.id;
    if (!plotId) {
      throw new Error("OTM did not return a plot ID");
    }

    // Create Tree linked to Plot
    const diameterIn = diameterCm ? diameterCm / 2.54 : null;
    const treePayload = {
      tree: {
        species: { otm_code: usdaCode },
        ...(diameterIn ? { diameter: diameterIn } : {}),
        ...(health ? { condition: normalizeCondition(health) } : {}),
        ...(createdAt ? { date_planted: formatDate(createdAt) } : {})
      }
    };
    await otmClient.post(`${instancePath}/plots/${plotId}/tree/`, treePayload);

    return { plotId };
  }

  function normalizeCondition(health) {
    const map = {
      excellent: "Excellent",
      good: "Good",
      ok: "Fair",
      bad: "Poor",
      terrible: "Critical"
    };
    return map[health] ?? "Fair";
  }

  function formatDate(d) {
    if (!d) return null;
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().slice(0, 10);
  }

  async function processItem(item) {
    const { treeId } = item;
    item.attempts = (item.attempts || 0) + 1;

    logger.info("otm.sync.attempt", { treeId, attempt: item.attempts });

    try {
      const result = await submitToOtm(item);

      if (!result.queued === false && result.reason === "no-species-match") {
        item.status = STATUS_REVIEW;
        failedRecords.push({ treeId, reason: "no-species-match", at: new Date().toISOString() });
        logger.warn("otm.sync.queued-for-review", { treeId });
        return;
      }

      item.status = STATUS_SYNCED;
      item.otmPlotId = result.plotId;
      synced += 1;
      lastSyncedAt = new Date().toISOString();
      pending -= 1;

      if (db) {
        try {
          await db.treeData.setOtmPlotId(treeId, result.plotId);
        } catch (err) {
          logger.error("otm.sync.store-plot-id-failed", { treeId, error: err.message });
        }
      }

      logger.info("otm.sync.success", { treeId, plotId: result.plotId });
    } catch (err) {
      logger.error("otm.sync.failed", { treeId, attempt: item.attempts, error: err.message });

      if (item.attempts >= MAX_RETRIES) {
        item.status = STATUS_FAILED;
        failed += 1;
        pending -= 1;
        failedRecords.push({ treeId, reason: err.message, attempts: item.attempts, at: new Date().toISOString() });
        logger.error("otm.sync.exhausted-retries", { treeId });
        return;
      }

      const backoffMs = BASE_BACKOFF_MS * 2 ** (item.attempts - 1);
      logger.info("otm.sync.retry-scheduled", { treeId, backoffMs });
      setTimeout(() => processItem(item), backoffMs);
    }
  }

  function enqueue(treeRecord) {
    if (!otmConfig.enabled) return;

    const item = {
      ...treeRecord,
      status: STATUS_PENDING,
      attempts: 0,
      enqueuedAt: new Date().toISOString()
    };
    queue.push(item);
    pending += 1;

    // Defer to avoid blocking the HTTP response
    setImmediate(() => processItem(item));
  }

  function getStatus() {
    return {
      enabled: otmConfig.enabled,
      queued: queue.length,
      pending,
      synced,
      failed,
      lastSyncedAt,
      failedRecords: failedRecords.slice(-20)
    };
  }

  return { enqueue, getStatus };
}

module.exports = { createOtmSyncQueue };
