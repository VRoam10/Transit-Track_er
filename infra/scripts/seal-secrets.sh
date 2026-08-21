#!/usr/bin/env bash
# Produces committed SealedSecrets for the prod overlay.
#
# Sealed values are encrypted with one specific cluster's controller key. Run this
# against the cluster you intend to deploy to, with kubectl pointed at it.
set -euo pipefail

NAMESPACE="${NAMESPACE:-transit-tracker}"
CONTROLLER_NAME="${CONTROLLER_NAME:-sealed-secrets-controller}"
CONTROLLER_NS="${CONTROLLER_NS:-kube-system}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${ROOT}/infra/k8s/overlays/prod/sealed"

command -v kubeseal >/dev/null 2>&1 || {
  cat >&2 <<'EOF'
ERROR: kubeseal is not installed.

  winget install Bitnami.SealedSecrets
  # or download the release binary:
  # https://github.com/bitnami/sealed-secrets/releases/tag/v0.39.1

Then install the in-cluster controller:
  bash infra/scripts/install-cluster-addons.sh --with-sealed-secrets
EOF
  exit 1
}

: "${DATABASE_URL:?set DATABASE_URL to the production connection string}"
: "${JWT_SECRET:?set JWT_SECRET}"
: "${JWT_EXPIRES_IN:=7d}"
: "${CONNECTOR_SECRET_KEY:?set CONNECTOR_SECRET_KEY}"
: "${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}"
: "${FIREBASE_KEY_FILE:=${ROOT}/backend/serviceAccountKey.json}"

[ -f "$FIREBASE_KEY_FILE" ] || { echo "missing ${FIREBASE_KEY_FILE}" >&2; exit 1; }

seal() {
  kubeseal --format yaml \
    --controller-name "$CONTROLLER_NAME" \
    --controller-namespace "$CONTROLLER_NS"
}

echo "==> sealing backend-secrets"
kubectl create secret generic backend-secrets \
  --namespace "$NAMESPACE" \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --from-literal=JWT_EXPIRES_IN="$JWT_EXPIRES_IN" \
  --from-literal=CONNECTOR_SECRET_KEY="$CONNECTOR_SECRET_KEY" \
  --dry-run=client -o yaml | seal > "${OUT}/backend-secrets.yaml"

echo "==> sealing postgres-secrets"
kubectl create secret generic postgres-secrets \
  --namespace "$NAMESPACE" \
  --from-literal=POSTGRES_USER=transit \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=POSTGRES_DB=transit \
  --dry-run=client -o yaml | seal > "${OUT}/postgres-secrets.yaml"

echo "==> sealing firebase-sa"
kubectl create secret generic firebase-sa \
  --namespace "$NAMESPACE" \
  --from-file=serviceAccountKey.json="$FIREBASE_KEY_FILE" \
  --dry-run=client -o yaml | seal > "${OUT}/firebase-sa.yaml"

cat <<EOF

==> wrote SealedSecrets to ${OUT}

Now add them to ${OUT}/kustomization.yaml:

resources:
  - backend-secrets.yaml
  - postgres-secrets.yaml
  - firebase-sa.yaml

Then commit. These files are safe to commit - only the cluster's controller can decrypt them.
EOF
