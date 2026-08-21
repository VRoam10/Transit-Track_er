#!/usr/bin/env bash
# Builds both images and loads them into the cluster node's containerd.
#
# Docker Desktop runs Kubernetes as a kind-style node on containerd, so Docker's
# image store is NOT the kubelet's. Built images must be imported explicitly.
set -euo pipefail

NODE_CONTAINER="${NODE_CONTAINER:-desktop-control-plane}"
TAG="${TAG:-dev}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

build_and_load() {
  local name="$1" context="$2"
  local image="transit-tracker/${name}:${TAG}"

  echo "==> building ${image}"
  docker build -t "$image" "$context"

  echo "==> loading ${image} into ${NODE_CONTAINER}"
  docker save "$image" \
    | docker exec -i "$NODE_CONTAINER" ctr --namespace k8s.io images import -
}

build_and_load backend  "${ROOT}/backend"
build_and_load frontend "${ROOT}/frontend"

echo "==> images present in the node:"
docker exec "$NODE_CONTAINER" ctr --namespace k8s.io images ls -q \
  | grep transit-tracker
