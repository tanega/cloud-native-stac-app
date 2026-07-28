"""M1 seed: upload sample assets to MinIO, build STAC Collections/Items,
load them into pgstac via pypgstac.

Run from repo root with the M0/M1 docker-compose stack up:
    data/.venv/bin/python data/scripts/seed.py
"""

import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import boto3
import geopandas as gpd
import pystac
import rasterio

ROOT = Path(__file__).resolve().parents[2]
SAMPLES = ROOT / "data" / "samples"
OUT = ROOT / "data" / "_ndjson"

# Upload endpoint: reached from the host, where MinIO's API port is published.
MINIO_HOST_ENDPOINT = "http://localhost:9000"
# Href endpoint: the docker-network-internal name, resolvable by stac-fastapi
# and titiler containers. Browser/host access is a follow-up for M2.
MINIO_INTERNAL_ENDPOINT = "http://minio:9000"

MINIO_USER = os.environ.get("MINIO_ROOT_USER", "minioadmin")
MINIO_PASSWORD = os.environ.get("MINIO_ROOT_PASSWORD", "minioadmin")
BUCKET = os.environ.get("MINIO_BUCKET", "stac-assets")

PG_DSN = "postgresql://{user}:{password}@localhost:5439/{db}".format(
    user=os.environ.get("POSTGRES_USER", "username"),
    password=os.environ.get("POSTGRES_PASSWORD", "password"),
    db=os.environ.get("POSTGRES_DB", "postgis"),
)

NOW = datetime(2026, 7, 28, tzinfo=timezone.utc)


def s3_client():
    return boto3.client(
        "s3",
        endpoint_url=MINIO_HOST_ENDPOINT,
        aws_access_key_id=MINIO_USER,
        aws_secret_access_key=MINIO_PASSWORD,
    )


def upload(client, local_path: Path, key: str) -> str:
    client.upload_file(str(local_path), BUCKET, key)
    return f"{MINIO_INTERNAL_ENDPOINT}/{BUCKET}/{key}"


def build_dem_item(href: str) -> pystac.Item:
    path = SAMPLES / "raster" / "sample_dem.tif"
    with rasterio.open(path) as src:
        bounds = src.bounds
        bbox = [bounds.left, bounds.bottom, bounds.right, bounds.top]

    item = pystac.Item(
        id="sample-dem-item",
        geometry=_bbox_to_geom(bbox),
        bbox=bbox,
        datetime=NOW,
        properties={},
        collection="sample-dem",
    )
    item.add_asset(
        "data",
        pystac.Asset(
            href=href,
            media_type="image/tiff; application=geotiff; profile=cloud-optimized",
            roles=["data"],
            title="Synthetic DEM (COG)",
        ),
    )
    return item, bbox


def build_points_item(href: str) -> pystac.Item:
    path = SAMPLES / "vector" / "sample_points.parquet"
    gdf = gpd.read_parquet(path)
    bbox = list(gdf.total_bounds)

    item = pystac.Item(
        id="sample-stations-item",
        geometry=_bbox_to_geom(bbox),
        bbox=bbox,
        datetime=NOW,
        properties={"table:row_count": len(gdf)},
        collection="sample-stations",
    )
    item.add_asset(
        "data",
        pystac.Asset(
            href=href,
            media_type="application/vnd.apache.parquet",
            roles=["data"],
            title="Synthetic station points (GeoParquet)",
        ),
    )
    return item, bbox


def build_blocks_item(href: str) -> pystac.Item:
    path = SAMPLES / "vector" / "sample_blocks.geojson"
    gdf = gpd.read_file(path)
    bbox = list(gdf.total_bounds)

    item = pystac.Item(
        id="sample-blocks-item",
        geometry=_bbox_to_geom(bbox),
        bbox=bbox,
        datetime=NOW,
        properties={"table:row_count": len(gdf)},
        collection="sample-blocks",
    )
    item.add_asset(
        "data",
        pystac.Asset(
            href=href,
            media_type="application/vnd.pmtiles",
            roles=["data"],
            title="Synthetic city blocks (PMTiles)",
        ),
    )
    return item, bbox


def _bbox_to_geom(bbox):
    west, south, east, north = bbox
    return {
        "type": "Polygon",
        "coordinates": [
            [
                [west, south],
                [east, south],
                [east, north],
                [west, north],
                [west, south],
            ]
        ],
    }


def build_collection(coll_id: str, title: str, description: str, bbox) -> pystac.Collection:
    extent = pystac.Extent(
        spatial=pystac.SpatialExtent([bbox]),
        temporal=pystac.TemporalExtent([[NOW, NOW]]),
    )
    return pystac.Collection(
        id=coll_id,
        title=title,
        description=description,
        extent=extent,
        license="proprietary",
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    client = s3_client()

    dem_href = upload(client, SAMPLES / "raster" / "sample_dem.tif", "raster/sample_dem.tif")
    points_href = upload(client, SAMPLES / "vector" / "sample_points.parquet", "vector/sample_points.parquet")
    blocks_href = upload(client, SAMPLES / "vector" / "sample_blocks.pmtiles", "vector/sample_blocks.pmtiles")
    print("uploaded 3 assets to MinIO")

    dem_item, dem_bbox = build_dem_item(dem_href)
    points_item, points_bbox = build_points_item(points_href)
    blocks_item, blocks_bbox = build_blocks_item(blocks_href)

    collections = [
        build_collection("sample-dem", "Sample DEM", "Synthetic elevation raster (COG), M1 demo data.", dem_bbox),
        build_collection("sample-stations", "Sample Stations", "Synthetic point observations (GeoParquet), M1 demo data.", points_bbox),
        build_collection("sample-blocks", "Sample Blocks", "Synthetic city block polygons (PMTiles), M1 demo data.", blocks_bbox),
    ]
    items = [dem_item, points_item, blocks_item]

    collections_path = OUT / "collections.ndjson"
    items_path = OUT / "items.ndjson"
    with open(collections_path, "w") as f:
        for c in collections:
            f.write(json.dumps(c.to_dict()) + "\n")
    with open(items_path, "w") as f:
        for i in items:
            f.write(json.dumps(i.to_dict()) + "\n")
    print(f"wrote {collections_path}, {items_path}")

    pypgstac = str(ROOT / "data" / ".venv" / "bin" / "pypgstac")
    subprocess.run([pypgstac, "load", "collections", str(collections_path), "--dsn", PG_DSN, "-m", "upsert"], check=True)
    subprocess.run([pypgstac, "load", "items", str(items_path), "--dsn", PG_DSN, "-m", "upsert"], check=True)
    print("loaded into pgstac")


if __name__ == "__main__":
    main()
