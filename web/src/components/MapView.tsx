import { useEffect, useRef } from "react";
import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StacItem } from "../lib/stac";
import { isCogAsset } from "../lib/stac";
import { cogTileUrl, fetchCogRescale } from "../lib/titiler";

const BASEMAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const FOOTPRINT_SOURCE = "item-footprint";
const FOOTPRINT_LAYER = "item-footprint-outline";
const RASTER_SOURCE = "item-raster";
const RASTER_LAYER = "item-raster-layer";

function bboxToPolygon(bbox: [number, number, number, number]) {
  const [w, s, e, n] = bbox;
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        [
          [w, s],
          [e, s],
          [e, n],
          [w, n],
          [w, s],
        ],
      ],
    },
  };
}

export function MapView({ selectedItem }: { selectedItem: StacItem | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [2.35, 48.85],
      zoom: 10,
    });
    map.addControl(new NavigationControl(), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedItem) return;

    let cancelled = false;

    const apply = () => {
      if (cancelled) return;

      if (map.getLayer(RASTER_LAYER)) map.removeLayer(RASTER_LAYER);
      if (map.getSource(RASTER_SOURCE)) map.removeSource(RASTER_SOURCE);
      if (map.getLayer(FOOTPRINT_LAYER)) map.removeLayer(FOOTPRINT_LAYER);
      if (map.getSource(FOOTPRINT_SOURCE)) map.removeSource(FOOTPRINT_SOURCE);

      map.addSource(FOOTPRINT_SOURCE, {
        type: "geojson",
        data: bboxToPolygon(selectedItem.bbox),
      });
      map.addLayer({
        id: FOOTPRINT_LAYER,
        type: "line",
        source: FOOTPRINT_SOURCE,
        paint: { "line-color": "#e11d48", "line-width": 2 },
      });

      const [w, s, e, n] = selectedItem.bbox;
      map.fitBounds(
        [
          [w, s],
          [e, n],
        ],
        { padding: 40, duration: 500 },
      );

      const dataAsset = selectedItem.assets["data"];
      if (dataAsset && isCogAsset(dataAsset)) {
        fetchCogRescale(dataAsset.href)
          .then((rescale) => {
            if (cancelled || !mapRef.current) return;
            const m = mapRef.current;
            m.addSource(RASTER_SOURCE, {
              type: "raster",
              tiles: [cogTileUrl(dataAsset.href, rescale)],
              tileSize: 256,
            });
            m.addLayer({
              id: RASTER_LAYER,
              type: "raster",
              source: RASTER_SOURCE,
              paint: { "raster-opacity": 0.85 },
            });
          })
          .catch((err) => console.error("titiler statistics failed", err));
      }
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("load", apply);
    }

    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
