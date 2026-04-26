import { buildApiUrl } from '@/config/api';
import { getAccessToken } from '@/utilities/authHelper';
import { API_BASE } from "@/config/api";
import { getItem } from "@/utilities/authStorage";

export type AnalyticsResponse = {
  totalTrees: number;
  totalUsers: number;
  impactTotals: {
    avoidedRunoff: number;
    carbonDioxideStored: number;
    carbonDioxideRemoved: number;
    waterIntercepted: number;
    airQualityImprovement: number;
    leafArea: number;
    evapotranspiration: number;
    trunkCircumference: number;
    trunkDiameter: number;
    treeHeight: number;
  };
};

export async function fetchAnalytics(): Promise<AnalyticsResponse> {
  const token = await getItem("accessToken");

  const response = await fetch(`${API_BASE}/analytics`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`
    }
  });

  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : null;

  if (!response.ok) {
    throw new Error(data?.error || "Failed to fetch analytics.");
  }

  return {
    totalTrees: Number(data?.totalTrees ?? 0),
    totalUsers: Number(data?.totalUsers ?? 0),
    impactTotals: {
      avoidedRunoff: Number(data?.impactTotals?.avoidedRunoff ?? 0),
      carbonDioxideStored: Number(data?.impactTotals?.carbonDioxideStored ?? 0),
      carbonDioxideRemoved: Number(data?.impactTotals?.carbonDioxideRemoved ?? 0),
      waterIntercepted: Number(data?.impactTotals?.waterIntercepted ?? 0),
      airQualityImprovement: Number(data?.impactTotals?.airQualityImprovement ?? 0),
      leafArea: Number(data?.impactTotals?.leafArea ?? 0),
      evapotranspiration: Number(data?.impactTotals?.evapotranspiration ?? 0),
      trunkCircumference: Number(data?.impactTotals?.trunkCircumference ?? 0),
      trunkDiameter: Number(data?.impactTotals?.trunkDiameter ?? 0),
      treeHeight: Number(data?.impactTotals?.treeHeight ?? 0)
    }
  };
}

export type ManagedUser = {
  id: number;
  username: string;
  email?: string | null;
  phone?: string | null;
  role: 'registered_user' | 'guardian' | 'admin';
  guardianTreeIds: number[];
};

type TreeSummary = {
  id: number;
  species?: string | null;
};

function safeParseJson(rawBody: string): unknown {
  if (!rawBody.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return undefined;
  }
}

function formatApiError(prefix: string, response: Response, rawBody: string, explicitError?: string): string {
  const errorMessage = explicitError || 'No explicit error field returned.';
  const responseBody = rawBody.trim().length > 0 ? rawBody : '<empty body>';

  return `${prefix}\nStatus: ${response.status} ${response.statusText}\nError: ${errorMessage}\nResponse Body: ${responseBody}`;
}

async function getAuthHeaders(includeJson = false): Promise<Record<string, string>> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('Authentication required.');
  }

  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchManagedUsers(): Promise<ManagedUser[]> {
  const response = await fetch(buildApiUrl('admin/users'), {
    headers: await getAuthHeaders(),
  });

  const rawBody = await response.text();
  const parsed = safeParseJson(rawBody);
  const data = Array.isArray(parsed) ? parsed : [];

  if (!response.ok) {
    throw new Error(formatApiError('Failed to fetch users.', response, rawBody));
  }

  return data as ManagedUser[];
}

export async function fetchTreeOptions(): Promise<TreeSummary[]> {
  const response = await fetch(buildApiUrl('trees'));
  const rawBody = await response.text();
  const parsed = safeParseJson(rawBody);
  const rows = Array.isArray(parsed) ? parsed : [];

  if (!response.ok) {
    throw new Error(formatApiError('Failed to fetch trees.', response, rawBody));
  }

  return rows.map((tree: any) => ({
    id: Number(tree.id),
    species: tree.species ?? null,
  }));
}

export async function updateUserRole(
  userId: number,
  role: 'registered_user' | 'guardian' | 'admin'
): Promise<void> {
  const response = await fetch(buildApiUrl(`admin/users/${userId}/role`), {
    method: 'PATCH',
    headers: await getAuthHeaders(true),
    body: JSON.stringify({ role }),
  });

  const rawBody = await response.text();
  const parsed = safeParseJson(rawBody) as { error?: string } | undefined;

  if (!response.ok) {
    throw new Error(formatApiError('Failed to update role.', response, rawBody, parsed?.error));
  }
}

export async function assignGuardianToTree(userId: number, treeId: number): Promise<void> {
  const response = await fetch(buildApiUrl(`admin/users/${userId}/guardian-trees`), {
    method: 'POST',
    headers: await getAuthHeaders(true),
    body: JSON.stringify({ treeId }),
  });

  const rawBody = await response.text();
  const parsed = safeParseJson(rawBody) as { error?: string } | undefined;

  if (!response.ok) {
    throw new Error(formatApiError('Failed to assign guardian tree.', response, rawBody, parsed?.error));
  }
}

export async function removeGuardianFromTree(userId: number, treeId: number): Promise<void> {
  const response = await fetch(buildApiUrl(`admin/users/${userId}/guardian-trees/${treeId}`), {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  const rawBody = await response.text();
  const parsed = safeParseJson(rawBody) as { error?: string } | undefined;

  if (!response.ok) {
    throw new Error(formatApiError('Failed to remove guardian tree.', response, rawBody, parsed?.error));
  }
}

export async function deleteManagedUser(userId: number): Promise<void> {
  const response = await fetch(buildApiUrl(`admin/users/${userId}`), {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  const rawBody = await response.text();
  const parsed = safeParseJson(rawBody) as { error?: string } | undefined;

  if (!response.ok) {
    throw new Error(formatApiError('Failed to delete user.', response, rawBody, parsed?.error));
  }
}