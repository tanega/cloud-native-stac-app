# stac-cloud-native

Lightweight STAC-native catalog, viewer, and admin dashboard — starter kit
alternative to GeoServer/GeoNetwork, built on cloud-native geospatial
formats (COG, PMTiles, GeoParquet, FlatGeobuf).

See [`docs/design.md`](docs/design.md) for full architecture, scope, and
milestones.

## Quickstart

```bash
cp .env.example .env
docker compose up -d
```

- STAC API: http://localhost:8080
- titiler: http://localhost:8000 (docs at `/api.html`)
- pgstac (Postgres): localhost:5439
- MinIO console: http://localhost:9001 (S3 API on :9000)

Check health:

```bash
docker compose ps
curl http://localhost:8080/
curl http://localhost:8000/healthz
```

## Seed sample data (M1)

Generates a synthetic COG, GeoParquet, and PMTiles asset, uploads them to
MinIO, and loads matching STAC Collections/Items into pgstac.

```bash
python3 -m venv data/.venv
data/.venv/bin/pip install -r data/requirements.txt

data/.venv/bin/python data/scripts/generate_samples.py
data/scripts/build_pmtiles.sh   # requires tippecanoe + pmtiles CLI

set -a; source .env; set +a
data/.venv/bin/python data/scripts/seed.py
```

Verify:

```bash
curl http://localhost:8080/collections
curl http://localhost:8080/search
```

Note: asset hrefs use the docker-network-internal `http://minio:9000/...`
address. This is fine for COG preview, since the browser only ever talks
to titiler (which resolves `minio` itself); it'll need revisiting for M3
when the browser fetches PMTiles/GeoParquet directly.

## Frontend (M2)

React + Vite + MapLibre GL + TanStack Query. Catalog browse (collections →
items) with a map; selecting an item with a COG asset renders it live via
titiler.

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173.

## Status

M2 done — frontend browses collections/items and renders the sample COG
raster on the map via titiler. No admin yet. See design doc milestones.
