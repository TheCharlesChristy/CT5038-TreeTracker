import { API_BASE, ENDPOINTS } from '@/config/api';
import { Tree, TreeDetails } from '@/objects/TreeDetails';

type ServerTreeItem = {
  notes?: string;
  wildlife?: string;
  disease?: string;
  diameter?: number;
  height?: number;
  circumference?: number;
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

const isServerTreeItem = (
  value: unknown
): value is ServerTreeItem & { latitude: number; longitude: number } => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Record<string, unknown>;
  return typeof item.latitude === 'number' && typeof item.longitude === 'number';
};

const normalizeTree = (treeItem: ServerTreeItem & { latitude: number; longitude: number }): Tree => ({
  notes: treeItem.notes || '',
  wildlife: treeItem.wildlife || undefined,
  disease: treeItem.disease || undefined,
  diameter: treeItem.diameter || undefined,
  height: treeItem.height || undefined,
  circumference: treeItem.circumference || undefined,
  photos: Array.isArray(treeItem.photos) ? treeItem.photos : [],
  latitude: treeItem.latitude,
  longitude: treeItem.longitude,
  id: treeItem.id,
});

export async function fetchTrees(): Promise<Tree[]> {
  const response = await fetch(API_BASE + ENDPOINTS.GET_TREES);
  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error('Failed to fetch trees');
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

  const formData = new FormData();
  formData.append('tree_id', treeId);

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

  const response = await fetch(API_BASE + ENDPOINTS.UPLOAD_PHOTOS, {
    method: 'POST',
    body: formData,
  });

  const text = await response.text();

  try {
    const payload = JSON.parse(text) as { error?: string };
    if (!response.ok || payload.error) {
      throw new Error(payload.error || 'Photo upload failed');
    }
  } catch {
    if (!response.ok) {
      throw new Error('Photo upload failed');
    }
  }
}

export async function addTreeData(tree: TreeDetails): Promise<void> {
  const response = await fetch(API_BASE + ENDPOINTS.ADD_TREE_DATA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tree),
  });

  const data = (await response.json()) as AddTreeResponse;

  if (!response.ok || !data.success || !data.tree_id) {
    throw new Error(data.error || 'Failed to save tree');
  }

  if (tree.photos?.length) {
    await uploadPhotos(String(data.tree_id), tree.photos);
  }
}
