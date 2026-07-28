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
address, resolvable by stac-fastapi/titiler but not from the host browser.
Revisit when the frontend (M2) needs direct browser access.

## Status

M1 done — 3 sample collections/items seeded and searchable, titiler renders
the sample COG from MinIO. No frontend or admin yet. See design doc
milestones.
