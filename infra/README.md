# `infra/` — Kubernetes deployment

Deploys the backend API, the background worker, the Next.js back-office and PostgreSQL to
Kubernetes. Plain Kustomize YAML: one `base`, a `local` overlay for Docker Desktop, and a
`prod` overlay.

```
infra/
  k8s/
    base/               all manifests, no environment-specific values
    overlays/local/     dev tags, generated secrets, transit.localtest.me
    overlays/prod/      GHCR images, TLS, SealedSecrets
    bootstrap/          notes on cluster addons (ingress-nginx, sealed-secrets)
  scripts/              build, deploy, seal, and the migration check
```

## Prerequisites

- **Docker Desktop with Kubernetes enabled** (Settings → Kubernetes → Enable). Wait until
  `kubectl get nodes` shows a `Ready` node — Docker Desktop rewrites your kubeconfig while
  starting, so an empty `kubectl config get-contexts` just means it is not finished yet.
- `kubectl` (its embedded Kustomize is all we use — no separate `kustomize` install).
- `backend/.env` and `backend/serviceAccountKey.json` present locally. Both are gitignored;
  the deploy script reads them to build the cluster secrets.
- `kubeseal` — **only** for the `prod` path. Not needed locally.

## Quickstart

```bash
bash infra/scripts/install-cluster-addons.sh
bash infra/scripts/build-images.sh
bash infra/scripts/deploy-local.sh
curl http://transit.localtest.me/api/health
```

The last command prints `OK`. Open <http://transit.localtest.me/> for the back-office.

`transit.localtest.me` is a public domain that resolves to `127.0.0.1`, so there is nothing to
add to your `hosts` file. Everything is served on port 80.

## How it fits together

One hostname serves both applications, split by path:

```
transit.localtest.me/api/*  ->  backend  Service :3000
transit.localtest.me/*      ->  frontend Service :3000
```

Because both live on one origin, the frontend image is built with `NEXT_PUBLIC_API_URL=""`, so
every call site emits a **relative** `/api/...` path. One image is therefore valid in every
environment, and the web app needs no CORS at all. `CORS_ORIGIN` is still set, because the
Flutter app talks to the backend directly rather than through the browser's same-origin rules.

**Migrations** run as an initContainer on the backend Deployment (`prisma migrate deploy`). It
is idempotent, re-runs on every rollout, and is safe with multiple replicas because Prisma takes
a database advisory lock. There is no migration Job to clean up.

**The worker is pinned to one replica with `strategy: Recreate`, deliberately.**
`src/worker/scheduler.ts` polls every 60s and sends push notifications with no lease and no
deduplication, so two copies send everything twice. `Recreate` matters as much as `replicas: 1`,
because the default RollingUpdate briefly runs the old and new pods together. Do not scale it.

## Why images must be loaded explicitly

Docker Desktop runs Kubernetes as a kind-style node on **containerd**, so Docker's image store is
not the kubelet's — `docker build` alone leaves the image invisible to the cluster.
`build-images.sh` therefore builds and then imports:

```bash
docker save "$image" | docker exec -i desktop-control-plane ctr --namespace k8s.io images import -
```

Rebuild and reload after any code change:

```bash
bash infra/scripts/build-images.sh
kubectl -n transit-tracker rollout restart deployment/backend deployment/frontend deployment/worker
```

## Secrets

**Locally**, `deploy-local.sh` generates them. It copies `JWT_SECRET`, `JWT_EXPIRES_IN` and
`CONNECTOR_SECRET_KEY` out of `backend/.env` into a gitignored
`overlays/local/.env`, and **overrides `DATABASE_URL`** to `postgres://transit:transit@postgres:5432/transit`
— your local value points at `localhost`, which inside a pod means the pod itself. It also copies
`serviceAccountKey.json` into the overlay. Kustomize hashes the generated Secret names, so
changing a secret rolls the pods automatically.

