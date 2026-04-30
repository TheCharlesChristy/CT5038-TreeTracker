import { buildApiUrl, ENDPOINTS } from '@/config/api';
import { Tree, TreeDetails, TreePhoto } from '@/objects/TreeDetails';
import { getAccessToken } from '@/utilities/authHelper';

type ServerRecentTree = {
  id: number;
  latitude: number;
  longitude: number;
  tree_species?: string | null;
  created_at?: string | null;
  creator_user_id?: number | null;
  creator_username?: string | null;
};

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
  photos?: ServerPhoto[];
  latitude?: number;
  longitude?: number;
  id?: number;
  creator_user_id?: number | null;
  created_at?: string | null;
  guardian_user_ids?: number[] | null;
};

type AddTreeResponse = {
  success?: boolean;
  tree_id?: string | number;
  error?: string;
};

type ServerPhoto = {
  id: number;
  image_url: string;
  fileName?: string;
  mimeType?: string;
};

type UploadTreePhotosResponse = {
  success?: boolean;
  error?: string;
  photos?: ServerPhoto[];
};

type UpdateTreeDataResponse = {
  success?: boolean;
  error?: string;
  tree_species?: string | null;
  trunk_diameter?: number | null;
  tree_height?: number | null;
  circumference?: number | null;
  health?: 'excellent' | 'good' | 'ok' | 'bad' | 'terrible' | null;
};

export type UpdateTreeDataPayload = {
  species?: string | null;
  notes?: string | null;
  diameter?: number | null;
  height?: number | null;
  circumference?: number | null;
  avoidedRunoff?: number | null;
  carbonDioxideStored?: number | null;
  carbonDioxideRemoved?: number | null;
  waterIntercepted?: number | null;
  airQualityImprovement?: number | null;
  leafArea?: number | null;
  evapotranspiration?: number | null;
  health?: 'excellent' | 'good' | 'ok' | 'bad' | 'terrible';
};

export type TreePhotoUploadAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
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

function normalizePhoto(photo: ServerPhoto): TreePhoto | null {
  const resolvedUrl = resolveTreePhotoUrl(photo.image_url);

  if (!resolvedUrl || typeof photo.id !== 'number') {
    return null;
  }

  return {
    id: photo.id,
    image_url: resolvedUrl,
    fileName: photo.fileName,
    mimeType: photo.mimeType,
  };
}

function normalizePhotos(photos?: ServerPhoto[]): TreePhoto[] {
  if (!Array.isArray(photos)) {
    return [];
  }

  return photos
    .map(normalizePhoto)
    .filter((photo): photo is TreePhoto => photo !== null);
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNumberArray(values: unknown): number[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
}

const normalizeTree = (
  treeItem: ServerTreeItem & { latitude: number | string; longitude: number | string }
): Tree => ({
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
  photos: normalizePhotos(treeItem.photos),
  latitude: Number(treeItem.latitude),
  longitude: Number(treeItem.longitude),
  id: treeItem.id,
  creator_user_id: normalizeOptionalNumber(treeItem.creator_user_id),
  created_at: treeItem.created_at ?? null,
  guardian_user_ids: normalizeNumberArray(treeItem.guardian_user_ids),
});

const API_ORIGIN = buildApiUrl('').replace(/\/api\/?$/, '').replace(/\/$/, '');

export function resolveTreePhotoUrl(photoPath?: string): string | undefined {
  if (!photoPath) {
    return undefined;
  }

  const trimmed = photoPath.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `${API_ORIGIN}${trimmed}`;
  }

  return `${API_ORIGIN}/${trimmed}`;
}

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

export async function fetchRecentTrees(limit: number = 6): Promise<ServerRecentTree[]> {
  const response = await fetch(buildApiUrl(`trees/recent?limit=${limit}`));
  const rawBody = await response.text();
  const data = safeParseJson(rawBody);

  if (!response.ok) {
    throw new Error(formatApiError('Failed to fetch recent trees.', response, rawBody));
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data as ServerRecentTree[];
}

async function buildPhotoUploadFiles(
  assets: { uri: string; fileName?: string; mimeType?: string }[]
): Promise<(File | { uri: string; name: string; type: string })[]> {
  return Promise.all(
    assets.map(async (asset, index) => {
      const fallbackName = `tree-photo-${index}.jpg`;
      const name = asset.fileName?.trim() || asset.uri.split('/').pop() || fallbackName;

      const extension = name.split('.').pop()?.toLowerCase();
      let type = asset.mimeType?.toLowerCase() || '';

      if (!type) {
        if (extension === 'png') type = 'image/png';
        else if (extension === 'jpg' || extension === 'jpeg') type = 'image/jpeg';
        else if (extension === 'webp') type = 'image/webp';
      }

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) {
        throw new Error('Unsupported image type. Supported image types: JPG, JPEG, PNG and WEBP.');
      }

      if (asset.uri.startsWith('blob:')) {
        const blobResponse = await fetch(asset.uri);
        const blob = await blobResponse.blob();
        return new File([blob], name, { type });
      }

      return {
        uri: asset.uri.startsWith('file://') ? asset.uri : `file://${asset.uri}`,
        name,
        type,
      };
    })
  );
}

