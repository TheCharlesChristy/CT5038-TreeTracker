import { buildApiUrl } from '@/config/api';

export type OtmTree = {
  id: number | string;
  latitude: number;
  longitude: number;
  species: string | null;
  scientificName: string | null;
  diameter: number | null;
  condition: string | null;
  datePlanted: string | null;
  otmUrl: string | null;
};

export type OtmSpecies = {
  otmId: string;
  commonName: string;
  scientificName: string;
  usdaSymbol: string;
  itreeCode: string;
};

export type OtmEcoservice = {
  plotId: string;
  benefits: Record<string, number> | null;
  source: string;
} | null;

type BoundingBox = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
};

export async function fetchOtmTreesInBbox(bbox: BoundingBox): Promise<OtmTree[]> {
  const { swLat, swLng, neLat, neLng } = bbox;
  const url = buildApiUrl(
    `otm/trees?swLat=${swLat}&swLng=${swLng}&neLat=${neLat}&neLng=${neLng}`
  );

  const res = await fetch(url);
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchOtmSpecies(): Promise<OtmSpecies[]> {
  const url = buildApiUrl('otm/species');
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchOtmEcoservice(plotId: string): Promise<OtmEcoservice> {
  const url = buildApiUrl(`otm/ecoservice?plot_id=${encodeURIComponent(plotId)}`);
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}
