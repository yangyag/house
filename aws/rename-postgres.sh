#!/bin/bash
# Rename auto-postgres -> yangyag-postgres and point LLM at the new DNS name.
# Reattaches house-inventory_default. House DB_HOST is switched by switch-house-db-host.sh.
set -euo pipefail

STAMP=$(date -u +%Y%m%d-%H%M%S)
AUTO_DIR=/home/ubuntu/auto
LLM_DIR=/home/ubuntu/llm
COMPOSE="$AUTO_DIR/docker-compose.yml"
LLM_ENV="$LLM_DIR/.env"

log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[ -f "$COMPOSE" ] || die "missing $COMPOSE"
[ -f "$LLM_ENV" ] || die "missing $LLM_ENV"

if docker inspect yangyag-postgres >/dev/null 2>&1 && ! docker inspect auto-postgres >/dev/null 2>&1; then
  log 'yangyag-postgres already present and auto-postgres gone; skip rename'
else
  grep -q 'container_name: auto-postgres' "$COMPOSE" || die 'auto compose does not have container_name: auto-postgres'
  cp -a "$COMPOSE" "$COMPOSE.bak.$STAMP"
  sed -i 's/container_name: auto-postgres/container_name: yangyag-postgres/' "$COMPOSE"
  grep -q 'container_name: yangyag-postgres' "$COMPOSE" || die 'failed to set container_name'
  grep -q 'container_name: auto-postgres' "$COMPOSE" && die 'old container_name still present'

  log '=== networks on current postgres (before recreate) ==='
  docker inspect auto-postgres --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'

  log '=== recreate postgres as yangyag-postgres ==='
  cd "$AUTO_DIR"
  docker compose up -d --wait --wait-timeout 120 postgres
fi

log '=== reattach house-inventory_default if needed ==='
if docker inspect yangyag-postgres --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | tr ' ' '\n' | grep -qx 'house-inventory_default'; then
  log 'already on house-inventory_default'
else
  docker network connect house-inventory_default yangyag-postgres
  log 'connected house-inventory_default'
fi

log '=== postgres container ==='
docker inspect --format '{{.Name}} image={{.Config.Image}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' yangyag-postgres
docker inspect yangyag-postgres --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} ip={{$v.IPAddress}} aliases={{range $v.Aliases}}{{.}} {{end}}{{println}}{{end}}'
docker port yangyag-postgres

log '=== host 127.0.0.1:5432 ==='
timeout 3 bash -c 'echo >/dev/tcp/127.0.0.1/5432' && log OPEN || die 'host 127.0.0.1:5432 closed'

log '=== LLM .env APP_DB_HOST ==='
if grep -qx 'APP_DB_HOST=yangyag-postgres' "$LLM_ENV"; then
  log 'already APP_DB_HOST=yangyag-postgres'
else
  grep -qx 'APP_DB_HOST=auto-postgres' "$LLM_ENV" || die 'APP_DB_HOST=auto-postgres not found'
  cp -a "$LLM_ENV" "$LLM_ENV.bak.$STAMP"
  sed -i 's/^APP_DB_HOST=auto-postgres$/APP_DB_HOST=yangyag-postgres/' "$LLM_ENV"
  grep -qx 'APP_DB_HOST=yangyag-postgres' "$LLM_ENV" || die 'failed to set APP_DB_HOST'
fi

log '=== recreate llm-back ==='
cd "$LLM_DIR"
export LLM_ENV_FILE="$LLM_ENV"
docker compose --project-name ubuntu --env-file .env -f docker-compose.yml up -d --no-deps --wait --wait-timeout 180 back

log '=== verify ==='
docker exec llm-back printenv APP_DB_HOST APP_DB_NAME APP_DB_SCHEMA
docker exec llm-back bash -ec 'timeout 3 bash -c "echo >/dev/tcp/yangyag-postgres/5432" && echo yangyag-postgres:5432 OPEN'
docker exec llm-back bash -ec 'timeout 2 bash -c "echo >/dev/tcp/127.0.0.1/5432" && echo llm-back-loopback OPEN || echo llm-back-loopback CLOSED'
curl -fsS -m 15 http://127.0.0.1:8083/api/v1/health
echo
docker inspect --format '{{.Name}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' llm-front llm-back yangyag-postgres
docker exec yangyag-postgres psql -U llm -d llm -c 'select current_database(), count(*) as posts from llm.posts;'
docker exec yangyag-postgres psql -U auto -d postgres -c 'select datname, usename, application_name, state, count(*) from pg_stat_activity where usename = chr(108)||chr(108)||chr(109) group by 1,2,3,4;'

log '=== DONE ==='
log "auto compose backup: $COMPOSE.bak.$STAMP (if created)"
log 'house-inventory DB_HOST is switched by /home/ubuntu/house-inventory flow in switch-house-db-host.sh'
