import { STAC_API_URL } from "./config";

export interface StacAsset {
  href: string;
  type?: string;
  title?: string;
  roles?: string[];
}

export interface StacItem {
  id: string;
  collection: string;
  bbox: [number, number, number, number];
  properties: Record<string, unknown>;
  assets: Record<string, StacAsset>;
}

export interface StacCollection {
  id: string;
  title?: string;
  description?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} fetching ${url}`);
  }
  return res.json() as Promise<T>;
}

export function fetchCollections(): Promise<StacCollection[]> {
  return fetchJson<{ collections: StacCollection[] }>(`${STAC_API_URL}/collections`).then(
    (d) => d.collections,
  );
}

export function fetchItems(collectionId: string): Promise<StacItem[]> {
  return fetchJson<{ features: StacItem[] }>(
    `${STAC_API_URL}/collections/${collectionId}/items`,
  ).then((d) => d.features);
}

export function isCogAsset(asset: StacAsset): boolean {
  return !!asset.type && /geotiff|cloud-optimized/i.test(asset.type);
}
