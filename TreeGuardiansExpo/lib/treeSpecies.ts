import speciesDataset from "@/assets/data/treeSpeciesDataset.json";

export type TreeSpeciesOption = {
  key: string;
  label: string;
  commonName: string | null;
  scientificName: string | null;
  otmCode: string | null;
  usdaCode: string | null;
  iTreeCode: string | null;
  searchText: string;
};

export type TreeSpeciesMeta = {
  key: string;
  label: string;
  canopySpreadFactor: number;
  leafDensityFactor: number;
  storageFactor: number;
  removalRate: number;
  runoffFactor: number;
  airQualityFactor: number;
  evapotranspirationFactor: number;
  disableEstimates?: boolean;
};

type DatasetShape = {
  species: TreeSpeciesOption[];
};

const parsedDataset = speciesDataset as DatasetShape;

export const TREE_SPECIES: TreeSpeciesOption[] = parsedDataset.species;

const GENERIC_TREE_META: TreeSpeciesMeta = {
  key: "generic_tree",
  label: "Generic Tree",
  canopySpreadFactor: 0.39,
  leafDensityFactor: 4.9,
  storageFactor: 0.94,
  removalRate: 0.041,
  runoffFactor: 0.00165,
  airQualityFactor: 7.0,
  evapotranspirationFactor: 0.00077,
  disableEstimates: false,
};

const OTHER_UNKNOWN_META: TreeSpeciesMeta = {
  key: "other_unknown",
  label: "Other / Unknown",
  canopySpreadFactor: 0,
  leafDensityFactor: 0,
  storageFactor: 0,
  removalRate: 0,
  runoffFactor: 0,
  airQualityFactor: 0,
  evapotranspirationFactor: 0,
  disableEstimates: true,
};

const ECO_OVERRIDES: Record<string, TreeSpeciesMeta> = {
  ACCA: {
    key: "ACCA",
    label: "Hedge maple",
    canopySpreadFactor: 0.39,
    leafDensityFactor: 4.9,
    storageFactor: 0.94,
    removalRate: 0.041,
    runoffFactor: 0.00165,
    airQualityFactor: 7.0,
    evapotranspirationFactor: 0.00077,
  },
  QURO: {
    key: "QURO",
    label: "English oak",
    canopySpreadFactor: 0.44,
    leafDensityFactor: 5.7,
    storageFactor: 1.18,
    removalRate: 0.038,
    runoffFactor: 0.00190,
    airQualityFactor: 8.4,
    evapotranspirationFactor: 0.00084,
  },
};

export const DEFAULT_TREE_SPECIES = GENERIC_TREE_META;

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export function findTreeSpeciesOption(species?: string | null): TreeSpeciesOption | null {
  const normalized = normalize(species);
  if (!normalized) return null;

  return (
    TREE_SPECIES.find((item) => {
      if (normalize(item.label) === normalized) return true;
      if (normalize(item.commonName) === normalized) return true;
      if (normalize(item.scientificName) === normalized) return true;
      if (normalize(item.otmCode) === normalized) return true;
      return false;
    }) ?? null
  );
}

export function findTreeSpeciesMeta(species?: string | null): TreeSpeciesMeta {
  const matched = findTreeSpeciesOption(species);

  if (!matched) {
    return DEFAULT_TREE_SPECIES;
  }

  if (matched.key === "other_unknown") {
    return OTHER_UNKNOWN_META;
  }

  const otmCode = matched.otmCode ? matched.otmCode.toUpperCase() : "";
  if (otmCode && ECO_OVERRIDES[otmCode]) {
    return ECO_OVERRIDES[otmCode];
  }

  return DEFAULT_TREE_SPECIES;
}