/**
 * Translation table: our internal species labels → OTM USDA plant symbols.
 *
 * USDA symbols are the canonical identifiers used by OpenTreeMap for species
 * lookup and iTree ecosystem benefit calculations.
 *
 * Gaps / decisions:
 *   - "Other" has no USDA code; trees with this species are queued for manual
 *     review rather than auto-submitted (see syncQueue.js).
 *   - Where a species maps to several USDA taxa (e.g. multiple oak species) we
 *     use the most common UK representative.
 *   - Fields without a direct OTM equivalent (avoided_runoff, leaf_area, etc.)
 *     are not submitted; OTM calculates them server-side from species + DBH.
 *
 * Field mapping summary (our schema → OTM Plot/Tree):
 *   trees.latitude / longitude  → plot.geom {lat, lng}
 *   tree_data.tree_species       → tree.species (via USDA code below)
 *   tree_data.trunk_diameter     → tree.diameter (cm → inches: ÷ 2.54)
 *   tree_data.health             → tree.condition (normalised in syncQueue)
 *   tree_creation_data.created_at→ tree.date_planted (approximate)
 *   (no equivalent in our schema) → plot.address_street (omitted/null)
 *   (no equivalent in our schema) → plot.feature_type (always "Plot")
 *
 * OTM fields we do not yet collect:
 *   - plot.address_street:  not in our schema; omitted.
 *   - tree.diameter (DBH):  stored as trunk_diameter in cm; converted on sync.
 *     SCRUM-161 decision: reuse trunk_diameter for DBH — they are equivalent
 *     for a single-stem tree. A future form update can add an explicit DBH
 *     field if needed.
 */
const SPECIES_MAP = [
  { key: "common_lime",  label: "Common Lime",  usdaCode: "TILI",   itreeCode: "TILI" },
  { key: "silver_birch", label: "Silver Birch", usdaCode: "BEPE2",  itreeCode: "BEPE2" },
  { key: "norway_maple", label: "Norway Maple", usdaCode: "ACPL",   itreeCode: "ACPL" },
  { key: "wild_cherry",  label: "Wild Cherry",  usdaCode: "PRAV",   itreeCode: "PRAV" },
  { key: "ash",          label: "Ash",          usdaCode: "FREX",   itreeCode: "FREX" },
  { key: "common_beech", label: "Common Beech", usdaCode: "FASY",   itreeCode: "FASY" },
  { key: "sycamore",     label: "Sycamore",     usdaCode: "ACPS",   itreeCode: "ACPS" },
  { key: "hawthorn",     label: "Hawthorn",     usdaCode: "CRMO2",  itreeCode: "CRMO2" },
  { key: "hornbeam",     label: "Hornbeam",     usdaCode: "CABE2",  itreeCode: "CABE2" },
  { key: "oak",          label: "Oak",          usdaCode: "QUER",   itreeCode: "QUER" },
  { key: "rowan",        label: "Rowan",        usdaCode: "SOAU",   itreeCode: "SOAU" },
  { key: "elm",          label: "Elm",          usdaCode: "ULMUS",  itreeCode: "ULMUS" },
  { key: "other",        label: "Other",        usdaCode: null,     itreeCode: null }
];

function speciesLabelToUsda(label) {
  if (!label) return null;
  const normalized = label.trim().toLowerCase();
  const match = SPECIES_MAP.find(
    (s) => s.key === normalized || s.label.toLowerCase() === normalized
  );
  return match?.usdaCode ?? null;
}

function speciesLabelToItree(label) {
  if (!label) return null;
  const normalized = label.trim().toLowerCase();
  const match = SPECIES_MAP.find(
    (s) => s.key === normalized || s.label.toLowerCase() === normalized
  );
  return match?.itreeCode ?? null;
}

function usdaToSpeciesLabel(usdaCode) {
  if (!usdaCode) return null;
  const match = SPECIES_MAP.find((s) => s.usdaCode === usdaCode);
  return match?.label ?? null;
}

module.exports = { SPECIES_MAP, speciesLabelToUsda, speciesLabelToItree, usdaToSpeciesLabel };
