export type TreeSpeciesMeta = {
  key: string;
  label: string;
  canopySpreadFactor: number; // affects crown width from height
  leafDensityFactor: number;  // affects leaf area
  storageFactor: number; // affects CO2 stored
  removalRate: number; // annual % of stored CO2 removed
  runoffFactor: number; // affects avoided runoff / interception
  airQualityFactor: number; // grams per m2 leaf area per year
  evapotranspirationFactor: number; // m3 per m2 leaf area
  disableEstimates?: boolean;
};

export const TREE_SPECIES: TreeSpeciesMeta[] = [
  {
    key: 'common_lime',
    label: 'Common Lime',
    canopySpreadFactor: 0.42,
    leafDensityFactor: 5.6,
    storageFactor: 1.05,
    removalRate: 0.036,
    runoffFactor: 0.0018,
    airQualityFactor: 7.8,
    evapotranspirationFactor: 0.00080,
    disableEstimates: false,
  },
  {
    key: 'silver_birch',
    label: 'Silver Birch',
    canopySpreadFactor: 0.30,
    leafDensityFactor: 4.3,
    storageFactor: 0.78,
    removalRate: 0.050,
    runoffFactor: 0.00135,
    airQualityFactor: 6.0,
    evapotranspirationFactor: 0.00070,
    disableEstimates: false,
  },
  {
    key: 'norway_maple',
    label: 'Norway Maple',
    canopySpreadFactor: 0.39,
    leafDensityFactor: 4.9,
    storageFactor: 0.94,
    removalRate: 0.041,
    runoffFactor: 0.00165,
    airQualityFactor: 7.0,
    evapotranspirationFactor: 0.00077,
    disableEstimates: false,
  },
  {
    key: 'wild_cherry',
    label: 'Wild Cherry',
    canopySpreadFactor: 0.31,
    leafDensityFactor: 4.1,
    storageFactor: 0.72,
    removalRate: 0.047,
    runoffFactor: 0.00130,
    airQualityFactor: 5.8,
    evapotranspirationFactor: 0.00069,
    disableEstimates: false,
  },
  {
    key: 'ash',
    label: 'Ash',
    canopySpreadFactor: 0.41,
    leafDensityFactor: 5.0,
    storageFactor: 0.96,
    removalRate: 0.040,
    runoffFactor: 0.00170,
    airQualityFactor: 7.1,
    evapotranspirationFactor: 0.00078,
    disableEstimates: false,
  },
  {
    key: 'common_beech',
    label: 'Common Beech',
    canopySpreadFactor: 0.40,
    leafDensityFactor: 5.2,
    storageFactor: 1.02,
    removalRate: 0.036,
    runoffFactor: 0.00170,
    airQualityFactor: 7.6,
    evapotranspirationFactor: 0.00080,
    disableEstimates: false,
  },
  {
    key: 'sycamore',
    label: 'Sycamore',
    canopySpreadFactor: 0.41,
    leafDensityFactor: 5.0,
    storageFactor: 1.00,
    removalRate: 0.041,
    runoffFactor: 0.00180,
    airQualityFactor: 7.2,
    evapotranspirationFactor: 0.00079,
    disableEstimates: false,
  },
  {
    key: 'hawthorn',
    label: 'Hawthorn',
    canopySpreadFactor: 0.26,
    leafDensityFactor: 3.8,
    storageFactor: 0.62,
    removalRate: 0.053,
    runoffFactor: 0.00115,
    airQualityFactor: 5.1,
    evapotranspirationFactor: 0.00063,
    disableEstimates: false,
  },
  {
    key: 'hornbeam',
    label: 'Hornbeam',
    canopySpreadFactor: 0.37,
    leafDensityFactor: 4.8,
    storageFactor: 0.90,
    removalRate: 0.042,
    runoffFactor: 0.00155,
    airQualityFactor: 6.8,
    evapotranspirationFactor: 0.00075,
    disableEstimates: false,
  },
  {
    key: 'oak',
    label: 'Oak',
    canopySpreadFactor: 0.44,
    leafDensityFactor: 5.7,
    storageFactor: 1.18,
    removalRate: 0.038,
    runoffFactor: 0.00190,
    airQualityFactor: 8.4,
    evapotranspirationFactor: 0.00084,
    disableEstimates: false,
  },
  {
    key: 'rowan',
    label: 'Rowan',
    canopySpreadFactor: 0.28,
    leafDensityFactor: 3.9,
    storageFactor: 0.68,
    removalRate: 0.052,
    runoffFactor: 0.00120,
    airQualityFactor: 5.3,
    evapotranspirationFactor: 0.00066,
    disableEstimates: false,
  },
  {
    key: 'elm',
    label: 'Elm',
    canopySpreadFactor: 0.38,
    leafDensityFactor: 4.9,
    storageFactor: 0.93,
    removalRate: 0.041,
    runoffFactor: 0.00160,
    airQualityFactor: 6.9,
    evapotranspirationFactor: 0.00076,
    disableEstimates: false,
  },
  {
    key: 'other',
    label: 'Other',
    canopySpreadFactor: 0,
    leafDensityFactor: 0,
    storageFactor: 0,
    removalRate: 0,
    runoffFactor: 0,
    airQualityFactor: 0,
    evapotranspirationFactor: 0,
    disableEstimates: true,
  },
];

export const DEFAULT_TREE_SPECIES = TREE_SPECIES[0];

export function findTreeSpeciesMeta(species?: string | null): TreeSpeciesMeta {
  if (!species) {
    return DEFAULT_TREE_SPECIES;
  }

  const normalized = species.trim().toLowerCase();

  return (
    TREE_SPECIES.find(
      (item) =>
        item.key === normalized ||
        item.label.toLowerCase() === normalized
    ) ?? DEFAULT_TREE_SPECIES
  );
}