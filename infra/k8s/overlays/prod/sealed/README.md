# Sealed secrets for the `prod` overlay

The files here are **encrypted** SealedSecrets and are safe to commit — only the target
cluster's sealed-secrets controller holds the key to decrypt them.

## Why this directory starts empty

Sealed values are encrypted with **one specific cluster's controller key**. They cannot be
generated ahead of time, cannot be written by someone without access to that cluster, and
cannot be reused across clusters. So this directory ships with an empty `kustomization.yaml`.

Until it is populated, the `prod` overlay **renders but will not run**: the workloads reference
Secrets named `backend-secrets`, `postgres-secrets` and `firebase-sa`, and nothing creates them.
Pods will sit in `CreateContainerConfigError`.

## Populating it

1. Point `kubectl` at the cluster you intend to deploy to.
2. Install the controller:
   ```bash
   bash infra/scripts/install-cluster-addons.sh --with-sealed-secrets
   ```
3. Install the `kubeseal` CLI (`winget install Bitnami.SealedSecrets`, or a release binary from
   <https://github.com/bitnami/sealed-secrets/releases>).
4. Export the production values and run the script:
   ```bash
   export DATABASE_URL='postgres://user:pass@host:5432/transit'
   export JWT_SECRET='...'
   export CONNECTOR_SECRET_KEY='...'
   export POSTGRES_PASSWORD='...'
   bash infra/scripts/seal-secrets.sh
   ```
5. Add the generated filenames to `resources:` in this directory's `kustomization.yaml`:
   ```yaml
   resources:
     - backend-secrets.yaml
     - postgres-secrets.yaml
     - firebase-sa.yaml
   ```
6. Commit both the sealed files and the updated `kustomization.yaml`.

## Rotating a value

Re-run the script with the new value and commit the regenerated file. The Secret it produces
keeps the same name, so the workloads need no change — but note that unlike Kustomize's
`secretGenerator`, a SealedSecret's name carries no content hash, so **pods are not rolled
automatically**. Restart them explicitly:

```bash
kubectl -n transit-tracker rollout restart deployment/backend deployment/worker
```

## If you move to a different cluster

The old sealed files are useless there. Re-run the script against the new cluster and replace
them wholesale.
