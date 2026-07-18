# CLAUDE.md

This file guides Claude Code (and any future session) working in this repository.

## Project

**hrm** is the `nhân sự` (HR) app in the `masterceo.com.vn` platform. It was forked from
`master-seo` (the accounting app `ke-toan`) and stripped down to a reusable base: layout,
SSO auth, and the platform's config screens — all accounting business logic removed.

| Item | Value |
|---|---|
| `appId` (row in identity's `apps` collection) | `nhan-su` |
| FE subdomain | `https://nhan-su.masterceo.com.vn` |
| App's own MongoDB database | `nhan_su` |
| Identity/SSO service (external, not in this repo) | `http://localhost:3020` (dev) |

The platform has an identity-service (SSO/IdP) shared across sibling apps (`ke-toan` =
master-seo, `giao-viec` = task-management, `nhan-su` = this repo). Each app verifies the
access token locally (HS256 shared secret) and loads its own RBAC from its own DB — it does
not call identity on every request. See `docs/superpowers/specs/2026-07-18-hrm-base-and-phase1-design.md`
for the full design rationale and `docs/superpowers/plans/2026-07-18-hrm-p1-base.md` for how
the fork was executed task-by-task.

## Backend (`be/`) — NestJS monorepo, yarn

Only **3 services** remain (the other 8 accounting microservices from master-seo were deleted):

- `apps/gateway` (port **4000**) — API gateway, routes `/auth/*` → auth-service, `/config/*`
  and `/tai-lieu/*` → config-service (see `apps/gateway/src/environments/environment.ts`).
- `apps/auth-service` (port **4001**) — session/tenant-switch, SSO integration with identity.
  **Has no local `/login` endpoint** — see Known limitations below.
- `apps/config-service` (port **4007**) — platform config modules: `phan-quyen`, `vai-tro`,
  `nguoi-dung`. (It also still wires `quy-chuan`, `phieu-template`, `tai-lieu` modules left
  over from the accounting fork — see Known limitations.)

Shared libs: `libs/auth` (copied whole from master-seo, kept as `@app/auth`, not extracted
into a shared package — see design spec §5), `libs/core`, `libs/database`, `libs/dto`,
`libs/entities`, `libs/service-client`.

**Run:**
```bash
cd be
nvm use v22.0.0   # be/.nvmrc — Node 22 required
yarn start:all:dev
```
Requires MongoDB running locally and reachable via `be/.env-cmdrc` → `db.MONGODB_URI`
(`MONGODB_DATABASE` is `nhan_su`). `JWT_SECRET` in `.env-cmdrc` is a **dev-only default**.

Test: `yarn test` (Jest, per-app/lib suites).

## Frontend (`fe/`) — React + Vite + antd, npm

- Dev server port **8081** (`fe/vite.config.ts`, `fe/.nvmrc` = v22.0.0).
- `fe/.env.development`: `VITE_API_BASE_URL=http://localhost:4000/api`,
  `VITE_IDENTITY_URL=http://localhost:3020`.
- `APP_ID` in `fe/src/services/identitySession.ts` = `'nhan-su'` (must match the `appId`
  registered in identity's `apps` collection and the value auth-service passes to
  `identityClient.getMyTenantsForApp(token, 'nhan-su')` in
  `be/apps/auth-service/src/auth-service.service.ts`).
- PWA manifest name: "Nhân sự" (`fe/vite.config.ts`).

**Run:** `cd fe && nvm use && npm run dev` — opens on `http://localhost:8081`.
Test: `npm run test` (Vitest). No Playwright/e2e infra is set up in this repo.

### What's in the base (kept from master-seo)

- `components/layout/MainLayout.tsx` — sidebar + header, `AppSwitcher`, `TenantSwitcher`.
  The business sidebar menu was stripped to a single "Trang chủ" placeholder; HR modules
  will be added here in later phases.
- Header gear menu → 4 config screens, all under `pages/cau-hinh/`:
  - `vai-tro` (roles) — fully backed by config-service on `nhan_su`, works locally.
  - `phan-quyen` (permissions) — fully backed by config-service on `nhan_su`, works locally.
  - `thanh-vien` (members / `nguoi-dung`) — depends on identity-service over HTTP; needs
    identity running to fully exercise locally.
  - `tenant` — see Known limitations (`tenantService.ts` targets a deleted route).
  - `linh-vuc` (a 5th gear-menu item, an entitlement/"module visibility" screen) is also
    still present — see Known limitations for its stale menu catalog.
- `common/c-handler` (CHandler/RxJS state pattern) — see `fe/HANDLER_GUIDE.md` for how to
  build a new feature with it. Keep using this pattern for new HR modules.
- `contexts/AuthContext`, `components/ProtectedRoute`, `pages/auth/LoginPage`,
  `pages/profile`, `ComingSoon`/`NotFound`/`PlaceholderPage`.

## Roadmap (phân hệ nghiệp vụ — chưa làm ở base này)

Base (this state) = layout + auth + 4 config screens only, no HR business logic yet.
Next phases, in order (each phase gets its own spec/plan under `docs/superpowers/`):

1. **Hồ sơ Nhân sự** (Employee master record) — onboarding, hợp đồng lao động, quá trình
   công tác (versioning), thôi việc. Payroll/Chấm công integrations are stubs at this phase.
2. **Chấm công** (Time & attendance) — ca, địa điểm check-in (GPS/Wifi/QR + face), đơn từ,
   batch tổng hợp bảng công. Depends on Hồ sơ Nhân sự.
3. **Đào tạo & Phát triển** (Training & development) — not yet specified.

## Known limitations / P1 caveats

Read this before assuming something is broken vs. intentionally deferred.

1. **No local login without identity.** identity-service issues the SSO tokens; `auth-service`
   in this repo has **no `/login` endpoint** (only `/verify`, `/me`, `/switch-tenant`,
   `/logout` — see `be/apps/auth-service/src/auth-service.controller.ts`). The FE
   `LoginPage` posts to `POST /auth/login`, which does not exist here, so it will 404 if
   `VITE_IDENTITY_URL` is unset and identity isn't running elsewhere to redirect through.
   The P1 base was verified instead by minting an HS256 token by hand and hitting
   config-service endpoints directly — not via a real interactive login.
2. **Of the 4+1 config screens under the gear menu:** `vai-tro` and `phan-quyen` are fully
   backed by config-service against `nhan_su` and work standalone. `thanh-vien` depends on
   identity-service (HTTP call) and needs it running. `tenant`'s
   `fe/src/services/tenantService.ts` still calls `endpoint: '/master-data/tenants'`, a
   route that no longer exists in the gateway (only `/auth`, `/config`, `/tai-lieu` are
   routed — see `be/apps/gateway/src/environments/environment.ts`) — it will 404 until a
   later phase gives it a real data source.
3. **`RoleGuard` is a no-op.** `be/libs/auth/src/guards/role.guard.ts` `canActivate()` just
   `return true` — any `@Roles(...)` decorator is currently inert. Real enforcement today is
   via `PermissionGuard` (`be/libs/auth/src/guards/permission.guard.ts`), which does check
   `user.permissions`. Harden `RoleGuard` before relying on role-based checks.
4. **`JWT_SECRET` in `be/.env-cmdrc` is a dev default** (`"your-super-secret-key-change-in-production"`)
   — must be replaced with a real secret (and kept in sync with identity's HS256 secret) before
   any non-local deployment.
5. **Registering this app in identity is a manual/deploy-time step**, not automatic. Use
   `ops/seed-nhan-su-app.ts` (see `ops/README.md`) to upsert the `apps` row and, optionally,
   a `tenant_apps` grant — plus manually add the `nhan-su.masterceo.com.vn` subdomain to
   identity-service's `CORS_ORIGINS` and redeploy identity. This repo never modifies
   identity-service source.
6. **Leftover dead code from the fork, safe to ignore or prune later:**
   - `config-service` still wires `quy-chuan`, `phieu-template`, `tai-lieu` modules (and FE
     has matching unused service files `quyChaunService.ts`, `phieuTemplateService.ts`,
     `taiLieuService.ts`, `khoTemplateService.ts`) — none of these are imported by any active
     page.
   - `fe/src/config/menuCatalog.ts` still lists the full **old accounting sidebar** (kế toán,
     kho, bếp ăn, etc.), not the current stripped HR sidebar. It's not dead, though: the
     `linh-vuc` (entitlement) screen reads it via `MENU_CATALOG` to let admins tick which
     menu items a "lĩnh vực" can see — so today it lets admins assign menu keys that don't
     correspond to any real route in this app. Needs a rewrite once the HR sidebar exists.

## Spawning a new app from this base

See `docs/app-starter-checklist.md` for the 3-step "copy this repo → rebrand → register in
identity" checklist. This repo is meant to be the reusable template going forward.
