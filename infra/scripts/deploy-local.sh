#!/usr/bin/env bash
# Populates the local overlay's secrets, checks preconditions, and deploys.
set -euo pipefail

NODE_CONTAINER="${NODE_CONTAINER:-desktop-control-plane}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OVERLAY="${ROOT}/infra/k8s/overlays/local"
SRC_ENV="${ROOT}/backend/.env"
SRC_KEY="${ROOT}/backend/serviceAccountKey.json"

[ -f "$SRC_ENV" ] || { echo "missing ${SRC_ENV}" >&2; exit 1; }
[ -f "$SRC_KEY" ] || { echo "missing ${SRC_KEY}" >&2; exit 1; }

echo "==> generating ${OVERLAY}/.env"
# Only these three come from the developer's file. DATABASE_URL is deliberately
# NOT copied: backend/.env points at localhost, which inside a pod is the pod
# itself. tr -d '\r' is required - a trailing CR ends up inside the secret value.
grep -E '^(JWT_SECRET|JWT_EXPIRES_IN|CONNECTOR_SECRET_KEY)=' "$SRC_ENV" \
  | tr -d '\r' > "${OVERLAY}/.env"
echo 'DATABASE_URL=postgres://transit:transit@postgres:5432/transit' >> "${OVERLAY}/.env"

echo "==> copying serviceAccountKey.json"
cp "$SRC_KEY" "${OVERLAY}/serviceAccountKey.json"

echo "==> preflight: are both images loaded into the node?"
present="$(docker exec "$NODE_CONTAINER" ctr --namespace k8s.io images ls -q || true)"
for name in backend frontend; do
  if ! printf '%s\n' "$present" | grep -q "transit-tracker/${name}:dev"; then
    echo "ERROR: transit-tracker/${name}:dev is not in the node's containerd." >&2
    echo "Run infra/scripts/build-images.sh first." >&2
    exit 1
  fi
done

echo "==> applying the local overlay"
kubectl apply -k "$OVERLAY"

echo "==> waiting for rollouts"
kubectl -n transit-tracker rollout status statefulset/postgres --timeout=300s
kubectl -n transit-tracker rollout status deployment/backend   --timeout=300s
kubectl -n transit-tracker rollout status deployment/frontend  --timeout=300s
kubectl -n transit-tracker rollout status deployment/worker    --timeout=300s

kubectl -n transit-tracker get pods