export async function deleteTree(treeId: number): Promise<void> {
  const response = await fetch(buildApiUrl(`trees/${treeId}`), {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  const rawBody = await response.text();
  const parsed = safeParseJson(rawBody) as { error?: string } | undefined;

  if (!response.ok) {
    throw new Error(
      formatApiError('Failed to delete tree.', response, rawBody, parsed?.error)
    );
  }
}

export async function updateTreeData(
  treeId: number,
  payload: UpdateTreeDataPayload
): Promise<UpdateTreeDataResponse> {
  const response = await fetch(buildApiUrl(`trees/${treeId}`), {
    method: 'PATCH',
    headers: {
      ...(await getAuthHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  const parsed = safeParseJson(rawBody);
  const data =
    parsed && typeof parsed === 'object'
      ? (parsed as UpdateTreeDataResponse)
      : {};

  if (!response.ok) {
    throw new Error(
      formatApiError('Failed to update tree data.', response, rawBody, data.error)
    );
  }

  return data;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Authentication required.');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };
}

export async function uploadTreePhotos(
  treeId: number,
  assets: { uri: string; fileName?: string; mimeType?: string }[]
): Promise<UploadTreePhotosResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Authentication is required to upload tree photos.');
  }

  const formData = new FormData();
  const files = await buildPhotoUploadFiles(assets);

  files.forEach((file) => {
    formData.append('photos', file as any);
  });

  const response = await fetch(buildApiUrl(`trees/${treeId}/photos`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    body: formData,
  });

  const rawBody = await response.text();
  const parsed = safeParseJson(rawBody);
  const data =
    parsed && typeof parsed === 'object'
      ? (parsed as UploadTreePhotosResponse)
      : {};

  if (!response.ok) {
    if (response.status === 415) {
      throw new Error('Unsupported image type. Supported image types: JPG, JPEG, PNG and WEBP.');
    }

    throw new Error(
      formatApiError('Failed to upload tree photos.', response, rawBody, data.error)
    );
  }

  return data;
}

export async function deleteTreePhoto(
  treeId: number, photoId: number): Promise<void> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Authentication required.');
  }
  const response = await fetch(buildApiUrl(`trees/${treeId}/photos/${photoId}`), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  const rawBody = await response.text();

  if (!response.ok) {
    const parsed = safeParseJson(rawBody);
    const data =
      parsed && typeof parsed === 'object'
        ? (parsed as { error?: string })
        : {};

    throw new Error(formatApiError('Failed to delete photo.', response, rawBody, data.error));
  }
}

export type TreeFeedItem = {
  item_type: 'tree_comment' | 'wildlife' | 'disease' | 'seen' | 'reply';
  comment_id: number;
  created_at: string;
  content: string | null;
  extra: string | null;
  user_id?: number | null;
  username?: string | null;
}

export async function fetchTreeFeed(treeId: number, limit=50, offset=0): Promise<TreeFeedItem[]> {
  const response = await fetch(buildApiUrl(`trees/${treeId}/feed?limit=${limit}&offset=${offset}`));
  const rawBody = await response.text();
  const data = safeParseJson(rawBody);

  if (!response.ok) {
    throw new Error(formatApiError('Failed to fetch tree feed.', response, rawBody));
  }

  return Array.isArray(data) ? (data as TreeFeedItem[]) : [];
}

export async function addTreeComment(treeId: number, content: string): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Authentication is required to add a comment.');
  }

  const response = await fetch(buildApiUrl(`trees/${treeId}/comments`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ content }),
  });

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(formatApiError('Failed to add comment.', response, rawBody));
  }
}

export async function deleteTreeComment(commentId: number): Promise<void> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error('Authentication required');
  }

  const response = await fetch(buildApiUrl(`comments/${commentId}`), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(formatApiError('Failed to delete comment.', response, rawBody));
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
  const data = (
    parsed && typeof parsed === 'object' ? (parsed as AddTreeResponse) : {}
  ) as AddTreeResponse;

  if (!response.ok || !data.success || !data.tree_id) {
    throw new Error(formatApiError('Failed to save tree.', response, rawBody, data.error));
  }

  if (tree.photos?.length) {
    await uploadTreePhotos(
      Number(data.tree_id),
      tree.photos.map((photo) => ({
        uri: photo.image_url,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
      }))
    );
  }
}