The Firebase key is mounted as a **file** at `/run/secrets/firebase/serviceAccountKey.json`,
because `firebase-admin` resolves `GOOGLE_APPLICATION_CREDENTIALS` as a path, not a value.

`base/secrets.example.yaml` documents every required key. It is intentionally absent from
`base/kustomization.yaml`, so placeholder credentials can never be applied by accident.

**In production**, secrets are SealedSecrets committed under `overlays/prod/sealed/`. They are
encrypted with one specific cluster's key and cannot be generated ahead of time — see
[`k8s/overlays/prod/sealed/README.md`](k8s/overlays/prod/sealed/README.md).

## Deploying to production

`overlays/prod` renders correctly but has **never been deployed** — it is a reviewed skeleton.
Before using it:

1. Replace `transit.example.com` in **both** `overlays/prod/patches/ingress.yaml` and
   `CORS_ORIGIN` in `overlays/prod/patches/config.yaml`. They must match.
2. Set the image tags in `overlays/prod/kustomization.yaml` to a real tag pushed by CI
   (branch name or `sha-<short>`).
3. Install the controllers: `bash infra/scripts/install-cluster-addons.sh --with-sealed-secrets`.
4. Seal the secrets and list them in `overlays/prod/sealed/kustomization.yaml`.
5. For TLS, install cert-manager and uncomment the `cert-manager.io/cluster-issuer` annotation,
   or provide the `transit-tls` Secret yourself.
6. `kubectl apply -k infra/k8s/overlays/prod`.

### Using a managed Postgres instead

Point `DATABASE_URL` in the sealed `backend-secrets` at the external host, then drop the
in-cluster database by removing `postgres/statefulset.yaml` and `postgres/service.yaml` from the
prod overlay — either with a `$patch: delete` patch or by giving `prod` its own resource list
instead of inheriting the whole base. `postgres-secrets` becomes unnecessary at that point.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `ErrImagePull` / `ImagePullBackOff` on backend or frontend | The image was never loaded into the node. Run `build-images.sh`. `deploy-local.sh` preflights this and refuses to apply, so you normally see its error instead. |
| `deploy-local.sh` says *"is not in the node's containerd"* | Exactly the above — run `build-images.sh` first. |
| PVC stuck `Pending` | Normal. Both StorageClasses are `WaitForFirstConsumer`, so the volume binds only once the Postgres pod is scheduled. |
| Backend `Init:CrashLoopBackOff` | Migrations failed. `kubectl -n transit-tracker logs deployment/backend -c migrate`. Usually Postgres is not ready yet, and it clears itself on retry. |
| `CreateContainerConfigError` | A referenced Secret does not exist. Locally, re-run `deploy-local.sh`; in prod, the sealed secrets are missing. |
| `503 Service Temporarily Unavailable` from nginx | Transient: pods are Ready but ingress-nginx has not yet observed their endpoints. It clears within a few seconds. `deploy-local.sh` already waits for a 200 before returning, so you should only see this if you curl during a manual `kubectl apply`. |
| `curl` cannot connect at all | Check the controller: `kubectl -n ingress-nginx get svc ingress-nginx-controller` should show an `EXTERNAL-IP`. See [`k8s/bootstrap/README.md`](k8s/bootstrap/README.md) for fallbacks. |
| 404 from nginx on every path | The Ingress is missing or its host does not match. `kubectl -n transit-tracker get ingress`. |
| Mobile app cannot reach the API | Flutter needs an **absolute** URL — relative paths only work for the web app. Point `environment.dart` at `http://transit.localtest.me`. |

After a Prisma schema change, check migrations still apply cleanly before deploying:

```bash
bash infra/scripts/test-migrations.sh
```

## Relationship to `compose.yml`

`compose.yml` at the repo root still works for single-host runs and was not changed by this
work. Use it for plain local development; use `infra/` when you want the Kubernetes topology.
