# Deployment Instructions for `nhan-su` App Registration

This directory contains standalone scripts for registering the `nhan-su` app in the `masterceo_identity` database, without modifying identity-service source code.

## Prerequisites

The `nhan-su` app must be registered in the identity-service database (`masterceo_identity` collections `apps` and optionally `tenant_apps`) to:
- Appear in the AppSwitcher for users
- Grant entitlements to specific tenants

## Option 1: Seed Script (Recommended)

Run the standalone MongoDB upsert script:

```bash
IDENTITY_MONGODB_URI="mongodb://..." \
IDENTITY_DB="masterceo_identity" \
TENANT_ID="<tenant-id>" \
FE_NHAN_SU_URL="https://nhansu.masterceo.com.vn" \
npx ts-node ops/seed-nhan-su-app.ts
```

**Environment Variables:**
- `IDENTITY_MONGODB_URI` (required): MongoDB connection string to the identity database
- `IDENTITY_DB` (optional, default: `masterceo_identity`): Database name
- `TENANT_ID` (optional): If provided, also upserts a `tenant_apps` row to grant the app to this tenant
- `FE_NHAN_SU_URL` (optional, default: `https://nhansu.masterceo.com.vn`): Frontend URL for the app

**Output:** Idempotently upserts:
- `apps` collection: `{appId: 'nhan-su', name: 'Nhân sự', feUrl, isActive: true}`
- `tenant_apps` collection (if `TENANT_ID` provided): `{tenantId, appId: 'nhan-su', isActive: true}`

## Option 2: Admin API

Alternatively, use the identity-service admin API to grant the app to a tenant:

```bash
PUT /api/admin/tenants/:tenantId/apps
Content-Type: application/json

{
  "appId": "nhan-su",
  "isActive": true
}
```

**Note:** This API grants entitlements to `tenant_apps` but does NOT register the app in the `apps` catalog. You must still run the seed script (Option 1) or manually insert an `apps` row to make the app visible in AppSwitcher.

## Step 3: Configure CORS on Identity Service

**Manual task on identity-service project** (done by operator during deployment, NOT automated here):

1. Edit `identity-service/.env-cmdrc.json`
2. Add `https://nhansu.masterceo.com.vn` to `prod.CORS_ORIGINS`:
   ```json
   {
     "prod": {
       "CORS_ORIGINS": ["https://nhansu.masterceo.com.vn", "..."],
       "COOKIE_DOMAIN": ".masterceo.com.vn"
     }
   }
   ```
3. Redeploy identity-service

**Note:** `COOKIE_DOMAIN=.masterceo.com.vn` already covers all subdomains (`*.masterceo.com.vn`), so keep it unchanged.

**Note:** the repo copy of identity's config is not the source of truth for CORS — per this step, the operator edits it directly on the server, so `identity-service/.env-cmdrc.json` here can go stale. Read the live value instead:
```bash
ssh kt "docker exec masterceo-identity sh -c 'echo \$CORS_ORIGINS'"
```

## Summary

To fully register `nhan-su`:
1. Run this seed script (Option 1) — registers app globally + optionally grants to tenant
2. Update CORS on identity-service and redeploy (manual on identity project)
3. Users with access to the tenant will see `nhan-su` in AppSwitcher

## Vá quyền 3 module chấm công thêm sau (`grant-quyen-module-moi.ts`)

**BẮT BUỘC chạy cùng lần deploy bản đổi `AdminGuard` → `PermissionGuard`.**

`PERMISSION_MODULES` (`be/libs/core/src/permissions/all-permissions.ts`) có 14 module ×
5 hành động = 70 quyền, nhưng các hàng `phan_quyen` trên production chỉ có 55 quyền — thiếu
đúng 3 module được thêm vào catalog sau: `/cham-cong/ngay-le`, `/cham-cong/thiet-bi`,
`/cham-cong/ban-ghi`. Từ khi 7 controller của config-service gác bằng `PermissionGuard`,
route không có quyền tương ứng sẽ trả 403 — deploy code mà quên script này thì ba màn hình
Ngày lễ / Thiết bị / Bản ghi chấm công vẫn 403 với **mọi người**, không sửa được gì.

Script chỉ **thêm** quyền, không bao giờ xoá. Với mỗi vai trò nó sao chép đúng **bộ hành
động mà vai trò đó đang có cho `/cham-cong/ca-lam-viec`** — vai trò không có quyền nào với
`ca-lam-viec` (vd "Nhân viên") sẽ **không được cấp gì**. Chạy lại nhiều lần là an toàn.

```bash
# 1. Xem trước, không ghi gì
MONGODB_URI="mongodb://..." MONGODB_DATABASE=nhan_su \
  npx ts-node ops/grant-quyen-module-moi.ts --dry-run

# 2. Ghi thật
MONGODB_URI="mongodb://..." MONGODB_DATABASE=nhan_su \
  npx ts-node ops/grant-quyen-module-moi.ts
```

**Environment Variables:**
- `MONGODB_URI` (required): connection string tới DB của app (KHÔNG phải DB identity)
- `MONGODB_DATABASE` (optional, default: `nhan_su`)

Trên server, lấy đúng giá trị thật từ `be/env/db.env` chứ đừng dùng bản local (xem cảnh báo
deploy bên dưới).

**Output:** in từng hàng `phan_quyen` kèm bộ hành động khuôn và danh sách quyền sẽ thêm,
rồi tổng kết `Đã cập nhật N/M hàng, K quyền được thêm`. Hàng bị bỏ qua được in rõ lý do.

## ⚠️ Deploy caveat — KHÔNG rsync đè env của server
Server giữ env THẬT (secrets + `MONGODB_DATABASE=nhan_su`) trong `be/env/*.env`. Bản local có thể lệch.
Khi deploy PHẢI loại trừ env để không ghi đè:
```bash
rsync -az --delete --exclude=node_modules --exclude=dist --exclude=.git --exclude=.superpowers --exclude=env \
  ./be ./fe kt:/root/chimseo/nhan-su/
ssh kt 'cd /root/chimseo/nhan-su && docker compose -f docker-compose.production.yml up -d --build'
```
Sự cố đã gặp (2026-07-18): rsync KHÔNG loại `env/` → db.env local (`digital_book`) đè lên server → app ghi nhầm vào DB master-seo. Đã dọn + khôi phục. Luôn dùng `--exclude=env`.
