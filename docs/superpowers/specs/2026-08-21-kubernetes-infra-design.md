# Kubernetes Infrastructure (`infra/`) — Design

- **Date:** 2026-08-21
- **Status:** Approved design, ready for implementation planning
- **Scope:** Backend, worker, frontend and Postgres deployed to Kubernetes via Kustomize,
  plus the image/build changes that deployment requires. The Flutter mobile app is a client,
  not a cluster workload; it is out of scope except for the note on its base URL.

## Problem

The stack is only deployable through `compose.yml` on a single host. That file also encodes
several things that cannot survive a move to Kubernetes:

- `JWT_SECRET` is hardcoded in plaintext (`compose.yml:13`), as are the Postgres credentials.
- The Firebase service account arrives as a Docker Compose *secret*, a Compose-only concept.
- Prisma migrations are never applied by the deployment. Someone runs `npm run prisma:deploy`
  by hand, so a fresh environment starts with an empty schema.
- The worker is a singleton scheduler by accident rather than by declaration — nothing stops
  a second copy from running and double-sending push notifications.
- There is **no frontend image at all**. Only `backend/Dockerfile` exists, so the Next.js
  back-office cannot be deployed anywhere.

## Goals

1. An `infra/` folder holding everything needed to run the stack on Kubernetes.
2. Plain, readable Kustomize YAML: one `base` plus a `local` and a `prod` overlay.
3. A working local deployment on Docker Desktop Kubernetes, reachable over HTTP.
4. Migrations applied automatically as part of a deploy, not by hand.
5. Secrets never committed in plaintext, and the Firebase key delivered as a *file* because
   the application reads it via a path.
6. One frontend image that works in every environment — no per-environment rebuild.
7. Images built locally for iteration and pushed to GHCR by CI for real deployments.

## Non-goals

- Autoscaling (HPA), PodDisruptionBudgets, NetworkPolicies, service mesh. YAGNI at this size.
- Monitoring/logging stack (Prometheus, Loki). Separate concern.
- A CD step that deploys from CI. There are no cluster credentials to hold yet; CI builds and
  pushes images only, and deploys stay a deliberate `kubectl` action.
- Migrating away from in-cluster Postgres to a managed instance. Documented, not built.
- Any change to `compose.yml`. It keeps working as the single-host path.

## Decisions

| Question | Decision | Why |
|---|---|---|
| Target | Local now, cloud-ready structure | `base` + `local`/`prod` overlays; only `local` is exercised today |
| Tooling | Kustomize, no Helm | `kubectl` already embeds Kustomize v5.8.1; plain YAML reads and reviews better |
| Browser to API | Same origin through one Ingress | One portable frontend image; CORS stops applying to the web app |
| Secrets | `secretGenerator` locally, SealedSecrets in prod | No `kubeseal` needed to iterate locally; prod state stays in git, encrypted |
| Images | Local `docker build` + explicit load into the node + CI push to GHCR | The cluster runs containerd, so Docker's image store is *not* shared (see below) |
| Migrations | initContainer, not a Job | A fixed-name Job has immutable fields and fails re-apply after an image bump |

## Architecture

Namespace `transit-tracker`. Five objects carry the workload. The replica counts below are the
**base** defaults; each overlay patches them (see "Overlay differences").

| Workload | Kind | Replicas (base) | Notes |
|---|---|---|---|
| `postgres` | StatefulSet | 1 | `postgres:14` (matches compose), `volumeClaimTemplate` for `/var/lib/postgresql/data` |
| `backend` | Deployment | 2 | probes `GET /api/health`, port 3000, migrate initContainer |
| `worker` | Deployment | **1**, `strategy: Recreate` | see below |
| `frontend` | Deployment | 2 | Next.js standalone, probes `GET /`, port 3000 |
| `ingress` | Ingress | — | `ingressClassName: nginx` |

Services are named plainly — `postgres`, `backend`, `frontend` — all ClusterIP on port 3000
(5432 for Postgres). In-cluster DNS gives the worker `URL_SERVER=http://backend:3000` and the
backend `DATABASE_URL=postgres://transit:transit@postgres:5432/transit`.

### The worker must stay a singleton

`src/worker/scheduler.ts` wakes every 60s, evaluates cron expressions across all saved
timetables and sends push notifications. It holds no lease and does no deduplication, so two
running copies send every notification twice. Therefore: `replicas: 1` **and**
`strategy: Recreate`. Recreate matters as much as the replica count — the default
RollingUpdate briefly runs old and new pods together, which is exactly the overlap to avoid.
This is a declared constraint, not a scaling oversight; it is written into the manifest as a
comment so nobody "helpfully" scales it later.

