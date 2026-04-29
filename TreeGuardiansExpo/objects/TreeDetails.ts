// Tree photos
export type TreePhoto = {
  id?: number;
  image_url: string;
  fileName?: string;
  mimeType?: string;
};

// information filled in dashboard
export type TreeDetails = {
    species?: string,
    wildlife?: string,
    wildlifeList?: string[],
    disease?: string,
    diseaseList?: string[],
    photos?: TreePhoto[],
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
    health?: 'excellent' | 'good' | 'ok' | 'bad' | 'terrible',
    otmPlotId?: string | null,
}

// when the tree is successfully placed
export type Tree = TreeDetails & TreeOwnership & {
    latitude: number;
    longitude: number;
    id?: number; // optional but useful for referencing
}

export type TreeOwnership = {
  creator_user_id?: number | null;
  created_at?: string | null;
  guardian_user_ids?: number[];
};
