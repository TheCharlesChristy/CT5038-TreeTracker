// information filled in dashboard
export type TreeDetails = {
    treeType: string;
    wildlife: string;
    disease?: string,
    photos?: string[];
}

// when the tree is sucessfully placed
export type Tree = TreeDetails & {
    id: string;
    latitude: number;
    longitude: number;
}