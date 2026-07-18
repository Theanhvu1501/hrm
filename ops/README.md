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
FE_NHAN_SU_URL="https://nhan-su.masterceo.com.vn" \
npx ts-node ops/seed-nhan-su-app.ts
```

**Environment Variables:**
- `IDENTITY_MONGODB_URI` (required): MongoDB connection string to the identity database
- `IDENTITY_DB` (optional, default: `masterceo_identity`): Database name
- `TENANT_ID` (optional): If provided, also upserts a `tenant_apps` row to grant the app to this tenant
- `FE_NHAN_SU_URL` (optional, default: `https://nhan-su.masterceo.com.vn`): Frontend URL for the app

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
2. Add `https://nhan-su.masterceo.com.vn` to `prod.CORS_ORIGINS`:
   ```json
   {
     "prod": {
       "CORS_ORIGINS": ["https://nhan-su.masterceo.com.vn", "..."],
       "COOKIE_DOMAIN": ".masterceo.com.vn"
     }
   }
   ```
3. Redeploy identity-service

**Note:** `COOKIE_DOMAIN=.masterceo.com.vn` already covers all subdomains (`*.masterceo.com.vn`), so keep it unchanged.

## Summary

To fully register `nhan-su`:
1. Run this seed script (Option 1) — registers app globally + optionally grants to tenant
2. Update CORS on identity-service and redeploy (manual on identity project)
3. Users with access to the tenant will see `nhan-su` in AppSwitcher
