# stac-cloud-native

Lightweight STAC-native catalog, viewer, and admin dashboard — starter kit
alternative to GeoServer/GeoNetwork, built on cloud-native geospatial
formats (COG, PMTiles, GeoParquet, FlatGeobuf).

See [`docs/design.md`](docs/design.md) for full architecture, scope, and
milestones.

## Quickstart (M0)

```bash
cp .env.example .env
docker compose up -d
```

- STAC API: http://localhost:8080
- titiler: http://localhost:8000 (docs at `/api.html`)
- pgstac (Postgres): localhost:5439

Check health:

```bash
docker compose ps
curl http://localhost:8080/
curl http://localhost:8000/healthz
```

## Status

M0 in progress — core services scaffolded (pgstac, stac-fastapi, titiler).
No seed data, no frontend, no admin yet. See design doc milestones.
