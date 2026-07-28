import { TITILER_URL } from "./config";

interface BandStats {
  min: number;
  max: number;
}

export async function fetchCogRescale(assetHref: string): Promise<string> {
  const url = `${TITILER_URL}/cog/statistics?url=${encodeURIComponent(assetHref)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} fetching statistics for ${assetHref}`);
  }
  const stats = (await res.json()) as Record<string, BandStats>;
  const band = Object.values(stats)[0];
  return `${band.min},${band.max}`;
}

export function cogTileUrl(assetHref: string, rescale: string): string {
  const params = new URLSearchParams({ url: assetHref, rescale });
  return `${TITILER_URL}/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?${params.toString()}`;
}
