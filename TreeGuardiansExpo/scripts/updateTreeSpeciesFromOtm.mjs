#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

const DEFAULT_OUTPUT = "assets/data/treeSpeciesDataset.json";
const DEFAULT_INSTANCE = "apidemo";
const DEFAULT_BASE_URL = "https://www.opentreemap.org";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args[key] = value;
  }
  return args;
}

function buildScientificName(row) {
  const parts = [row.genus, row.species, row.cultivar, row.other_part_of_name]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return parts.join(" ");
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  const base = normalizeWhitespace(value).toLowerCase();
  return base
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function parseCsv(csvText) {
  const rows = [];
  let current = "";
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      current = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => normalizeWhitespace(h));
  return rows.slice(1).map((cells) => {
    const out = {};
    headers.forEach((header, index) => {
      out[header] = normalizeWhitespace(cells[index] || "");
    });
    return out;
  });
}

async function fetchSpeciesFromApi(baseUrl, instance) {
  const cleanedBase = String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const instanceName = String(instance || DEFAULT_INSTANCE).trim();

  const candidates = [
    `${cleanedBase}/instance/${instanceName}/species`,
    `${cleanedBase}/api/instance/${instanceName}/species`,
    `${cleanedBase}/api/v4/instance/${instanceName}/species`,
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      if (!Array.isArray(payload)) {
        continue;
      }

      return {
        source: `OpenTreeMap API (${url})`,
        rows: payload.map((row) => ({
          id: row.id ?? null,
          otm_code: normalizeWhitespace(row.otm_code),
          genus: normalizeWhitespace(row.genus),
          species: normalizeWhitespace(row.species),
          cultivar: normalizeWhitespace(row.cultivar),
          other_part_of_name: normalizeWhitespace(row.other_part_of_name),
          common_name: normalizeWhitespace(row.common_name),
          scientific_name: normalizeWhitespace(row.scientific_name),
        })),
      };
    } catch {}
  }

  throw new Error(
    `Unable to fetch species from OpenTreeMap API. Tried: ${candidates.join(", ")}`
  );
}

async function loadRows({ inputCsvPath, baseUrl, instance }) {
  try {
    return await fetchSpeciesFromApi(baseUrl, instance);
  } catch (error) {
    if (!inputCsvPath) throw error;

    const csvText = await fs.readFile(inputCsvPath, "utf8");
    const csvRows = parseCsv(csvText);
    return {
      source: `OpenTreeMap CSV (${path.basename(inputCsvPath)})`,
      rows: csvRows.map((row) => ({
        id: null,
        otm_code: normalizeWhitespace(row.otm_code),
        genus: normalizeWhitespace(row.genus),
        species: normalizeWhitespace(row.species),
        cultivar: normalizeWhitespace(row.cultivar),
        other_part_of_name: normalizeWhitespace(row.other),
        common_name: normalizeWhitespace(row.common_name),
        scientific_name: "",
      })),
    };
  }
}

function toSpeciesRecords(rows) {
  const seen = new Set();
  const records = [];

  for (const row of rows) {
    const commonName = normalizeWhitespace(row.common_name);
    const scientificName = normalizeWhitespace(row.scientific_name || buildScientificName(row));
    const otmCode = normalizeWhitespace(row.otm_code);

    const label = commonName || scientificName;
    if (!label) continue;

    const key = slugify(`${otmCode || "species"}_${label}_${scientificName}`);
    const dedupeKey = `${label.toLowerCase()}|${scientificName.toLowerCase()}|${otmCode.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const tokens = [label, commonName, scientificName, otmCode]
      .map((value) => normalizeWhitespace(value))
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    records.push({
      key,
      label,
      commonName: commonName || null,
      scientificName: scientificName || null,
      otmCode: otmCode || null,
      usdaCode: null,
      iTreeCode: null,
      searchText: tokens,
    });
  }

  records.sort((a, b) => a.label.localeCompare(b.label));
  records.push({
    key: "other_unknown",
    label: "Other / Unknown",
    commonName: null,
    scientificName: null,
    otmCode: null,
    usdaCode: null,
    iTreeCode: null,
    searchText: "other unknown",
  });

  return records;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputPath = path.resolve(process.cwd(), args.output || DEFAULT_OUTPUT);
  const inputCsvPath = args["input-csv"]
    ? path.resolve(process.cwd(), args["input-csv"])
    : null;
  const baseUrl = args["base-url"] || process.env.OTM_BASE_URL || DEFAULT_BASE_URL;
  const instance = args.instance || process.env.OTM_INSTANCE || DEFAULT_INSTANCE;

  const loaded = await loadRows({ inputCsvPath, baseUrl, instance });
  const species = toSpeciesRecords(loaded.rows);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: loaded.source,
    instance,
    total: species.length,
    species,
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  // eslint-disable-next-line no-console
  console.log(`Wrote ${species.length} species to ${outputPath}`);
  // eslint-disable-next-line no-console
  console.log(`Source: ${loaded.source}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error.message);
  process.exit(1);
});
