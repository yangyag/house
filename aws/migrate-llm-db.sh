#!/bin/bash
# One-off EC2 migration: schema auto.llm -> database llm (same auto-postgres).
# Does not drop the old schema. Does not print secrets.
set -euo pipefail

WORKDIR=/home/ubuntu/llm
ENVFILE="$WORKDIR/.env"
STAMP=$(date -u +%Y%m%d-%H%M%S)
DUMP="$WORKDIR/llm-schema-before-db-migrate-$STAMP.sql"
ENVBAK="$ENVFILE.bak.$STAMP"
STARTED_OLD=0
COMPOSE_SWITCHED=0

log() { printf '%s\n' "$*"; }

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

restore_old_back() {
  if [ "$COMPOSE_SWITCHED" -eq 0 ] && [ "$STARTED_OLD" -eq 1 ]; then
    log '=== ROLLBACK: starting previous llm-back container ==='
    docker start llm-back >/dev/null || true
  fi
}
trap restore_old_back EXIT

[ -f "$ENVFILE" ] || die "missing $ENVFILE"
[ -f "$WORKDIR/docker-compose.yml" ] || die "missing compose file"

grep -qx 'APP_DB_NAME=auto' "$ENVFILE" || die 'APP_DB_NAME=auto not found as an exact line in .env'
grep -qx 'APP_DB_SCHEMA=llm' "$ENVFILE" || die 'APP_DB_SCHEMA=llm not found as an exact line in .env'
grep -qx 'APP_DB_HOST=auto-postgres' "$ENVFILE" || die 'APP_DB_HOST=auto-postgres not found as an exact line in .env'

exists=$(docker exec auto-postgres psql -U auto -d postgres -tAc "select 1 from pg_database where datname='llm'" | tr -d '[:space:]')
[ "$exists" != "1" ] || die 'database llm already exists'

log '=== SOURCE COUNTS (auto.llm) ==='
docker exec auto-postgres psql -U auto -d auto -c 'select (select count(*) from llm.posts) as posts, (select count(*) from llm.post_replies) as replies, (select count(*) from llm.post_attachments) as attachments, (select count(*) from llm.admins) as admins, (select count(*) from llm.flyway_schema_history) as flyway;'
SRC_POSTS=$(docker exec auto-postgres psql -U auto -d auto -tAc 'select count(*) from llm.posts' | tr -d '[:space:]')
SRC_REPLIES=$(docker exec auto-postgres psql -U auto -d auto -tAc 'select count(*) from llm.post_replies' | tr -d '[:space:]')
SRC_ATTS=$(docker exec auto-postgres psql -U auto -d auto -tAc 'select count(*) from llm.post_attachments' | tr -d '[:space:]')
SRC_ADMINS=$(docker exec auto-postgres psql -U auto -d auto -tAc 'select count(*) from llm.admins' | tr -d '[:space:]')
SRC_FLYWAY=$(docker exec auto-postgres psql -U auto -d auto -tAc 'select count(*) from llm.flyway_schema_history' | tr -d '[:space:]')
log "source posts=$SRC_POSTS replies=$SRC_REPLIES attachments=$SRC_ATTS admins=$SRC_ADMINS flyway=$SRC_FLYWAY"

log '=== STOP llm-back ==='
docker stop llm-back
STARTED_OLD=1

log "=== DUMP schema llm -> $DUMP ==="
docker exec auto-postgres pg_dump -U auto -d auto -n llm --format=plain > "$DUMP"
[ -s "$DUMP" ] || die "dump is empty: $DUMP"
log "dump bytes=$(wc -c < "$DUMP")"

log '=== CREATE DATABASE llm ==='
docker exec auto-postgres psql -U auto -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE llm OWNER llm ENCODING 'UTF8' LC_COLLATE 'en_US.utf8' LC_CTYPE 'en_US.utf8' TEMPLATE template0;"
docker exec auto-postgres psql -U auto -d postgres -v ON_ERROR_STOP=1 -c 'REVOKE ALL ON DATABASE llm FROM PUBLIC; GRANT CONNECT ON DATABASE llm TO llm;'

