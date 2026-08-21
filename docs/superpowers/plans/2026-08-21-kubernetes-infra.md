# Kubernetes Infrastructure (`infra/`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the backend, worker, frontend and Postgres to Kubernetes from a new `infra/` folder, working end to end on the local Docker Desktop cluster.

**Architecture:** Plain Kustomize YAML — one `base` plus `local` and `prod` overlays. A single Ingress serves both apps on one host (`/api` → backend, `/` → frontend), so the frontend image is built with an empty `NEXT_PUBLIC_API_URL` and issues relative requests. Prisma migrations run as an initContainer on the backend Deployment. Secrets come from `secretGenerator` locally and SealedSecrets in prod.

**Tech Stack:** Kubernetes 1.36 (Docker Desktop, containerd 2.3.1), Kustomize 5.8.1 (embedded in `kubectl`), Docker, ingress-nginx `controller-v1.15.1`, sealed-secrets `v0.39.1`, Node 20, Prisma 6.19.2, Next.js 16.1.1, PostgreSQL 14.

**Spec:** [`docs/superpowers/specs/2026-08-21-kubernetes-infra-design.md`](../specs/2026-08-21-kubernetes-infra-design.md)

## Global Constraints

- **Namespace:** `transit-tracker` for every workload.
- **Local image names:** `transit-tracker/backend:dev`, `transit-tracker/frontend:dev`.
- **Prod image names:** `ghcr.io/vroam10/transit-tracker-backend`, `ghcr.io/vroam10/transit-tracker-frontend` — lowercase, hyphenated. Never derive these from the repo name `Transit-Track_er`; GHCR rejects uppercase.
- **Container port:** 3000 for backend and frontend alike. Postgres 5432.
- **Node base image:** `node:20-bullseye-slim` for both Dockerfiles. `next@16.1.1` declares `engines.node >= 20.9.0`; do not drop below Node 20.
- **Postgres image:** `postgres:14`, matching `compose.yml`.
- **Pinned addon versions**, declared as variables at the top of the install script:
  - ingress-nginx: `controller-v1.15.1` → `https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.15.1/deploy/static/provider/cloud/deploy.yaml`
  - sealed-secrets: `v0.39.1` → `https://github.com/bitnami/sealed-secrets/releases/download/v0.39.1/controller.yaml` (note the org is **`bitnami`**, not `bitnami-labs`)
- **Local hostname:** `transit.localtest.me` (resolves to 127.0.0.1 publicly; no hosts-file edit).
- **The node container** for local image loading is `desktop-control-plane`. It is reachable via `docker exec` but does **not** appear in `docker ps`, so never discover it by listing containers.
- **Secret names** are identical in both overlays: `backend-secrets`, `postgres-secrets`, `firebase-sa`.
- **Never commit** a real `JWT_SECRET`, `CONNECTOR_SECRET_KEY`, or `serviceAccountKey.json`.
- **Windows line endings:** every generated `.env` consumed by Kustomize must be piped through `tr -d '\r'`. Kustomize includes a trailing `\r` in the value otherwise, producing secrets that fail at runtime in ways that are painful to debug.
- **Scripts** are POSIX `sh`/`bash` run under Git Bash, start with `set -euo pipefail`, and resolve paths relative to their own location, not the caller's CWD.

### Deviation from the spec (deliberate)

The spec specifies `imagePullPolicy: Never` in the `local` overlay to make a missed image load fail loudly. This plan instead keeps `IfNotPresent` everywhere and puts a **preflight check in `deploy-local.sh`** that verifies both images exist in the node's containerd before applying. Same protection, caught earlier with a clearer message, and it removes three patch files whose only purpose was setting one field per container. Task 6 updates the spec to match.

---

## File Structure

**Created outside `infra/`:**
- `backend/.dockerignore` — shrink the build context, keep `.env` and the Firebase key out of the builder layer.
- `frontend/Dockerfile` — multi-stage Next.js standalone build.
- `frontend/.dockerignore` — same purpose as the backend's.
- `.github/workflows/build-images.yml` — build and push both images to GHCR.

**Modified outside `infra/`:**
- `backend/Dockerfile` — copy `prisma/` into the runner stage; `npm ci`.
- `frontend/next.config.ts` — `output: "standalone"`.
- `.gitignore` — ignore the two generated local-overlay secret files.
- `docs/superpowers/specs/2026-08-21-kubernetes-infra-design.md` — record the pull-policy deviation and the observed ingress reachability answer.

**Created inside `infra/`:**

