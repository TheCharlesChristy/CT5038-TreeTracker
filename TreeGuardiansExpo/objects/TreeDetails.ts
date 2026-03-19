// information filled in dashboard
export type TreeDetails = {
    wildlife?: string,
    disease?: string,
    photos?: string[],  // array of image URL's
    notes?: string, // "seen" obervations or additional notes
    diameter?: number,
    height?: number,
    circumference?: number,
    avoidedRunoff?: number,
    carbonDioxideStored?: number,
    carbonDioxideRemoved?: number,
    waterIntercepted?: number,
    airQualityImprovement?: number,
    leafArea?: number,
    evapotranspiration?: number,
    health?: 'excellent' | 'good' | 'ok' | 'bad' | 'terrible'
}

// when the tree is successfully placed
export type Tree = TreeDetails & {
    latitude: number;
    longitude: number;
    id?: number; // optional but useful for referencing
}