log '=== RESTORE dump into database llm ==='
docker cp "$DUMP" auto-postgres:/tmp/llm-migrate.sql
docker exec auto-postgres psql -U auto -d llm -v ON_ERROR_STOP=1 -f /tmp/llm-migrate.sql
docker exec auto-postgres psql -U auto -d llm -v ON_ERROR_STOP=1 -c 'ALTER SCHEMA llm OWNER TO llm;'
docker exec auto-postgres rm -f /tmp/llm-migrate.sql

log '=== TARGET COUNTS (llm.llm) ==='
docker exec auto-postgres psql -U auto -d llm -c 'select (select count(*) from llm.posts) as posts, (select count(*) from llm.post_replies) as replies, (select count(*) from llm.post_attachments) as attachments, (select count(*) from llm.admins) as admins, (select count(*) from llm.flyway_schema_history) as flyway;'
DST_POSTS=$(docker exec auto-postgres psql -U auto -d llm -tAc 'select count(*) from llm.posts' | tr -d '[:space:]')
DST_REPLIES=$(docker exec auto-postgres psql -U auto -d llm -tAc 'select count(*) from llm.post_replies' | tr -d '[:space:]')
DST_ATTS=$(docker exec auto-postgres psql -U auto -d llm -tAc 'select count(*) from llm.post_attachments' | tr -d '[:space:]')
DST_ADMINS=$(docker exec auto-postgres psql -U auto -d llm -tAc 'select count(*) from llm.admins' | tr -d '[:space:]')
DST_FLYWAY=$(docker exec auto-postgres psql -U auto -d llm -tAc 'select count(*) from llm.flyway_schema_history' | tr -d '[:space:]')

[ "$SRC_POSTS" = "$DST_POSTS" ] || die "posts mismatch $SRC_POSTS != $DST_POSTS"
[ "$SRC_REPLIES" = "$DST_REPLIES" ] || die "replies mismatch"
[ "$SRC_ATTS" = "$DST_ATTS" ] || die "attachments mismatch"
[ "$SRC_ADMINS" = "$DST_ADMINS" ] || die "admins mismatch"
[ "$SRC_FLYWAY" = "$DST_FLYWAY" ] || die "flyway mismatch"
log 'counts match'

log '=== CONNECT AS role llm ==='
docker exec auto-postgres psql -U llm -d llm -v ON_ERROR_STOP=1 -c 'select current_database(), current_user, current_schema();'
docker exec auto-postgres psql -U llm -d llm -v ON_ERROR_STOP=1 -c 'select version, description, success from llm.flyway_schema_history order by installed_rank;'

log "=== UPDATE .env APP_DB_NAME=auto -> llm (backup $ENVBAK) ==="
cp -a "$ENVFILE" "$ENVBAK"
sed -i 's/^APP_DB_NAME=auto$/APP_DB_NAME=llm/' "$ENVFILE"
grep -qx 'APP_DB_NAME=llm' "$ENVFILE" || die 'failed to set APP_DB_NAME=llm'
grep -q '^APP_DB_NAME=auto$' "$ENVFILE" && die 'APP_DB_NAME=auto still present'

log '=== RECREATE llm-back with new env ==='
cd "$WORKDIR"
export LLM_ENV_FILE="$ENVFILE"
docker compose --project-name ubuntu --env-file .env -f docker-compose.yml up -d --no-deps --wait --wait-timeout 180 back
COMPOSE_SWITCHED=1

log '=== CONTAINER APP_DB_NAME ==='
docker exec llm-back printenv APP_DB_NAME APP_DB_HOST APP_DB_SCHEMA APP_DB_USER

log '=== HEALTH ==='
sleep 2
curl -fsS -m 15 http://127.0.0.1:8083/api/v1/health
echo
curl -fsS -m 15 'http://127.0.0.1:8083/api/v1/posts?page=1' | head -c 400
echo

log '=== CONNECTIONS (expect datname=llm) ==='
docker exec auto-postgres psql -U auto -d postgres -c "select datname, usename, application_name, state, count(*) from pg_stat_activity where usename = 'llm' group by 1,2,3,4 order by 1;"

log '=== DONE ==='
log "dump=$DUMP"
log "env backup=$ENVBAK"
log 'old schema auto.llm left in place for rollback (not dropped)'