### Ingress routing

One host serves both apps:

```
<host>/api/*  ->  Service backend  :3000
<host>/*      ->  Service frontend :3000
```

Both rules use `pathType: Prefix`; nginx resolves by longest prefix, so `/api` wins over `/`.
No path rewriting — the backend already mounts every route under `/api`, so the path the
Ingress matches is the path the backend expects.

The frontend image is built with `NEXT_PUBLIC_API_URL=""`, which turns all six call sites into
relative `/api/...` requests. Consequences worth stating: the same image is valid in every
environment, and browser traffic is same-origin so `CORS_ORIGIN` no longer governs the web
app. `CORS_ORIGIN` is still set (to the app's own origin) because the Flutter client and any
future external consumer talk to the backend directly.

Local host is **`transit.localtest.me`**. That domain publicly resolves to `127.0.0.1`, so
local development needs no `hosts` file edit.

### Migrations

The backend Deployment gets one initContainer, same image as the app, running
`./node_modules/.bin/prisma migrate deploy` with `DATABASE_URL` from the secret. The direct
binary path is used rather than `npx` to avoid any cache or network work under `USER node`.

Chosen over a standalone Job because a Job's `spec.template` is immutable: re-applying after
an image bump fails, so every deploy would need a manual `kubectl delete job`. The
initContainer is idempotent (`migrate deploy` skips applied migrations) and safe with two
replicas, since Prisma takes a database advisory lock and the second caller waits.

No separate wait-for-database container. If Postgres is not yet accepting connections the
initContainer exits non-zero and the kubelet retries it with backoff, which is the same
behaviour a wait loop would produce with less to maintain.

**Alternative, if ever needed:** a `Job` with `ttlSecondsAfterFinished` and a name suffixed by
image tag, applied ahead of the Deployment. More ceremony, and only worth it if migrations
grow long enough that repeating them on every pod start becomes a real cost.

## Repository layout

```
infra/
  README.md                          # quickstart, runbook, prod notes
  k8s/
    base/
      kustomization.yaml
      namespace.yaml
      config.yaml                    # ConfigMap: non-secret env
      secrets.example.yaml           # placeholders documenting required keys; never applied
      postgres/{statefulset,service}.yaml
      backend/{deployment,service}.yaml
      worker/deployment.yaml
      frontend/{deployment,service}.yaml
      ingress.yaml
    overlays/
      local/
        kustomization.yaml           # :dev images, secretGenerator, transit.localtest.me
        patches/*.yaml
        .env                         # GITIGNORED, generated
        serviceAccountKey.json       # GITIGNORED, copied
      prod/
        kustomization.yaml           # ghcr.io images, replicas, limits, TLS
        patches/*.yaml
        sealed/                      # committed SealedSecrets + kustomization.yaml
    bootstrap/
      README.md                      # what the addons are and why they are pinned
  scripts/
    build-images.sh
    install-cluster-addons.sh
    deploy-local.sh
    seal-secrets.sh
```

## Local images: the cluster is containerd, not dockerd

Verified against the actual cluster on 2026-08-21:

```
kubectl get nodes -o wide
desktop-control-plane   Ready   control-plane   v1.36.1   containerd://2.3.1
```

Docker Desktop now runs Kubernetes as a kind-style single node (the node's own images are
`kindest/kindnetd`, `kindest/local-path-provisioner`). The consequence matters: **`docker build`
output is invisible to the kubelet**, because Docker's image store and the node's containerd
store are separate. An earlier assumption that the two are shared — true of the older
dockerd-backed Docker Desktop Kubernetes — does not hold here.

`build-images.sh` therefore builds and then explicitly loads. This round trip was tested
end to end and works:

```sh
docker save "$IMAGE" | docker exec -i desktop-control-plane \
  ctr --namespace k8s.io images import -
```

Two details this pins down:

- Imported images are namespaced as `docker.io/library/...` (or `docker.io/<org>/...`), which is
  exactly what a bare `transit-tracker/backend:dev` reference in a manifest resolves to. No
  rewriting needed.
- The `local` overlay sets `imagePullPolicy: Never`. If a load step were ever missed, `Never`
  fails as an unmistakable `ErrImageNeverPull` rather than a confusing authentication error from
  Docker Hub for a repository that does not exist.

The node container is reachable via `docker exec` even though it does not appear in `docker ps`,
so the script must not try to discover it by listing containers. Its name is treated as a
variable at the top of the script, defaulting to `desktop-control-plane`.

### Storage

The cluster provides two StorageClasses, both `rancher.io/local-path`: `standard` (default) and
`hostpath`. The base `volumeClaimTemplate` therefore **omits `storageClassName`** and inherits
`standard`; only the `prod` overlay names one explicitly. Both use `WaitForFirstConsumer`, so a
freshly applied PVC sits `Pending` until the Postgres pod is scheduled — expected, not a fault.

## Configuration and secrets

**ConfigMap `app-config`** (non-secret): `NODE_ENV`, `PORT=3000`, `CORS_ORIGIN`,
`URL_SERVER=http://backend:3000`,
`GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase/serviceAccountKey.json`.

**Three secrets**, with identical shapes in both overlays so the Deployments never branch:

| Secret | Keys | Consumed as |
|---|---|---|
| `backend-secrets` | `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CONNECTOR_SECRET_KEY` | `envFrom` |
| `postgres-secrets` | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `envFrom` on the StatefulSet |
| `firebase-sa` | `serviceAccountKey.json` | **volume mount** at `/run/secrets/firebase` |

`firebase-sa` is a mount, not an env var, because `firebase-admin` resolves
`GOOGLE_APPLICATION_CREDENTIALS` as a filesystem path. `DATABASE_URL` embeds the password, so
it lives in the secret rather than the ConfigMap. That does mean the Postgres credentials are
stated twice — once in `postgres-secrets` for the server, once inside `DATABASE_URL` for the
client. Accepted: deriving one from the other needs templating that Kustomize does not do.

`base/secrets.example.yaml` is deliberately **not** listed in `base/kustomization.yaml`'s
`resources`. It exists only as documentation of the required keys, so `kubectl apply -k` can
never apply placeholder credentials by accident.

### Local: `secretGenerator`

The `local` overlay generates its secrets from files inside the overlay directory. It cannot
read `backend/.env` directly — Kustomize refuses to load files above the kustomization root
unless load restrictions are disabled, which is not worth doing. So `deploy-local.sh`
populates the overlay first:

- writes `overlays/local/.env` with `JWT_SECRET`, `JWT_EXPIRES_IN` and
  `CONNECTOR_SECRET_KEY` copied from `backend/.env`, and **`DATABASE_URL` overridden** to the
  in-cluster value. This override is essential: the developer's `backend/.env` points at
  `localhost`, which inside a pod means the pod itself.
- copies `backend/serviceAccountKey.json` into the overlay.
- both paths are added to `.gitignore`.

`postgres-secrets` comes from literals in the local `kustomization.yaml` using the same
`transit/transit/transit` dev values already present in `compose.yml`. These are committed
knowingly: they are local-only, already in the repo, and never reachable from outside the
machine.

Kustomize appends a content hash to generated secret names and rewrites every reference, so
changing a secret rolls the pods automatically.

### Prod: SealedSecrets

`seal-secrets.sh` pipes `kubectl create secret --dry-run=client -o yaml` through `kubeseal`
and writes `overlays/prod/sealed/*.yaml`, which are committed. SealedSecret names match the
plain names above, so the Secret each one produces satisfies the base references.

**Known limit, stated plainly:** sealed values are encrypted with a specific cluster's
controller key, so these files cannot be generated ahead of time or shared between clusters.
`overlays/prod/sealed/` therefore ships with an empty `kustomization.yaml` and a README; the
real files appear when someone runs the script against a cluster that has the controller
installed. Until then the `prod` overlay renders but will not run.

## Changes outside `infra/`

Deployment is impossible without these; none is optional.

| File | Change | Why |
|---|---|---|
| `backend/Dockerfile` | add `COPY --from=builder --chown=node:node /app/prisma ./prisma` | **Blocking.** The runner stage copies only `node_modules`, `dist` and `package*.json`. Without `prisma/` there is no schema and no migrations directory, so `prisma migrate deploy` cannot run in the initContainer. |
| `backend/Dockerfile` | `npm ci` instead of `npm install` | `package-lock.json` is committed; `ci` builds reproducibly and fails on drift |
| `backend/.dockerignore` | new file | None exists, so `COPY . .` ships local `node_modules`, `.env`, `serviceAccountKey.json`, `dist/` and `trace.log` into the build context. They do not reach the final image, but they do land in the builder layer — a real leak as soon as that layer is cached remotely or pushed. |
| `frontend/next.config.ts` | add `output: "standalone"` | Produces the self-contained `server.js`; without it the image needs full `node_modules` |
| `frontend/Dockerfile` | new file, multi-stage | No frontend image exists today |
| `frontend/.dockerignore` | new file | Same reason as the backend |
| `.gitignore` | ignore the two generated local-overlay files | Keeps real secrets out of git |

`prisma` is a production dependency, so it survives `npm prune --omit=dev` and its query
engines come along inside the copied `node_modules`. No extra install step is needed.

The frontend Dockerfile must set `ENV NEXT_PUBLIC_API_URL=""` **before** `next build`. Next
inlines this value at build time, and five of the six call sites have no fallback — leaving it
unset compiles the literal `undefined` into the bundle and every request becomes
`undefined/api/...`. Setting it to the empty string is what produces relative URLs.

## Overlay differences

| | `local` | `prod` |
|---|---|---|
| Images | `transit-tracker/{backend,frontend}:dev`, `imagePullPolicy: Never` (loaded into containerd) | `ghcr.io/vroam10/transit-tracker-{backend,frontend}:<tag>`, `IfNotPresent` |
| Host | `transit.localtest.me`, HTTP | `transit.example.com`, HTTPS — a committed placeholder, since no production domain exists yet; replacing it is a one-line overlay edit |
| TLS | none | `tls:` block with `secretName`, plus a documented cert-manager annotation |
| Replicas | 1 backend, 1 frontend | 2 backend, 2 frontend (worker stays 1 everywhere) |
| Resources | small requests, generous limits | tuned requests and limits |
| Secrets | `secretGenerator` | SealedSecrets |

GHCR image names are lowercased and hyphenated (`transit-tracker-backend`) rather than derived
literally from the repository name, avoiding the underscore in `Transit-Track_er`.

## CI

New workflow `.github/workflows/build-images.yml`:

- Triggers on push to `main` and `dev` with paths filters on `backend/**` and `frontend/**`,
  plus `workflow_dispatch`.
- Matrix over the two images, each with its own context and Dockerfile.
- Logs in to GHCR with the built-in `GITHUB_TOKEN` (`permissions: packages: write`).
- Tags each image with the branch name and the short SHA.
- Uses buildx with GitHub Actions layer caching.

It builds and pushes only. The existing `build-release.yml` (Flutter APK) is untouched.

## Cluster addons

`install-cluster-addons.sh` installs, each pinned to an explicit version variable at the top of
the script:

- **ingress-nginx** — Docker Desktop ships no ingress controller. The `provider/cloud` manifest
  is the right one here: it requests a LoadBalancer Service, which Docker Desktop publishes on
  `localhost:80`.
- **sealed-secrets controller** — only needed for the `prod` path; the script takes a flag so
  local users can skip it.

The exact manifest URLs must be verified to resolve during implementation rather than assumed,
since both projects reorganise their release assets from time to time.

## Verification plan

Offline, no cluster required:

1. `kubectl kustomize infra/k8s/overlays/local` and `.../prod` both render without error.
2. `docker build` succeeds for backend and frontend.
3. **The real test of the Prisma fix:** run the built backend image's `migrate deploy` against
   a throwaway `postgres:14` container and confirm all 13 migrations apply. This proves the
   `COPY prisma` change works rather than assuming it.

Against Docker Desktop Kubernetes (cluster confirmed Ready, v1.36.1):

4. Both images load into the node's containerd and appear in `ctr images ls`.
5. `install-cluster-addons.sh` brings up ingress-nginx and its Service becomes reachable from
   the host — the one step that must be *observed* rather than assumed (see Risks).
6. `deploy-local.sh`, then all pods reach Ready and the backend's initContainer completes.
7. `curl http://transit.localtest.me/api/health` returns `OK`.
8. `curl -I http://transit.localtest.me/` returns 200 from the frontend, confirming both
   Ingress rules resolve to the right Service.

Any step that cannot be completed is reported as unverified rather than assumed.

## Risks

- **Host reachability of the Ingress is unverified.** The older Docker Desktop published
  `LoadBalancer` Services on `localhost:80`, but this cluster is the kind-style containerd
  build and that behaviour has not been confirmed here. If no external IP materialises, the
  fallbacks in preference order are: ingress-nginx with `hostPort: 80`, then a NodePort plus
  `kubectl port-forward`. This must be settled by observation during implementation, and the
  README should document whichever path actually works.
- **`prod` cannot be fully validated** from here — no prod cluster, and sealed secrets are
  cluster-bound. It is a reviewed, rendering skeleton, not a proven deployment.
- **Addon manifest URLs** are external and can move; pinned versions must be checked, not
  trusted.
- **The Flutter app still needs an absolute base URL.** Same-origin routing solves this for
  the web app only. `environment.dart` must point at the Ingress host; this design does not
  change the mobile app, it only notes the dependency.
