#!/usr/bin/env bash
# Installs cluster addons at pinned versions.
#   --with-sealed-secrets   also install the sealed-secrets controller (needed for prod only)
set -euo pipefail

INGRESS_NGINX_VERSION="${INGRESS_NGINX_VERSION:-controller-v1.15.1}"
SEALED_SECRETS_VERSION="${SEALED_SECRETS_VERSION:-v0.39.1}"

INGRESS_URL="https://raw.githubusercontent.com/kubernetes/ingress-nginx/${INGRESS_NGINX_VERSION}/deploy/static/provider/cloud/deploy.yaml"
# NOTE: the org is bitnami, not bitnami-labs. The old path still redirects, but use the canonical one.
SEALED_URL="https://github.com/bitnami/sealed-secrets/releases/download/${SEALED_SECRETS_VERSION}/controller.yaml"

WITH_SEALED=0
for arg in "$@"; do
  case "$arg" in
    --with-sealed-secrets) WITH_SEALED=1 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

echo "==> installing ingress-nginx ${INGRESS_NGINX_VERSION}"
kubectl apply -f "$INGRESS_URL"

echo "==> waiting for the ingress-nginx controller to be ready"
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

if [ "$WITH_SEALED" -eq 1 ]; then
  echo "==> installing sealed-secrets ${SEALED_SECRETS_VERSION}"
  kubectl apply -f "$SEALED_URL"
  kubectl wait --namespace kube-system \
    --for=condition=available deployment \
    --selector=app.kubernetes.io/name=sealed-secrets \
    --timeout=300s
fi

echo "==> done"
kubectl get ingressclass
