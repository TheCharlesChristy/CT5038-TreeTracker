/** Photo row attached to a tree or comment. */
export type TreePhoto = {
  id?: number;
  image_url: string;
  fileName?: string;
  mimeType?: string;
};

export type TreeHealthState = 'excellent' | 'good' | 'ok' | 'bad' | 'terrible';

/** Tree details collected and displayed by add/edit flows. */
export type TreeDetails = {
    species?: string,
    wildlife?: string,
    wildlifeList?: string[],
    disease?: string,
    diseaseList?: string[],
    photos?: TreePhoto[],
    notes?: string,
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
    health?: TreeHealthState
}

/** Persisted tree with map coordinates and optional ownership metadata. */
export type Tree = TreeDetails & TreeOwnership & {
    latitude: number;
    longitude: number;
    id?: number;
}

export type TreeOwnership = {
  creator_user_id?: number | null;
  created_at?: string | null;
  guardian_user_ids?: number[];
};
