#!/bin/bash
# Point house-inventory at yangyag-postgres (was auto-postgres) and recreate containers.
set -euo pipefail

STAMP=$(date -u +%Y%m%d-%H%M%S)
WORKDIR=/home/ubuntu/house-inventory
ENVFILE="$WORKDIR/.env"

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[ -f "$ENVFILE" ] || die "missing $ENVFILE"
docker inspect yangyag-postgres >/dev/null 2>&1 || die 'yangyag-postgres not found'

log '=== reattach house-inventory_default if needed ==='
if docker inspect yangyag-postgres --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | tr ' ' '\n' | grep -qx 'house-inventory_default'; then
  log 'already on house-inventory_default'
else
  docker network connect house-inventory_default yangyag-postgres
  log 'connected house-inventory_default'
fi

log '=== house-inventory .env DB_HOST ==='
if grep -qx 'DB_HOST=yangyag-postgres' "$ENVFILE"; then
  log 'already DB_HOST=yangyag-postgres'
else
  grep -qx 'DB_HOST=auto-postgres' "$ENVFILE" || die 'DB_HOST=auto-postgres not found as an exact line in .env'
  cp -a "$ENVFILE" "$ENVFILE.bak.$STAMP"
  sed -i 's/^DB_HOST=auto-postgres$/DB_HOST=yangyag-postgres/' "$ENVFILE"
  grep -qx 'DB_HOST=yangyag-postgres' "$ENVFILE" || die 'failed to set DB_HOST'
  grep -qx 'DB_HOST=auto-postgres' "$ENVFILE" && die 'old DB_HOST still present'
  log "updated DB_HOST (backup $ENVFILE.bak.$STAMP)"
fi

log '=== .env ==='
grep -E '^(CONTAINER_PREFIX|NETWORK_NAME|FRONT_PORT|DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_SCHEMA)=' "$ENVFILE"

log '=== recreate house-inventory ==='
cd "$WORKDIR"
docker compose up -d --force-recreate --wait --wait-timeout 180

log '=== compose ps ==='
docker compose ps

log '=== back datasource ==='
docker exec house-inventory-back printenv SPRING_DATASOURCE_URL SPRING_DATASOURCE_USERNAME SPRING_JPA_PROPERTIES_HIBERNATE_DEFAULT_SCHEMA

log '=== wait for API ==='
ok=0
for i in $(seq 1 24); do
  if curl -fsS -m 5 http://127.0.0.1:8085/api/items >/tmp/house-items.json; then
    ok=1
    break
  fi
  sleep 5
done
[ "$ok" = 1 ] || die 'http://127.0.0.1:8085/api/items did not become ready'
log 'local /api/items OK'
python3 - <<'PY'
import json
with open('/tmp/house-items.json', encoding='utf-8') as f:
    data = json.load(f)
print('item_count', len(data) if isinstance(data, list) else type(data).__name__)
PY

log '=== public API ==='
curl -fsS -m 15 -o /tmp/house-items-public.json -w 'https://yangyag2.duckdns.org/api/items HTTP %{http_code}\n' https://yangyag2.duckdns.org/api/items

log '=== DONE ==='
