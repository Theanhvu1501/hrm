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

## Tạo chỉ mục cho quỹ phép (P3.8)

Khi dữ liệu lớn lên, chạy các chỉ mục sau trên MongoDB để tối ưu hiệu suất truy vấn:

```bash
db.leave_balances.createIndex({ employeeId: 1, nam: 1, loaiQuy: 1 })
db.leave_balances.createIndex({ nam: 1, trangThai: 1 })
db.leave_balance_entries.createIndex({ balanceId: 1, thoiDiem: 1 })
db.leave_balance_entries.createIndex({ requestId: 1 })
```

## Rollout `ngayChinhThuc` hàng loạt cho NV có sẵn (P3.8, review round 4)

`ngayChinhThuc` là cột MỚI trên `Employee` — mọi hồ sơ NV đang có trước P3.8 đều thiếu nó.
Khi HR điền hàng loạt cho NV đang làm lâu năm, `moKhoaLenChinhThuc()` chỉ backfill quỹ cho
những năm **còn hạn dùng** (`hanDung >= hôm nay`) và LUÔN cấp thêm quỹ của **năm hiện tại** —
nếu không, một NV vào làm + chính thức từ 2019 sẽ chỉ nhận được một quỹ 2019 đã hết hạn từ
2020-03-31, không có quỹ nào dùng được hôm nay. Chạy đúng thứ tự sau khi rollout:

1. **Cấp quyền** (nếu chưa làm — xem mục "Vá quyền 3 module chấm công thêm sau" ở trên,
   `PERMISSION_MODULES` đã có `/cham-cong/quy-phep` từ đợt P3.8):
   ```bash
   npx ts-node ops/grant-quyen-module-moi.ts
   ```
2. **Điền `ngayChinhThuc` hàng loạt** cho NV hiện có (qua màn Hồ sơ nhân viên, hoặc script
   nhập liệu nội bộ nếu số lượng lớn) — mỗi lần lưu hồ sơ có `ngayChinhThuc` mới/thay đổi sẽ
   tự gọi `moKhoaLenChinhThuc()` (xem `nhan-vien.service.ts`).
3. **Chạy `capPhepDauNam(năm hiện tại)`** qua màn Quỹ phép (nút "Cấp phép đầu năm") — lưới an
   toàn bổ sung, phòng trường hợp bước 2 điền `ngayChinhThuc` bằng đường KHÔNG đi qua
   `NhanVien_Service.update()` (import thẳng DB, script nội bộ...) nên không tự kích
   `moKhoaLenChinhThuc()`. Idempotent theo khoá `(employeeId, nam, loaiQuy)` — chạy lại,
   hoặc chạy sau khi bước 2 đã tự cấp qua `moKhoaLenChinhThuc()`, đều không cấp trùng.
4. **Đối soát** (`GET /quy-phep/doi-soat`, hoặc nút tương ứng trên màn Quỹ phép) — xác nhận
   không có lệch giữa sổ và số dư sau đợt rollout.

### `ngayChinhThuc` tương lai: "Cấp phép đầu năm" phải chạy LẶP LẠI, không chỉ một lần/năm

Hệ quả của round 4 (IMPORTANT 2): `moKhoaLenChinhThuc()` cố ý KHÔNG cấp quỹ khi
`ngayChinhThuc` còn ở tương lai (chặn "cấp trước rồi NV nghỉ ngang" — xem lý do ở doc-comment
hàm đó). Nhưng repo này **không có cron/scheduler và không backfill lúc đọc** — nên khi ngày
đó đến hạn, KHÔNG có gì tự động cấp quỹ. Ví dụ: HR tuyển NV tháng 3, ghi `ngayChinhThuc` dự
kiến `2027-06-01` ngay lúc tuyển; đến tháng 6 không ai sửa lại hồ sơ (không có gì để sửa —
ngày đó đã đúng từ đầu); NV nộp đơn nghỉ phép tháng 7 sẽ bị chặn ở cửa "chưa được cấp quỹ"
(`CHUA_DUOC_CAP_QUY`, xem `don-cham-cong.service.ts`) cho tới khi có người bấm lại
**"Cấp phép đầu năm"**.

Vì vậy nút "Cấp phép đầu năm" (`capPhepDauNam`) **phải chạy định kỳ** (ví dụ đầu mỗi tháng),
không chỉ đúng một lần vào 1/1 — mỗi lần chạy nó vét luôn những NV vừa tới `ngayChinhThuc`
trong tháng mà chưa được cấp. Idempotent theo khoá `(employeeId, nam, loaiQuy)` nên chạy lại
nhiều lần trong năm là an toàn, không cấp trùng cho người đã có quỹ.

Mặt còn lại — **đây là đánh đổi có chủ ý, không phải lỗi**: chạy `capPhepDauNam(năm nay)` vào
tháng 1 vẫn cấp TRỌN quỹ cả năm cho một NV có `ngayChinhThuc` rơi vào tháng 6 CÙNG năm đó
(miễn `ngayChinhThuc <= 31/12` năm đang cấp, xem `locNhanVienDuocCap()`) — tức cấp trước khi
NV thực sự chạm mốc chính thức. Sản phẩm chấp nhận rủi ro này để đổi lấy việc không phải dựng
hạ tầng job định kỳ; nếu muốn siết chặt hơn (chỉ cấp đúng lúc `ngayChinhThuc` đã qua), phải
chạy `capPhepDauNam` thường xuyên hơn (vd hàng tuần) thay vì đổi logic.
