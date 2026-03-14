// information filled in dashboard
export type TreeDetails = {
    wildlife?: string,
    disease?: string,
    photos?: string[],  // array of image URL's
    notes?: string, // "seen" obervations or additional notes
    diameter?: number,
    height?: number,
    circumference?: number
}

// when the tree is successfully placed
export type Tree = TreeDetails & {
    latitude: number;
    longitude: number;
    id?: number; // optional but useful for referencing
}