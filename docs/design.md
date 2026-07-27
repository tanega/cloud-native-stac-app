# Design Doc — stac-cloud-native

## Goal

OSS starter kit: lightweight STAC-native catalog + viewer + admin, built entirely
on cloud-native geospatial formats. Alternative to GeoServer/GeoNetwork's
Java/XML stack — small containers, object-storage-first, spec-compliant STAC
instead of WMS/WFS/CSW.

## Non-goals

- Not a drop-in GeoServer/GeoNetwork replacement (no WMS/WFS/CSW protocol
  support, no ISO19115/19139 metadata).
- Not optimized for massive multi-tenant production scale — optimize for
  clarity, small footprint, and reuse as a starter template.
- No heavy external auth dependency (no Keycloak) — pluggable later.

## Formats in scope

| Format | Role |
|---|---|
| STAC Items/Collections (JSON) | catalog metadata |
| COG (Cloud-Optimized GeoTIFF) | raster assets, HTTP range reads |
| PMTiles | vector tiles, single file, served directly from object storage |
| GeoParquet | bulk vector data, client-side queryable (duckdb-wasm) |
| FlatGeobuf | streamable vector features |
| Zarr | multidim data cubes (stretch) |

## Architecture

```
┌─────────┐   ┌──────────────┐   ┌─────────┐
│   web   │──▶│ stac-fastapi │──▶│ pgstat  │
│ (React) │   │  (search +   │   │(Postgres)│
│         │   │ transactions)│   └─────────┘
│         │──▶│   titiler    │  (COG tiles)
│         │──▶│   MinIO      │  (assets, direct read for PMTiles/GeoParquet)
│         │──▶│  ingest-api  │──▶ stac-fastapi (registers items)
└─────────┘   └──────────────┘
```

Six small containers, one `docker-compose.yml`, no JVM, no XML config.

### Services

- **pgstac** — Postgres + pgstac schema, catalog store
- **stac-fastapi** — STAC API (search, collections, items, CQL2, Transactions
  extension for writes)
- **titiler** — dynamic COG → tile/preview rendering
- **minio** — S3-compatible object storage for uploaded assets, local dev
  stand-in for real S3/R2 in prod
- **ingest-api** — small FastAPI service, admin upload pipeline:
  1. receive file (COG/GeoTIFF, PMTiles, GeoParquet, FlatGeobuf)
  2. validate; auto-cogify plain GeoTIFF via rio-cogeo if not already COG
  3. push asset to MinIO
  4. extract bbox/datetime/proj (rasterio/pyogrio)
  5. build STAC Item (pystac), generate thumbnail
  6. POST to stac-fastapi Transactions endpoint
- **web** — React + TypeScript + Vite + MapLibre GL + TanStack Query
  - public: catalog browse, map, search/filter (bbox/time/collection), COG
    preview via titiler, PMTiles vector layer, GeoParquet client-query demo
    (duckdb-wasm)
  - admin (JWT-guarded): login, collection CRUD, item upload (drag-drop +
    map preview before publish), item/collection management

### Auth

Simple JWT login. Admin user(s) bootstrapped via seed script, bcrypt
password, JWT session. Gates write endpoints only (stac-fastapi Transactions
+ ingest-api) — search/browse stays public. No external auth dependency.
OAuth2/OIDC pluggable later if needed.

## Repo layout

```
/api      pgstac + stac-fastapi compose config, env
/tiler    titiler config
/ingest   ingest-api service (M6)
/web      frontend app (M2+)
/data     sample assets + ingest/seed scripts
/docs     design notes, ADRs
docker-compose.yml
```

## Sample data

Mixed synthetic set, small footprint:
- 1 COG raster collection (small clipped extract)
- 1 PMTiles vector collection (built via tippecanoe/pmtiles CLI)
- 1 GeoParquet collection (points/polygons)

All cataloged as real STAC Items, loaded via `pypgstac load`.

## Milestones

- **M0** — scaffold: compose skeleton, pg+pgstac / stac-fastapi / titiler
  healthy, empty catalog reachable
- **M1** — seed data: ingest script (CLI), 3 sample collections loaded,
  search works
- **M2** — frontend MVP: map, catalog browse, COG preview via titiler
- **M3** — PMTiles layer render + GeoParquet client-query demo
- **M4** — admin auth: JWT login, admin bootstrap, protected-route
  middleware on transactions + ingest-api
- **M5** — admin dashboard: collection CRUD UI
- **M6** — item upload pipeline: ingest-api + drag-drop UI + map preview
  before publish
- **M7** — polish: item/collection management (edit/delete), docs, README,
  one-command dev up
- **Stretch** — Zarr datacube view, CQL2 filter builder UI, deploy templates
  (Fly/Render), OAuth2 pluggable auth, role-based multi-admin

## Open decisions deferred

- Exact stac-fastapi / pgstac image version pins (start on `latest`, pin
  once M0 is verified working)
- Prod object storage target (S3 vs R2) — MinIO is dev-only stand-in
- Deploy templates — out of scope until stretch
