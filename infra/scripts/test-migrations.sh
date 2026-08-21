#!/usr/bin/env bash
# Proves the backend image can apply Prisma migrations against a real Postgres.
set -euo pipefail

IMAGE="${IMAGE:-transit-tracker/backend:dev}"
NET="ttk-migtest-$$"
DB="ttk-migtest-db-$$"

cleanup() {
  docker rm -f "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET" \
  -e POSTGRES_USER=transit -e POSTGRES_PASSWORD=transit -e POSTGRES_DB=transit \
  postgres:14 >/dev/null

echo "waiting for postgres..."
for _ in $(seq 1 30); do
  if docker exec "$DB" pg_isready -U transit -d transit >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$DB" pg_isready -U transit -d transit >/dev/null

docker run --rm --network "$NET" \
  -e DATABASE_URL="postgres://transit:transit@${DB}:5432/transit" \
  "$IMAGE" ./node_modules/.bin/prisma migrate deploy
