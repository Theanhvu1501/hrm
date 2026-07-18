# App-starter checklist: spawning a new app from this base

This repo (`hrm` / `nhan-su`) is the reusable template for future sibling apps on the
`masterceo.com.vn` platform (same lineage: `ke-toan` = master-seo → `nhan-su` = this repo →
your new app). It carries the platform base — layout, SSO auth (`libs/auth`), and the 4
config screens (Phân quyền / Vai trò / Thành viên / Tenant) — with no business logic on top.

Background/rationale: `docs/superpowers/specs/2026-07-18-hrm-base-and-phase1-design.md` §9.
Known gaps in *this* base that a new app inherits: see `CLAUDE.md` → "Known limitations".

Do this in 3 steps. Replace `<new-app>` with your new app's slug (e.g. `dao-tao`).

## Step 1 — Copy the skeleton, git init

```bash
cp -R /Users/user/dev/code/Job/master-ceo/hrm /Users/user/dev/code/Job/master-ceo/<new-app>
cd /Users/user/dev/code/Job/master-ceo/<new-app>
rm -rf .git
git init
```

Copy the whole repo as-is, **including `be/libs/auth`** (copied whole, on purpose — not a
shared package; see design spec §5, "Auth: copy `libs/auth` nguyên khối"). Do not try to
symlink or npm-link it back to `hrm` or `master-seo`.

## Step 2 — Rebrand identifiers

Every value below currently reads `nhan-su` / `nhan_su` / the hrm ports somewhere in the
tree — grep for it if this list drifts from the actual repo.

**Backend (`be/`):**
- `be/.env-cmdrc` → `db.MONGODB_DATABASE`: `nhan_su` → `<new_app_db>` (also update
  `db.MONGODB_URI` if it points at a different Mongo instance).
- `be/.env-cmdrc` → ports: pick free ports for `gateway.PORT`, `auth.PORT`, `config.PORT`
  (and matching `services.SERVICE_AUTH_PORT` / `SERVICE_CONFIG_PORT`) so you can run this
  app alongside `hrm`/`master-seo` locally without collisions. Today's hrm values are
  4000/4001/4007 — do not reuse them for the new app.
- `be/package.json` → `"name"`: `nhan-su-be` → `<new-app>-be`.
- `be/apps/auth-service/src/auth-service.service.ts` → the
  `identityClient.getMyTenantsForApp(token, 'nhan-su')` call: change the literal `'nhan-su'`
  to `'<new-app>'`. This must match Step 3's `appId` exactly.
- `be/.nvmrc` — leave as `v22.0.0` unless the new app has a different Node requirement.

**Frontend (`fe/`):**
- `fe/src/services/identitySession.ts` → `const APP_ID = 'nhan-su'` → `'<new-app>'`. This is
  the single source of truth the FE uses to decode `apps` claims and call identity — it must
  equal the BE's `getMyTenantsForApp` value and the identity `appId` from Step 3.
- `fe/package.json` → `"name"`: `nhan-su-fe` → `<new-app>-fe`.
- `fe/.env.development` and `fe/.env.production` → `VITE_API_BASE_URL` (point at the new
  gateway port locally; `/api` in prod behind the same reverse proxy pattern) and
  `VITE_IDENTITY_URL` (usually unchanged — same shared identity-service).
- `fe/vite.config.ts` → `server.port` (match the new dev port you picked) and the `VitePWA`
  `manifest.name` / `short_name` / `description`.
- `fe/.nvmrc` — leave as `v22.0.0` unless the new app has a different Node requirement.

Rebuild both (`be`: `yarn install && yarn build:all`; `fe`: `npm install && npm run build`)
to catch anything the grep missed before moving to Step 3.

## Step 3 — Register the app in identity

The new app is invisible to identity (and thus to the AppSwitcher and SSO) until you seed it.
This repo's `ops/` scripts never touch identity-service's source — only its database and CORS
config, from outside.

1. Copy `ops/seed-nhan-su-app.ts` → `ops/seed-<new-app>-app.ts` in the new app's repo and
   change the two literals inside: `appId: 'nhan-su'` → `'<new-app>'` and the default
   `feUrl` (`FE_NHAN_SU_URL` fallback `https://nhan-su.masterceo.com.vn`) → the new app's
   subdomain. Run it:
   ```bash
   IDENTITY_MONGODB_URI="mongodb://..." \
   IDENTITY_DB="masterceo_identity" \
   TENANT_ID="<tenant-id>" \
   FE_<NEW_APP>_URL="https://<new-app>.masterceo.com.vn" \
   npx ts-node ops/seed-<new-app>-app.ts
   ```
   This upserts the `apps` row (`appId`, `name`, `feUrl`, `isActive`) and, if `TENANT_ID` is
   given, a `tenant_apps` entitlement row. See `ops/README.md` for the full option (there's
   also an admin-API alternative for granting `tenant_apps` without touching the `apps`
   catalog).
2. **Manually** add `https://<new-app>.masterceo.com.vn` to identity-service's
   `CORS_ORIGINS` (in identity-service's own `.env-cmdrc.json`, `prod` block) and redeploy
   identity-service. `COOKIE_DOMAIN=.masterceo.com.vn` already covers all subdomains, so
   leave that unchanged. This step happens in the identity-service project, not here.

Once both are done, users with access to the tenant will see the new app in the AppSwitcher
and SSO will issue tokens whose `apps` claim includes the new `appId`.
