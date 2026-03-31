import { findTreeSpeciesMeta } from "./treeSpecies";

type EstimateInput = {
    species?: string;
    diameter?: number;
    height?: number;
    circumference?: number;
};

type EstimateOutput = {
    diameter?: number;
    circumference?: number;
    height?: number;
    avoidedRunoff?: number;
    carbonDioxideStored?: number;
    carbonDioxideRemoved?: number;
    waterIntercepted?: number;
    airQualityImprovement?: number;
    leafArea?: number;
    evapotranspiration?: number;
};

function round(value: number, places = 2) {
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

export function estimateTreeEcoStats(input: EstimateInput): EstimateOutput {
    const speciesMeta = findTreeSpeciesMeta(input.species);
    
    if (speciesMeta.disableEstimates) {
        return {
        diameter: input.diameter,
        circumference: input.circumference,
        height: input.height,
        avoidedRunoff: undefined,
        carbonDioxideStored: undefined,
        carbonDioxideRemoved: undefined,
        waterIntercepted: undefined,
        airQualityImprovement: undefined,
        leafArea: undefined,
        evapotranspiration: undefined,
    };
  }

    let diameterCm = input.diameter;
    let circumferenceCm = input.circumference;
    const heightM = input.height;

    if ((!diameterCm || diameterCm <= 0) && circumferenceCm && circumferenceCm > 0) {
        diameterCm = circumferenceCm / Math.PI;
    }

    if ((!circumferenceCm || circumferenceCm <= 0) && diameterCm && diameterCm > 0) {
        circumferenceCm = diameterCm * Math.PI;
    }

    if (!diameterCm || !heightM || diameterCm <= 0 || heightM <= 0) {
        return {
            diameter: diameterCm,
            circumference: circumferenceCm,
            height: heightM,
        };
    }

    const diamterM = diameterCm / 100;
    const trunkRadiusM = diamterM / 2;

    // Crown radius estimate from species + height
    const crownRadiusM = clamp(heightM * speciesMeta.canopySpreadFactor, 1.2, 12);
    const crownAreaM2 = Math.PI * crownRadiusM * crownRadiusM;

    // leaf area estimate
    const leafArea = crownAreaM2 * speciesMeta.leafDensityFactor;

    // biomass-like rules from trunk size + height
    const stemVolumeIndex = Math.PI * trunkRadiusM * trunkRadiusM * heightM;

    const carbonDioxideStored = stemVolumeIndex * 520 * speciesMeta.storageFactor;
    const carbonDioxideRemoved = carbonDioxideStored * speciesMeta.removalRate;

    const waterIntercepted = leafArea * speciesMeta.runoffFactor;
    const avoidedRunoff = waterIntercepted * 0.92;
    const airQualityImprovement = leafArea * speciesMeta.airQualityFactor;
    const evapotranspiration = leafArea * speciesMeta.evapotranspirationFactor;

    return {
        diameter: round(diameterCm),
        circumference: round(circumferenceCm ?? diameterCm * Math.PI),
        height: round(heightM),
        avoidedRunoff: round(avoidedRunoff),
        carbonDioxideStored: round(carbonDioxideStored),
        carbonDioxideRemoved: round(carbonDioxideRemoved),
        waterIntercepted: round(waterIntercepted),
        airQualityImprovement: round(airQualityImprovement),
        leafArea: round(leafArea),
        evapotranspiration: round(evapotranspiration),
    };
}