"""Generate small synthetic sample assets for the M1 STAC catalog seed.

Produces one asset per format under data/samples/:
- raster/sample_dem.tif   — synthetic COG (elevation-like gradient + noise)
- vector/sample_points.parquet — synthetic GeoParquet (station points)
- vector/sample_blocks.geojson — synthetic polygons, converted to PMTiles
  separately via tippecanoe (see data/scripts/build_pmtiles.sh)
"""

import os

os.environ.setdefault("PROJ_NETWORK", "OFF")

import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rio_cogeo.cogeo import cog_translate
from rio_cogeo.profiles import cog_profiles
import geopandas as gpd
from shapely.geometry import Point, box
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "samples"

# Roughly the Paris area, used purely as a plausible small bbox for demo data.
BBOX = (2.25, 48.80, 2.42, 48.90)  # west, south, east, north


def make_cog():
    raster_dir = SAMPLES / "raster"
    raster_dir.mkdir(parents=True, exist_ok=True)
    tmp_path = raster_dir / "_sample_dem_raw.tif"
    out_path = raster_dir / "sample_dem.tif"

    size = 256
    x = np.linspace(-3, 3, size)
    y = np.linspace(-3, 3, size)
    xx, yy = np.meshgrid(x, y)
    rng = np.random.default_rng(42)
    elevation = (
        100
        + 40 * np.exp(-(xx**2 + yy**2) / 4)
        + 10 * np.sin(xx * 2) * np.cos(yy * 2)
        + rng.normal(0, 2, (size, size))
    ).astype(np.float32)

    transform = from_bounds(*BBOX, size, size)
    profile = {
        "driver": "GTiff",
        "dtype": "float32",
        "count": 1,
        "height": size,
        "width": size,
        "crs": "EPSG:4326",
        "transform": transform,
        "nodata": None,
    }
    with rasterio.open(tmp_path, "w", **profile) as dst:
        dst.write(elevation, 1)

    cog_translate(
        tmp_path,
        out_path,
        cog_profiles.get("deflate"),
        quiet=True,
    )
    tmp_path.unlink()
    print(f"wrote {out_path}")
    return out_path, BBOX


def make_geoparquet():
    vector_dir = SAMPLES / "vector"
    vector_dir.mkdir(parents=True, exist_ok=True)
    out_path = vector_dir / "sample_points.parquet"

    rng = np.random.default_rng(7)
    n = 40
    lons = rng.uniform(BBOX[0], BBOX[2], n)
    lats = rng.uniform(BBOX[1], BBOX[3], n)
    gdf = gpd.GeoDataFrame(
        {
            "station_id": [f"stn-{i:03d}" for i in range(n)],
            "value": rng.uniform(0, 100, n).round(2),
        },
        geometry=[Point(lon, lat) for lon, lat in zip(lons, lats)],
        crs="EPSG:4326",
    )
    gdf.to_parquet(out_path)
    print(f"wrote {out_path}")
    return out_path, BBOX


def make_polygons_geojson():
    vector_dir = SAMPLES / "vector"
    vector_dir.mkdir(parents=True, exist_ok=True)
    out_path = vector_dir / "sample_blocks.geojson"

    rng = np.random.default_rng(11)
    cols, rows = 8, 8
    xs = np.linspace(BBOX[0], BBOX[2], cols + 1)
    ys = np.linspace(BBOX[1], BBOX[3], rows + 1)

    polygons = []
    ids = []
    idx = 0
    for i in range(cols):
        for j in range(rows):
            if rng.random() < 0.6:  # sparse grid, not full coverage
                polygons.append(box(xs[i], ys[j], xs[i + 1], ys[j + 1]))
                ids.append(f"block-{idx:03d}")
                idx += 1

    gdf = gpd.GeoDataFrame({"block_id": ids}, geometry=polygons, crs="EPSG:4326")
    gdf.to_file(out_path, driver="GeoJSON")
    print(f"wrote {out_path}")
    return out_path, BBOX


if __name__ == "__main__":
    make_cog()
    make_geoparquet()
    make_polygons_geojson()