| File | Responsibility |
|---|---|
| `k8s/base/namespace.yaml` | the `transit-tracker` Namespace |
| `k8s/base/config.yaml` | ConfigMap `app-config`: all non-secret env |
| `k8s/base/secrets.example.yaml` | documents required secret keys; never applied |
| `k8s/base/postgres/{statefulset,service}.yaml` | database + headless Service |
| `k8s/base/backend/{deployment,service}.yaml` | API + migrate initContainer |
| `k8s/base/worker/deployment.yaml` | the singleton scheduler |
| `k8s/base/frontend/{deployment,service}.yaml` | Next.js back-office |
| `k8s/base/ingress.yaml` | the two host rules |
| `k8s/base/kustomization.yaml` | assembles the above |
| `k8s/overlays/local/kustomization.yaml` | dev tags, generated secrets, 1 replica |
| `k8s/overlays/prod/kustomization.yaml` | GHCR images, 2 replicas, TLS |
| `k8s/overlays/prod/patches/*.yaml` | host/TLS, CORS origin, resources |
| `k8s/overlays/prod/sealed/kustomization.yaml` | empty until secrets are sealed |
| `scripts/test-migrations.sh` | apply migrations against a throwaway Postgres — proves the image can migrate, and is the standing check after any Prisma change (an addition to the spec's script list) |
| `scripts/build-images.sh` | build both images and load them into containerd |
| `scripts/install-cluster-addons.sh` | ingress-nginx, optionally sealed-secrets |
| `scripts/deploy-local.sh` | sync secrets, preflight, apply, wait |
| `scripts/seal-secrets.sh` | produce committed SealedSecrets for prod |
| `README.md` | quickstart and runbook |

---

## Task 1: Backend image can run Prisma migrations

The runner stage currently copies only `node_modules`, `dist` and `package*.json`. Without `prisma/` there is no schema and no migrations directory, so the migrate initContainer cannot work. This task proves that failure first, then fixes it.

**Files:**
- Modify: `backend/Dockerfile`
- Create: `backend/.dockerignore`

**Interfaces:**
- Consumes: nothing.
- Produces: image `transit-tracker/backend:dev`, whose working directory is `/usr/src/app`, containing `./node_modules/.bin/prisma` and `./prisma/{schema.prisma,migrations/}`. Task 4's initContainer runs `./node_modules/.bin/prisma migrate deploy` inside it.

- [ ] **Step 1: Write the failing test**

Create the throwaway-Postgres migration check at `infra/scripts/test-migrations.sh`. It is a real deliverable, not scaffolding — Task 8's README references it as the way to check migrations after a Prisma change.

```bash
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
```

- [ ] **Step 2: Run it and watch it fail**

```bash
docker build -t transit-tracker/backend:dev ./backend
bash infra/scripts/test-migrations.sh
```

Expected: FAIL. Prisma reports it cannot find a schema — there is no `prisma/schema.prisma` in the image. That is the bug this task exists to fix.

- [ ] **Step 3: Create `backend/.dockerignore`**

```
node_modules
dist
.env
.env.*
serviceAccountKey.json
trace.log
*.log
*.png
tests
.git
```

- [ ] **Step 4: Fix `backend/Dockerfile`**

Change `RUN npm install` to `RUN npm ci`, and add the `prisma` copy to the runner stage. The runner stage becomes:

```dockerfile
FROM node:20.19.4-bullseye-slim AS runner

WORKDIR /usr/src/app
USER node
ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package*.json ./

EXPOSE 3000

CMD ["npm", "start"]
```

`prisma` is a production dependency, so it survives `npm prune --omit=dev` and its query engines travel inside the copied `node_modules`. No extra install step is needed.

- [ ] **Step 5: Rebuild and run the test to verify it passes**

```bash
docker build -t transit-tracker/backend:dev ./backend
bash infra/scripts/test-migrations.sh
```

Expected: PASS. Prisma reports 13 migrations applied, ending with `20260820091541_add_connector_resource`.

- [ ] **Step 6: Verify the build context actually shrank**

```bash
docker build --no-cache --progress=plain -t transit-tracker/backend:dev ./backend 2>&1 | grep -i "transferring context"
```

Expected: a few hundred KB, not the hundreds of MB that `node_modules` would add. If it is still large, `.dockerignore` is not being picked up — check it sits in `backend/`, beside the Dockerfile.

- [ ] **Step 7: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore infra/scripts/test-migrations.sh
git commit -m "fix(backend): ship prisma/ in the runtime image so migrate deploy works"
```

---

## Task 2: Frontend image

No frontend image exists. It must be self-contained and portable across environments, which means baking an empty `NEXT_PUBLIC_API_URL` so requests are relative.

**Files:**
- Modify: `frontend/next.config.ts`
- Create: `frontend/Dockerfile`, `frontend/.dockerignore`

**Interfaces:**
- Consumes: nothing.
- Produces: image `transit-tracker/frontend:dev`, listening on port 3000, serving `/` with HTTP 200. Task 4's frontend Deployment probes `GET /`.

- [ ] **Step 1: Write the failing test**

Two things must hold: the container serves traffic, and the bundle contains **relative** API paths. The second is the subtle one — an unset `NEXT_PUBLIC_API_URL` compiles the literal string `undefined` into the bundle, producing requests to `undefined/api/...`.

```bash
docker build -t transit-tracker/frontend:dev ./frontend
docker run -d --name ttk-fe-test -p 3100:3000 transit-tracker/frontend:dev
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/       # expect 200
docker run --rm transit-tracker/frontend:dev \
  sh -c 'grep -rl "undefined/api/" .next/ 2>/dev/null | head' # expect NO output
docker rm -f ttk-fe-test
```

- [ ] **Step 2: Run it and watch it fail**

Expected: FAIL at the first line — `./frontend/Dockerfile` does not exist.

- [ ] **Step 3: Add standalone output to `frontend/next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 4: Create `frontend/.dockerignore`**

```
node_modules
.next
.env
.env.*
tsconfig.tsbuildinfo
*.log
.git
```

- [ ] **Step 5: Create `frontend/Dockerfile`**

```dockerfile
FROM node:20-bullseye-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Empty on purpose: it makes every call site emit a relative /api/... path, so one
# image is valid in every environment. Leaving it unset would inline the literal
# string "undefined" and produce requests to undefined/api/...
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:20-bullseye-slim AS runner

WORKDIR /usr/src/app
USER node
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Without this the standalone server can bind loopback only, and probes fail.
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

- [ ] **Step 6: Run the test to verify it passes**

Re-run Step 1. Expected: build succeeds, `curl` returns `200`, and the `grep` for `undefined/api/` prints nothing.

- [ ] **Step 7: Confirm relative paths are genuinely present**

```bash
docker run --rm transit-tracker/frontend:dev \
  sh -c 'grep -rho "/api/users/login" .next/ | head -1'
```

Expected: `/api/users/login`. This proves the empty-string build produced a usable relative path rather than silently dropping the prefix.

- [ ] **Step 8: Commit**

```bash
git add frontend/Dockerfile frontend/.dockerignore frontend/next.config.ts
git commit -m "feat(frontend): add standalone Docker image with relative API paths"
```

---

## Task 3: Cluster addons, and settle how the Ingress is reachable

The cluster has no ingress controller. This task installs one and answers the open question in the spec: whether a `LoadBalancer` Service is reachable from Windows on this kind-style Docker Desktop cluster. **Observe the answer; do not assume it.**

**Files:**
- Create: `infra/scripts/install-cluster-addons.sh`, `infra/k8s/bootstrap/README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `nginx` IngressClass in the cluster, and a documented answer for how host traffic reaches it. Task 5 relies on `http://transit.localtest.me/` reaching the controller.

- [ ] **Step 1: Write the failing test**

```bash
kubectl get ingressclass nginx
curl -s -o /dev/null -w "%{http_code}\n" http://transit.localtest.me/
```

Expected: FAIL — `ingressclasses.networking.k8s.io "nginx" not found`, and curl fails to connect.

- [ ] **Step 2: Create `infra/scripts/install-cluster-addons.sh`**

```bash
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
```

- [ ] **Step 3: Run it**

```bash
bash infra/scripts/install-cluster-addons.sh
```

Expected: the controller pod reaches Ready and `kubectl get ingressclass` lists `nginx`.

- [ ] **Step 4: Determine how host traffic reaches the controller — measure, don't guess**

```bash
kubectl -n ingress-nginx get svc ingress-nginx-controller
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/
```

Interpret:
- `EXTERNAL-IP` becomes `localhost`/an IP **and** curl returns `404` — the controller is reachable and answering (404 is correct: no Ingress matches yet). Nothing more to do.
- `EXTERNAL-IP` stays `<pending>` or curl cannot connect — fall back, in this order:
  1. Patch the controller to use host ports:
     ```bash
     kubectl -n ingress-nginx patch deployment ingress-nginx-controller --type=json -p '[
       {"op":"add","path":"/spec/template/spec/containers/0/ports/0/hostPort","value":80},
       {"op":"add","path":"/spec/template/spec/containers/0/ports/1/hostPort","value":443}
     ]'
     kubectl -n ingress-nginx rollout status deployment ingress-nginx-controller
     ```
  2. If that still fails, use a port-forward and document it as the local access path:
     ```bash
     kubectl -n ingress-nginx port-forward svc/ingress-nginx-controller 8080:80
     ```
     With this fallback the local URL becomes `http://transit.localtest.me:8080`, and every later task's curl must use that port.

Whichever path works, append it to `infra/k8s/bootstrap/README.md` in Step 5 and carry it into Task 8's README. Do not leave two possibilities documented as equally true — record what was observed.

- [ ] **Step 5: Write `infra/k8s/bootstrap/README.md`**

Document: which addons are installed and at which pinned versions; that ingress-nginx uses the `provider/cloud` manifest because it requests a LoadBalancer Service; that sealed-secrets is only needed for the prod path; and — filled in from Step 4 — exactly how host traffic reaches the controller on this machine, including the port to use.

- [ ] **Step 6: Re-run the test from Step 1**

```bash
kubectl get ingressclass nginx
curl -s -o /dev/null -w "%{http_code}\n" http://transit.localtest.me/
```

Expected: the IngressClass exists, and curl returns `404` from nginx. 404 is success here — traffic reaches the controller and no Ingress rule matches yet.

- [ ] **Step 7: Commit**

```bash
git add infra/scripts/install-cluster-addons.sh infra/k8s/bootstrap/README.md
git commit -m "feat(infra): add pinned cluster addon installer"
```

---

## Task 4: Kustomize base

Every manifest, with no environment-specific values. The base does not include secrets, so it cannot run on its own — it is validated by rendering and by server-side dry-run.

**Files:**
- Create: `infra/k8s/base/namespace.yaml`, `config.yaml`, `secrets.example.yaml`, `postgres/statefulset.yaml`, `postgres/service.yaml`, `backend/deployment.yaml`, `backend/service.yaml`, `worker/deployment.yaml`, `frontend/deployment.yaml`, `frontend/service.yaml`, `ingress.yaml`, `kustomization.yaml`

**Interfaces:**
- Consumes: images from Tasks 1-2; the `nginx` IngressClass from Task 3.
- Produces: Deployments named `backend`, `worker`, `frontend`; StatefulSet `postgres`; Services `backend`, `frontend`, `postgres`; ConfigMap `app-config`; Ingress `transit-tracker`. Consumes Secrets named `backend-secrets`, `postgres-secrets`, `firebase-sa`, which Task 5 and Task 6 supply. Container names — `backend`, `migrate` (init), `worker`, `frontend`, `postgres` — are the patch targets for later tasks.

- [ ] **Step 1: Write the failing test**

```bash
kubectl kustomize infra/k8s/base
```

Expected: FAIL — no such directory.

- [ ] **Step 2: Create the Namespace and ConfigMap**

`infra/k8s/base/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: transit-tracker
```

`infra/k8s/base/config.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  PORT: "3000"
  # In-cluster Service DNS. The worker calls the backend through this.
  URL_SERVER: "http://backend:3000"
  # firebase-admin resolves this as a filesystem path, so firebase-sa is mounted, not env-injected.
  GOOGLE_APPLICATION_CREDENTIALS: "/run/secrets/firebase/serviceAccountKey.json"
  # Browser traffic is same-origin through the Ingress, so this matters only for
  # non-browser clients such as the Flutter app. Overlays patch it per environment.
  CORS_ORIGIN: "http://transit.localtest.me"
```

- [ ] **Step 3: Create `infra/k8s/base/secrets.example.yaml`**

This documents the required keys. It is deliberately **not** listed in `kustomization.yaml`, so `kubectl apply -k` can never apply placeholder credentials.

```yaml
# DOCUMENTATION ONLY — not referenced by kustomization.yaml, never applied.
# Local secrets come from the local overlay's secretGenerator.
# Prod secrets come from SealedSecrets in overlays/prod/sealed/.
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgres://transit:transit@postgres:5432/transit"
  JWT_SECRET: "replace-me"
  JWT_EXPIRES_IN: "7d"
  CONNECTOR_SECRET_KEY: "replace-me"
---
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secrets
type: Opaque
stringData:
  POSTGRES_USER: "transit"
  POSTGRES_PASSWORD: "replace-me"
  POSTGRES_DB: "transit"
---
apiVersion: v1
kind: Secret
metadata:
  name: firebase-sa
type: Opaque
stringData:
  # Mounted as a file at /run/secrets/firebase/serviceAccountKey.json
  serviceAccountKey.json: "{}"
```

- [ ] **Step 4: Create the Postgres StatefulSet and Service**

`infra/k8s/base/postgres/statefulset.yaml`:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:14
          ports:
            - name: postgres
              containerPort: 5432
          envFrom:
            - secretRef:
                name: postgres-secrets
          env:
            # A subdirectory, not the mount root: the volume root can contain
            # lost+found, which Postgres refuses to initialise into.
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          readinessProbe:
            exec:
              command:
                ["sh", "-c", 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"']
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            exec:
              command:
                ["sh", "-c", 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"']
            initialDelaySeconds: 30
            periodSeconds: 15
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 1Gi
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        # storageClassName is intentionally omitted so the cluster default
        # (`standard`, rancher.io/local-path) is used. The prod overlay names one.
        resources:
          requests:
            storage: 2Gi
```

The probes use `sh -c` because `exec` commands do not expand environment variables on their own.

`infra/k8s/base/postgres/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  # Headless, the conventional pairing for a StatefulSet's serviceName.
  clusterIP: None
  selector:
    app: postgres
  ports:
    - name: postgres
      port: 5432
      targetPort: 5432
```

- [ ] **Step 5: Create the backend Deployment and Service**

`infra/k8s/base/backend/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      initContainers:
        # Applies pending Prisma migrations before the app starts. Idempotent, and
        # safe with several replicas because Prisma takes a database advisory lock.
        # If Postgres is not up yet this exits non-zero and the kubelet retries it.
        - name: migrate
          image: transit-tracker/backend:dev
          imagePullPolicy: IfNotPresent
          command: ["./node_modules/.bin/prisma", "migrate", "deploy"]
          envFrom:
            - secretRef:
                name: backend-secrets
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
      containers:
        - name: backend
          image: transit-tracker/backend:dev
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 3000
          envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: backend-secrets
          volumeMounts:
            - name: firebase-sa
              mountPath: /run/secrets/firebase
              readOnly: true
          readinessProbe:
            httpGet:
              path: /api/health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /api/health
              port: http
            initialDelaySeconds: 20
            periodSeconds: 15
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
      volumes:
        - name: firebase-sa
          secret:
            secretName: firebase-sa
```

`infra/k8s/base/backend/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend
  ports:
    - name: http
      port: 3000
      targetPort: http
```

- [ ] **Step 6: Create the worker Deployment**

`infra/k8s/base/worker/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
spec:
  # DO NOT SCALE THIS. src/worker/scheduler.ts polls every 60s, evaluates every
  # saved timetable's cron expression and sends push notifications. It holds no
  # lease and does not deduplicate, so a second copy sends every notification
  # twice. Recreate matters as much as replicas: 1 — the default RollingUpdate
  # briefly runs the old and new pods together, which is exactly that overlap.
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
        - name: worker
          image: transit-tracker/backend:dev
          imagePullPolicy: IfNotPresent
          command: ["node", "dist/worker/scheduler.js"]
          envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: backend-secrets
          volumeMounts:
            - name: firebase-sa
              mountPath: /run/secrets/firebase
              readOnly: true
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              cpu: 300m
              memory: 384Mi
      volumes:
        - name: firebase-sa
          secret:
            secretName: firebase-sa
```

No probes: the worker exposes no HTTP server, so there is nothing to probe.

- [ ] **Step 7: Create the frontend Deployment and Service**

`infra/k8s/base/frontend/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: transit-tracker/frontend:dev
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 3000
          readinessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 20
            periodSeconds: 15
          resources:
            requests:
              cpu: 100m
              memory: 192Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

The frontend needs no env: its API URL was baked in as a relative path at build time.

`infra/k8s/base/frontend/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  selector:
    app: frontend
  ports:
    - name: http
      port: 3000
      targetPort: http
```

- [ ] **Step 8: Create the Ingress**

`infra/k8s/base/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: transit-tracker
spec:
  ingressClassName: nginx
  rules:
    - host: transit.localtest.me
      http:
        paths:
          # /api wins over / by longest-prefix match. No rewriting: the backend
          # already mounts every route under /api.
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 3000
```

- [ ] **Step 9: Create `infra/k8s/base/kustomization.yaml`**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: transit-tracker

resources:
  - namespace.yaml
  - config.yaml
  - postgres/service.yaml
  - postgres/statefulset.yaml
  - backend/service.yaml
  - backend/deployment.yaml
  - worker/deployment.yaml
  - frontend/service.yaml
  - frontend/deployment.yaml
  - ingress.yaml
# secrets.example.yaml is deliberately absent — documentation only.

labels:
  - includeSelectors: false
    pairs:
      app.kubernetes.io/part-of: transit-tracker
```

`includeSelectors: false` matters: letting Kustomize inject labels into selectors would make the label part of each Deployment's immutable `selector`, so later label changes would break updates.

- [ ] **Step 10: Run the render test**

```bash
kubectl kustomize infra/k8s/base
```

Expected: PASS — valid YAML for all 10 resources, every one carrying `namespace: transit-tracker`.

- [ ] **Step 11: Validate against the real API server**

```bash
kubectl apply --dry-run=server -k infra/k8s/base
```

Expected: every object reports `(server dry run)`. This catches schema errors that rendering alone cannot. Nothing is persisted.

- [ ] **Step 12: Commit**

```bash
git add infra/k8s/base
git commit -m "feat(infra): add Kustomize base for backend, worker, frontend and postgres"
```

---

## Task 5: Local overlay and deploy scripts — the working local deployment

The milestone task: after this, the stack runs on the local cluster.

**Files:**
- Create: `infra/k8s/overlays/local/kustomization.yaml`, `infra/scripts/build-images.sh`, `infra/scripts/deploy-local.sh`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: images from Tasks 1-2, the ingress from Task 3, the base from Task 4.
- Produces: a running deployment in namespace `transit-tracker`, reachable at `http://transit.localtest.me` (or the port Task 3 settled on).

- [ ] **Step 1: Write the failing test**

```bash
curl -s http://transit.localtest.me/api/health
```

Expected: FAIL — nginx returns 404, nothing is deployed yet.

- [ ] **Step 2: Add the generated secret files to `.gitignore`**

Append at the end of the root `.gitignore`:

```
# Generated local k8s secrets — never commit
infra/k8s/overlays/local/.env
infra/k8s/overlays/local/serviceAccountKey.json
```

- [ ] **Step 3: Create `infra/scripts/build-images.sh`**

```bash
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
```

- [ ] **Step 4: Create `infra/k8s/overlays/local/kustomization.yaml`**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: transit-tracker

resources:
  - ../../base

images:
  - name: transit-tracker/backend
    newTag: dev
  - name: transit-tracker/frontend
    newTag: dev

# One replica each locally. The worker is already 1 in the base and must stay there.
replicas:
  - name: backend
    count: 1
  - name: frontend
    count: 1

secretGenerator:
  # Written by deploy-local.sh from backend/.env, with DATABASE_URL rewritten
  # for in-cluster DNS. Gitignored.
  - name: backend-secrets
    envs:
      - .env
  # Local-only dev credentials, identical to compose.yml. Committed knowingly.
  - name: postgres-secrets
    literals:
      - POSTGRES_USER=transit
      - POSTGRES_PASSWORD=transit
      - POSTGRES_DB=transit
  # Copied by deploy-local.sh from backend/serviceAccountKey.json. Gitignored.
  - name: firebase-sa
    files:
      - serviceAccountKey.json
```

Kustomize appends a content hash to each generated Secret's name and rewrites every reference, so editing a secret rolls the pods automatically.

- [ ] **Step 5: Create `infra/scripts/deploy-local.sh`**

```bash
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
# itself. tr -d '\r' is required — a trailing CR ends up inside the secret value.
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
```

The preflight check is what makes a forgotten `build-images.sh` fail immediately with an actionable message, instead of surfacing later as a Docker Hub authentication error for a repository that does not exist.

- [ ] **Step 6: Render the overlay before deploying anything**

```bash
bash infra/scripts/deploy-local.sh 2>/dev/null || true   # generates the secret files
kubectl kustomize infra/k8s/overlays/local | head -40
```

Expected: renders with hash-suffixed Secret names such as `backend-secrets-<hash>`, and `replicas: 1` on backend and frontend.

- [ ] **Step 7: Build, load and deploy**

```bash
bash infra/scripts/build-images.sh
bash infra/scripts/deploy-local.sh
```

Expected: all four rollouts report success.

- [ ] **Step 8: Verify the migrate initContainer actually ran**

```bash
kubectl -n transit-tracker logs deployment/backend -c migrate
```

Expected: Prisma reports the migrations applied (or "No pending migrations" on a re-deploy). This is the in-cluster confirmation of Task 1's fix.

- [ ] **Step 9: Run the end-to-end test**

```bash
curl -s http://transit.localtest.me/api/health          # expect: OK
curl -s -o /dev/null -w "%{http_code}\n" http://transit.localtest.me/   # expect: 200
```

Use the port Task 3 settled on if it was not 80. Both must pass: the first proves the `/api` rule reaches the backend, the second that `/` reaches the frontend.

- [ ] **Step 10: Verify secrets are not tracked**

```bash
git status --porcelain infra/k8s/overlays/local/
```

Expected: no output. `.env` and `serviceAccountKey.json` exist on disk but are ignored.

- [ ] **Step 11: Commit**

```bash
git add infra/k8s/overlays/local/kustomization.yaml infra/scripts/build-images.sh infra/scripts/deploy-local.sh .gitignore
git commit -m "feat(infra): add local overlay with build and deploy scripts"
```

---

## Task 6: Prod overlay and secret sealing

A reviewed, rendering skeleton. It cannot be fully verified without a production cluster, and sealed values are cluster-bound — that limit is documented, not papered over.

**Files:**
- Create: `infra/k8s/overlays/prod/kustomization.yaml`, `infra/k8s/overlays/prod/patches/ingress.yaml`, `patches/config.yaml`, `infra/k8s/overlays/prod/sealed/kustomization.yaml`, `infra/k8s/overlays/prod/sealed/README.md`, `infra/scripts/seal-secrets.sh`
- Modify: `docs/superpowers/specs/2026-08-21-kubernetes-infra-design.md`

**Interfaces:**
- Consumes: the base from Task 4.
- Produces: a `prod` overlay that renders, and a script producing SealedSecrets named `backend-secrets`, `postgres-secrets`, `firebase-sa` in namespace `transit-tracker`.

- [ ] **Step 1: Write the failing test**

```bash
kubectl kustomize infra/k8s/overlays/prod
```

Expected: FAIL — no such directory.

- [ ] **Step 2: Create the prod patches**

`infra/k8s/overlays/prod/patches/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: transit-tracker
  annotations:
    # Uncomment once cert-manager is installed and a ClusterIssuer exists.
    # cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - transit.example.com
      secretName: transit-tls
  rules:
    - host: transit.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 3000
```

`transit.example.com` is a placeholder — there is no production domain yet. Replacing it means editing this file and `patches/config.yaml` together, because `CORS_ORIGIN` must match.

The `rules` block is repeated in full rather than patched piecemeal: a strategic-merge patch on a list keyed by `host` replaces the whole entry anyway, so spelling it out is what actually happens.

`infra/k8s/overlays/prod/patches/config.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  CORS_ORIGIN: "https://transit.example.com"
```

- [ ] **Step 3: Create `infra/k8s/overlays/prod/sealed/kustomization.yaml`**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Populated by infra/scripts/seal-secrets.sh, then committed.
# Empty until then, so this overlay renders but will not run.
resources: []
```

- [ ] **Step 4: Create `infra/k8s/overlays/prod/sealed/README.md`**

State plainly: these files are encrypted with one specific cluster's controller key, so they cannot be generated ahead of time or reused across clusters; run `infra/scripts/seal-secrets.sh`, add the generated filenames to `resources:` in this directory's `kustomization.yaml`, and commit both. Until that happens the prod overlay renders but the pods will not start, because the Secrets it references do not exist.

- [ ] **Step 5: Create `infra/k8s/overlays/prod/kustomization.yaml`**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: transit-tracker

resources:
  - ../../base
  - sealed

images:
  - name: transit-tracker/backend
    newName: ghcr.io/vroam10/transit-tracker-backend
    newTag: main
  - name: transit-tracker/frontend
    newName: ghcr.io/vroam10/transit-tracker-frontend
    newTag: main

replicas:
  - name: backend
    count: 2
  - name: frontend
    count: 2

patches:
  - path: patches/ingress.yaml
  - path: patches/config.yaml
```

- [ ] **Step 6: Create `infra/scripts/seal-secrets.sh`**

```bash
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

Then commit. These files are safe to commit — only the cluster's controller can decrypt them.
EOF
```

- [ ] **Step 7: Verify the controller name before trusting the default**

`CONTROLLER_NAME` defaults to `sealed-secrets-controller`, which is what the upstream `controller.yaml` installs. Confirm rather than assume, on any cluster where the controller is installed:

```bash
kubectl -n kube-system get deployments -l app.kubernetes.io/name=sealed-secrets
```

If the name differs, correct the default in the script.

- [ ] **Step 8: Run the render test**

```bash
kubectl kustomize infra/k8s/overlays/prod
```

Expected: PASS. Images point at `ghcr.io/vroam10/...`, backend and frontend show `replicas: 2`, worker stays at 1, the Ingress carries `transit.example.com` with a `tls` block, and `CORS_ORIGIN` is the https origin. No Secret objects appear — expected, since `sealed/` is still empty.

- [ ] **Step 9: Verify the script fails cleanly without kubeseal**

```bash
bash infra/scripts/seal-secrets.sh
```

Expected: exits 1 with the install instructions. `kubeseal` is not installed on this machine, so a clear failure is the correct behaviour — not a stack trace.

- [ ] **Step 10: Update the spec for the pull-policy deviation**

In `docs/superpowers/specs/2026-08-21-kubernetes-infra-design.md`, replace the bullet stating the local overlay sets `imagePullPolicy: Never` with the approach actually built: `IfNotPresent` everywhere, plus a preflight check in `deploy-local.sh` that verifies both images are present in the node's containerd before applying. Also replace the open "Host reachability of the Ingress is unverified" risk with what Task 3 observed.

- [ ] **Step 11: Commit**

```bash
git add infra/k8s/overlays/prod infra/scripts/seal-secrets.sh docs/superpowers/specs/2026-08-21-kubernetes-infra-design.md
git commit -m "feat(infra): add prod overlay and sealed-secrets tooling"
```

---

## Task 7: CI builds and pushes images to GHCR

**Files:**
- Create: `.github/workflows/build-images.yml`

**Interfaces:**
- Consumes: the Dockerfiles from Tasks 1-2.
- Produces: `ghcr.io/vroam10/transit-tracker-backend` and `-frontend`, tagged with the branch name and short SHA — the images the prod overlay references.

- [ ] **Step 1: Write the failing test**

There is no local GitHub Actions runner, so the check is that the workflow is valid YAML with the required keys:

```bash
node -e "const y=require('fs').readFileSync('.github/workflows/build-images.yml','utf8'); if(!/packages: write/.test(y)) throw new Error('missing packages: write'); console.log('ok')"
```

Expected: FAIL — the file does not exist.

- [ ] **Step 2: Create `.github/workflows/build-images.yml`**

```yaml
name: Build Images

on:
  push:
    branches: [main, dev]
    paths:
      - "backend/**"
      - "frontend/**"
      - ".github/workflows/build-images.yml"
  workflow_dispatch:

permissions:
  contents: read
  packages: write

jobs:
  build:
    name: Build ${{ matrix.name }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        include:
          - name: backend
            context: ./backend
          - name: frontend
            context: ./frontend

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Derive tags
        id: meta
        uses: docker/metadata-action@v5
        with:
          # Hardcoded lowercase: GHCR rejects uppercase, and the owner is "VRoam10".
          images: ghcr.io/vroam10/transit-tracker-${{ matrix.name }}
          tags: |
            type=ref,event=branch
            type=sha,format=short

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: ${{ matrix.context }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

The existing `build-release.yml` (Flutter APK) is untouched — its paths filter is `transit_track_er_mobile/**`, so the two never collide.

- [ ] **Step 3: Run the test to verify it passes**

```bash
node -e "const y=require('fs').readFileSync('.github/workflows/build-images.yml','utf8'); if(!/packages: write/.test(y)) throw new Error('missing packages: write'); console.log('ok')"
```

Expected: `ok`.

- [ ] **Step 4: Verify the frontend image builds from a clean context**

CI builds without a local `node_modules`, so prove that path works:

```bash
git stash list >/dev/null
docker build --no-cache -t ttk-ci-check ./frontend && docker rmi ttk-ci-check
```

Expected: succeeds. A failure here means the Dockerfile depends on something `.dockerignore` excludes.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/build-images.yml
git commit -m "ci: build and push backend and frontend images to GHCR"
```

- [ ] **Step 6: Note what remains unverified**

The workflow cannot be proven from here. State in the handoff that it runs for real only once pushed, and that the first run may need GHCR package visibility set for the org. Do not report this task as verified end to end.

---

## Task 8: `infra/README.md` and a clean-slate rerun

The runbook, plus the strongest available check: tear the namespace down and bring it back from nothing.

**Files:**
- Create: `infra/README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: documentation, and evidence the whole flow is reproducible.

- [ ] **Step 1: Write the failing test**

Reproducibility from scratch:

```bash
kubectl delete namespace transit-tracker --wait=true
bash infra/scripts/deploy-local.sh
curl -s http://transit.localtest.me/api/health
```

Deleting the namespace also deletes the PVC, so Postgres starts empty and the migrate initContainer must apply all 13 migrations to a fresh database. Expected before the README exists: this should already pass from Task 5 — run it to confirm nothing has drifted.

- [ ] **Step 2: Write `infra/README.md`**

Cover, in this order:

1. **Layout** — a short tree of `infra/` with one line per directory.
2. **Prerequisites** — Docker Desktop with Kubernetes enabled, `kubectl`; `kubeseal` only for prod.
3. **Quickstart**, exactly these four commands:
   ```bash
   bash infra/scripts/install-cluster-addons.sh
   bash infra/scripts/build-images.sh
   bash infra/scripts/deploy-local.sh
   curl http://transit.localtest.me/api/health
   ```
   Use the port Task 3 actually settled on.
4. **How it fits together** — one Ingress host, `/api` to the backend and `/` to the frontend; the frontend is built with an empty `NEXT_PUBLIC_API_URL` so its requests are relative; the worker is pinned to one replica with `Recreate` and why.
5. **Why images must be loaded** — the cluster runs containerd, so `docker build` output is invisible to the kubelet; `build-images.sh` imports via `ctr`.
6. **Secrets** — local secrets are generated from `backend/.env` with `DATABASE_URL` rewritten for in-cluster DNS; prod uses SealedSecrets, and those cannot be generated ahead of time.
7. **Prod checklist** — replace `transit.example.com` in `patches/ingress.yaml` *and* `CORS_ORIGIN` in `patches/config.yaml`; install the sealed-secrets controller; run `seal-secrets.sh`; list the generated files in `sealed/kustomization.yaml`; set the image tags.
8. **Pointing at a managed Postgres** — set `DATABASE_URL` in the sealed secret to the external host and remove `postgres/statefulset.yaml` and `postgres/service.yaml` from the prod overlay via a `patches` deletion or a dedicated component.
9. **Troubleshooting** — at minimum: `ErrImagePull`/`ImagePullBackOff` means the load step was skipped, run `build-images.sh`; a PVC stuck in `Pending` is normal until the Postgres pod schedules, because both StorageClasses are `WaitForFirstConsumer`; `kubectl -n transit-tracker logs deployment/backend -c migrate` for migration failures; a mobile app that cannot connect needs `environment.dart` pointed at the Ingress host.
10. **Relationship to `compose.yml`** — still valid for single-host runs; unchanged by this work.

- [ ] **Step 3: Follow your own quickstart literally**

Delete the namespace again and run only the commands the README lists, copy-pasted, in order. Any missing step, wrong path or wrong port is a README bug — fix it now, while it is cheap.

- [ ] **Step 4: Verify both routes one final time**

```bash
curl -s http://transit.localtest.me/api/health
curl -s -o /dev/null -w "%{http_code}\n" http://transit.localtest.me/
kubectl -n transit-tracker get pods
```

Expected: `OK`, `200`, and every pod `Running` with the worker at exactly one replica.

- [ ] **Step 5: Confirm no secrets are staged**

```bash
git status --porcelain
git ls-files | grep -E 'serviceAccountKey|overlays/local/\.env' || echo "clean"
```

Expected: `clean`.

- [ ] **Step 6: Commit**

```bash
git add infra/README.md
git commit -m "docs(infra): add Kubernetes runbook"
```

---

## Verification Summary

| Claim | How it is proven | Task |
|---|---|---|
| Backend image can run migrations | migrate against a throwaway `postgres:14` | 1 |
| Frontend emits relative API paths | grep the built bundle for `undefined/api/` | 2 |
| Ingress reachable from Windows | observed, with documented fallbacks | 3 |
| Manifests are schema-valid | `kubectl apply --dry-run=server -k` | 4 |
| Stack runs locally | rollouts succeed; both routes curl clean | 5 |
| Prod overlay is coherent | renders with correct images, hosts, replicas | 6 |
| CI workflow is well-formed | YAML/key check + clean-context build | 7 |
| The whole flow is reproducible | namespace deleted, rebuilt from nothing | 8 |

**Known to remain unverified:** the CI workflow (needs a push), and the prod overlay end to end (needs a prod cluster, and sealed secrets are cluster-bound). Report both as such rather than implying they work.
