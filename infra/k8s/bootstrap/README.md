# Cluster addons

Installed by [`infra/scripts/install-cluster-addons.sh`](../../scripts/install-cluster-addons.sh).
Both versions are pinned as variables at the top of that script — bump them there, not by hand.

| Addon | Version | Installed by default | Needed for |
|---|---|---|---|
| ingress-nginx | `controller-v1.15.1` | yes | routing `/api` and `/` to the right Service |
| sealed-secrets | `v0.39.1` | no — pass `--with-sealed-secrets` | the `prod` overlay only |

## ingress-nginx

Installed from the **`provider/cloud`** manifest, not `provider/kind` or the bare-metal one.
That manifest requests a `LoadBalancer` Service, which is what Docker Desktop fulfils.

```
https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.15.1/deploy/static/provider/cloud/deploy.yaml
```

### How host traffic reaches it (measured on this cluster)

Docker Desktop **does** fulfil the `LoadBalancer`, so nothing extra is required:

```
$ kubectl -n ingress-nginx get svc ingress-nginx-controller
NAME                       TYPE           EXTERNAL-IP   PORT(S)
ingress-nginx-controller   LoadBalancer   172.21.0.5    80:31345/TCP,443:32253/TCP

$ curl -o /dev/null -w '%{http_code}' http://transit.localtest.me/
404
```

**A 404 here is the healthy result** before anything is deployed: nginx is answering and no
Ingress rule matches yet. Once the app is deployed the same URL returns the frontend.

`transit.localtest.me` is a public wildcard domain resolving to `127.0.0.1`, so no `hosts` file
edit is needed. Everything is served on **port 80** — the plain hostname, no port suffix.

If a future cluster does *not* fulfil the LoadBalancer (`EXTERNAL-IP` stuck at `<pending>`, or
curl cannot connect), the fallbacks in order are:

1. Give the controller host ports:
   ```bash
   kubectl -n ingress-nginx patch deployment ingress-nginx-controller --type=json -p '[
     {"op":"add","path":"/spec/template/spec/containers/0/ports/0/hostPort","value":80},
     {"op":"add","path":"/spec/template/spec/containers/0/ports/1/hostPort","value":443}
   ]'
   ```
2. Port-forward, which moves the local URL to `http://transit.localtest.me:8080`:
   ```bash
   kubectl -n ingress-nginx port-forward svc/ingress-nginx-controller 8080:80
   ```

Neither was needed here.

## sealed-secrets

Only the `prod` overlay uses SealedSecrets; the `local` overlay generates its secrets with
Kustomize's `secretGenerator` and needs neither the controller nor the `kubeseal` CLI. Install it
only when preparing a real deployment:

```bash
bash infra/scripts/install-cluster-addons.sh --with-sealed-secrets
```

Note the upstream repository moved from `bitnami-labs/sealed-secrets` to **`bitnami/sealed-secrets`**.
The old URLs still redirect, but the script uses the canonical org.

Sealed values are encrypted with one specific cluster's controller key, so they cannot be
generated ahead of time or shared between clusters. See
[`../overlays/prod/sealed/README.md`](../overlays/prod/sealed/README.md).
