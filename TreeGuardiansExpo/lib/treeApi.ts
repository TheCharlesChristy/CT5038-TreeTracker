import { buildApiUrl, ENDPOINTS } from '@/config/api';
import { Tree, TreeDetails } from '@/objects/TreeDetails';
import { getAccessToken } from '@/utilities/authHelper';

type ServerTreeItem = {
  species?: string;
  notes?: string;
  wildlife?: string;
  disease?: string;
  diameter?: number;
  height?: number;
  circumference?: number;
  avoidedRunoff?: number;
  carbonDioxideStored?: number;
  carbonDioxideRemoved?: number;
  waterIntercepted?: number;
  airQualityImprovement?: number;
  leafArea?: number;
  evapotranspiration?: number;
  health?: 'excellent' | 'good' | 'ok' | 'bad' | 'terrible';
  photos?: string[];
  latitude?: number;
  longitude?: number;
  id?: number;
};

type AddTreeResponse = {
  success?: boolean;
  tree_id?: string | number;
  error?: string;
};

type UploadedPhotoFile = {
  uri: string;
  name: string;
  type: string;
};

const formatApiError = (prefix: string, response: Response, rawBody: string, explicitError?: string): string => {
  const errorMessage = explicitError || 'No explicit error field returned.';
  const responseBody = rawBody.trim().length > 0 ? rawBody : '<empty body>';
  return `${prefix}\nStatus: ${response.status} ${response.statusText}\nError: ${errorMessage}\nResponse Body: ${responseBody}`;
};

const safeParseJson = (rawBody: string): unknown => {
  if (!rawBody.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return undefined;
  }
};

const isNumericValue = (value: unknown): boolean =>
  typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)));

const isServerTreeItem = (
  value: unknown
): value is ServerTreeItem & { latitude: number | string; longitude: number | string } => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Record<string, unknown>;
  return isNumericValue(item.latitude) && isNumericValue(item.longitude);
};

const normalizeTree = (treeItem: ServerTreeItem & { latitude: number | string; longitude: number | string }): Tree => ({
  species: treeItem.species ?? undefined,
  notes: treeItem.notes ?? '',
  wildlife: treeItem.wildlife ?? undefined,
  disease: treeItem.disease ?? undefined,
  diameter: treeItem.diameter ?? undefined,
  height: treeItem.height ?? undefined,
  circumference: treeItem.circumference ?? undefined,
  avoidedRunoff: treeItem.avoidedRunoff ?? undefined,
  carbonDioxideStored: treeItem.carbonDioxideStored ?? undefined,
  carbonDioxideRemoved: treeItem.carbonDioxideRemoved ?? undefined,
  waterIntercepted: treeItem.waterIntercepted ?? undefined,
  airQualityImprovement: treeItem.airQualityImprovement ?? undefined,
  leafArea: treeItem.leafArea ?? undefined,
  evapotranspiration: treeItem.evapotranspiration ?? undefined,
  health: treeItem.health ?? undefined,
  photos: Array.isArray(treeItem.photos) ? treeItem.photos : [],
  latitude: Number(treeItem.latitude),
  longitude: Number(treeItem.longitude),
  id: treeItem.id,
});

export async function fetchTrees(): Promise<Tree[]> {
  const response = await fetch(buildApiUrl(ENDPOINTS.GET_TREES));
  const rawBody = await response.text();
  const data: unknown = safeParseJson(rawBody) ?? [];

  if (!response.ok) {
    throw new Error(formatApiError('Failed to fetch trees.', response, rawBody));
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(isServerTreeItem).map(normalizeTree);
}

async function uploadPhotos(treeId: string, photos: string[]): Promise<void> {
  if (!photos || photos.length === 0) {
    return;
  }
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication is required to upload tree photos.');
  }

  const formData = new FormData();

  for (let i = 0; i < photos.length; i += 1) {
    let uri = photos[i];

    if (uri.startsWith('blob:')) {
      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], `photo_${i}.jpg`, { type: blob.type });
      formData.append('photos', file);
      continue;
    }

    if (!uri.startsWith('file://')) {
      uri = `file://${uri}`;
    }

    const mobilePhoto: UploadedPhotoFile = {
      uri,
      name: `photo_${i}.jpg`,
      type: 'image/jpeg',
    };

    formData.append('photos', mobilePhoto as unknown as Blob);
  }

  const response = await fetch(buildApiUrl(`trees/${treeId}/photos`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const text = await response.text();

  try {
    const payload = JSON.parse(text) as { error?: string };
    if (!response.ok || payload.error) {
      throw new Error(formatApiError('Photo upload failed.', response, text, payload.error));
    }
  } catch {
    if (!response.ok) {
      throw new Error(formatApiError('Photo upload failed.', response, text));
    }
  }
}

export async function addTreeData(tree: TreeDetails): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication is required to add a tree.');
  }

  const response = await fetch(buildApiUrl(ENDPOINTS.ADD_TREE_DATA), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(tree),
  });

  const rawBody = await response.text();
  const parsed = safeParseJson(rawBody);
  const data = (parsed && typeof parsed === 'object' ? (parsed as AddTreeResponse) : {}) as AddTreeResponse;

  if (!response.ok || !data.success || !data.tree_id) {
    throw new Error(formatApiError('Failed to save tree.', response, rawBody, data.error));
  }

  if (tree.photos?.length) {
    await uploadPhotos(String(data.tree_id), tree.photos);
  }
}
