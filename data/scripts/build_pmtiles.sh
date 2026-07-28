#!/usr/bin/env bash
# Convert the synthetic polygon sample into PMTiles via tippecanoe + pmtiles CLI.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IN="$ROOT/data/samples/vector/sample_blocks.geojson"
MBTILES="$ROOT/data/samples/vector/sample_blocks.mbtiles"
OUT="$ROOT/data/samples/vector/sample_blocks.pmtiles"

tippecanoe -o "$MBTILES" -zg --drop-densest-as-needed -l blocks -f "$IN"
pmtiles convert "$MBTILES" "$OUT"
rm -f "$MBTILES"

echo "wrote $OUT"
