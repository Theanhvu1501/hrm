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

## Bật quỹ giờ làm thêm cho một công ty (P4.2a)

Module `quy-gio` (BE: `be/apps/config-service/src/quy-gio/`, hai collection
`overtime_balances` + `overtime_balance_entries`, entity ở
`be/libs/entities/src/cham-cong/overtime-balance.entity.ts`) tích giờ làm thêm đã duyệt
thành quỹ, và từ nay **đơn nghỉ bù (`nghi_bu`) trừ vào quỹ này thay vì tự do như trước** —
xem "Báo HR trước" ở bước 4 dưới đây trước khi bật.

**Đúng thứ tự:**

1. **Tạo index bằng tay trên MongoDB production.** `synchronize` (`be/libs/database/src/database.module.ts`)
   chỉ bật khi `NODE_ENV=development`, nên production **không tự sinh bất kỳ chỉ mục nào** —
   kể cả `unique` khai trong entity. Chạy trong `mongosh` trên server, DB `nhan_su`:

   ```js
   // unique(tenantId, employeeId, kyTich) là RÀNG BUỘC ĐÚNG ĐẮN, không phải tối ưu tốc độ:
   // hai hàng cùng kỳ nghĩa là số dư bị chẻ đôi và soDuKhaDung()/doiSoat() đọc sai.
   db.overtime_balances.createIndex({ tenantId: 1, employeeId: 1, kyTich: 1 }, { unique: true });
   // Hỗ trợ xemTruocDongQuy()/dongQuyGio() quét theo trạng thái (toàn bộ NV).
   db.overtime_balances.createIndex({ trangThai: 1 });
   // Hỗ trợ donLienQuanOt()/demRongTheoLyDo() (tra sổ theo một đơn cụ thể).
   db.overtime_balance_entries.createIndex({ requestId: 1 });
   // Hỗ trợ doiSoat() (tra sổ theo nhân viên).
   db.overtime_balance_entries.createIndex({ employeeId: 1 });
   ```

   > **`tenantId` bắt buộc phải dẫn đầu ở chỉ mục UNIQUE, dù `quy-gio.service.ts` không tự
   > tay lọc theo `tenantId` ở bất kỳ query nào.** Lý do KHÔNG mâu thuẫn với việc bỏ
   > `tenantId` khỏi hai chỉ mục `overtime_balance_entries` phía dưới:
   > `DatabaseModule.forFeature()` (`be/libs/database/src/database.module.ts`) bọc MỌI
   > repository (trừ danh sách `TENANT_EXEMPT_ENTITIES`, không có `OvertimeBalance`/
   > `OvertimeBalanceEntry` trong đó) bằng một proxy tự động chèn `tenantId` vào mọi
   > `find`/`findOne`/`save`/... — nên các query của `quy-gio.service.ts` VẪN được lọc theo
   > tenant dù code không viết `tenantId` ra, và một chỉ mục KHÔNG unique (như hai chỉ mục
   > `overtime_balance_entries` phía dưới) vẫn được planner dùng đúng dù thiếu `tenantId`
   > làm tiền tố. Nhưng ràng buộc UNIQUE thì khác hẳn về bản chất: MongoDB áp `unique` ở
   > tầng engine, trên TOÀN BỘ collection, không biết gì tới proxy hay tenant context của
   > tầng ứng dụng. Một unique index thiếu `tenantId` nghĩa là "một hàng cho mỗi
   > (nhân viên, kỳ) TRÊN TOÀN HỆ THỐNG", không phải "trên mỗi công ty" — công ty B tạo quỹ
   > tháng đầu tiên có thể bị MongoDB từ chối với lỗi duplicate-key nếu trùng khoá với một
   > hàng có sẵn của công ty A.
   >
   > **Đã kiểm tra `OvertimeBalance.employeeId` thực sự chứa gì** trước khi viết đoạn này:
   > nó là `_id` Mongo của nhân viên (ép `String`), KHÔNG phải mã `NV####` trên
   > `Employee.employeeId`. Bằng chứng: `quy-gio.controller.ts` gọi
   > `quyGio_Service.soDuKhaDung(String((emp as any)._id), ...)`, và phía tạo đơn
   > (`don-cham-cong.service.ts` → `findEmployee()`) đọc `employeeId` bằng
   > `new ObjectId(employeeId)` — tức toàn bộ đường đi từ đơn tới quỹ đều mang `_id` Mongo,
   > vốn đã gần như duy nhất toàn cục (12 byte gồm thời gian + máy + counter), không phải
   > chuỗi `NV0001` mà mỗi tenant đều bắt đầu lại từ đầu. Nghĩa là va chạm thật giữa hai
   > công ty gần như không xảy ra trong thực tế — NHƯNG vẫn phải khai `tenantId` dẫn đầu:
   > chi phí hai chiều không đối xứng (thêm vào vô hại nếu id đã duy nhất toàn cục; bỏ đi mà
   > lỡ va chạm thì một công ty hoàn toàn hợp lệ bị MongoDB từ chối ghi giữa lúc vận hành
   > thật, khó chẩn đoán). Đúng quy ước sẵn có của repo: `IDX_employee_device_unique`
   > (`be/libs/entities/src/cham-cong/employee-device.entity.ts`, unique trên
   > `[tenantId, employeeId, deviceId]`) và `IDX_app_user_role_unique`
   > (`be/libs/entities/src/auth/app-user-role.entity.ts`, unique trên `[userId, tenantId]`)
   > đều để `tenantId` dẫn đầu ở MỌI chỉ mục unique trong repo — không có ngoại lệ nào.
   >
   > Ngược lại, việc bỏ `tenantId` khỏi hai chỉ mục KHÔNG unique bên dưới
   > (`overtime_balances.trangThai`, `overtime_balance_entries.requestId`/`employeeId`) là
   > ĐÚNG và chỉ áp dụng cho trường hợp không-unique này — đừng suy rộng "quy-gio không cần
   > tenantId" sang một chỉ mục unique thêm sau này.

2. **Chạy `ops/grant-quyen-module-moi.ts` để cấp `/cham-cong/quy-gio`.**

   `/cham-cong/quy-gio` đã được đăng ký ở cả ba nơi (T13b), theo đúng khuôn mẫu
   `/cham-cong/quy-phep`: `PERMISSION_MODULES`
   (`be/libs/core/src/permissions/all-permissions.ts`), catalog FE
   `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts` (nhãn "Quỹ giờ làm
   thêm"), và `MODULE_CAN_CAP` của `ops/grant-quyen-module-moi.ts`. Route quản trị chỉ thực
   sự enforce hai hành động `:xem` và `:sua` (xem `quy-gio.controller.ts`) — không route nào
   đòi `:them`/`:xoa`/`:xuat`, nhưng script vẫn cấp NGUYÊN bộ hành động mà vai trò đang có
   cho module khuôn (`/cham-cong/ca-lam-viec`), giống hệt cách nó đã làm cho `quy-phep`.
   Quyền thừa không dùng tới không hại gì.

   ```bash
   # 1. Xem trước, không ghi gì
   MONGODB_URI="mongodb://..." MONGODB_DATABASE=nhan_su \
     npx ts-node ops/grant-quyen-module-moi.ts --dry-run

   # 2. Ghi thật
   MONGODB_URI="mongodb://..." MONGODB_DATABASE=nhan_su \
     npx ts-node ops/grant-quyen-module-moi.ts
   ```

   Bỏ qua bước này thì màn "Quỹ giờ làm thêm" vẫn 403 với mọi vai trò trừ
   `SUPER_ADMIN_EMAIL` (permissions `['*']`, xem `permission.guard.ts`) — đúng lỗi mà repo đã
   gặp với 3 module chấm công trước đây. Route `GET /quy-gio/cua-toi/so-du` (nhân viên tự xem
   số dư) không bị ảnh hưởng bởi bước này — nó chỉ có `JwtGuard`, không đòi quyền module.

3. **Khai `soGioMoiNgay` và `lamThem` ở màn Cấu hình lương** — tab **"Làm thêm & quỹ
   giờ"** (`/luong/cau-hinh-luong`, quyền `/luong/cau-hinh:sua`).

   > **Đây là công tắc BẬT tính năng, và nó là công tắc TAY có chủ đích.** Tab này được
   > bổ sung trong đợt vá review nhánh (IMPORTANT 6): trước đó runbook mô tả một thao
   > tác không tồn tại — màn Cấu hình lương chưa hề có hai trường này
   > (`grep -rn "lamThem\|soGioMoiNgay" fe/src` không ra gì), nên tenant nào đã từng
   > chạy bảng lương trước P4.2a KHÔNG có đường nào bật được quỹ giờ.
   >
   > **CỐ Ý KHÔNG backfill kiểu `bhCongTy`** (`bang-luong.service.ts:64`, thêm ở P4.1
   > cho đúng tình huống này). Backfill sẽ bật NGẦM tính năng cho mọi tenant ngay lúc
   > deploy — mà bật nó nghĩa là **chặn nộp đơn nghỉ bù của TOÀN CÔNG TY** cho tới khi
   > có đơn làm thêm đầu tiên được duyệt (xem bước 4). `bhCongTy` backfill được vì nó
   > chỉ sửa một con số báo cáo chi phí; `lamThem` thì đổi hành vi nộp đơn của mọi
   > nhân viên. Cái giá của lựa chọn này: HR phải chủ động vào bấm, deploy xong mà
   > không ai bấm thì quỹ giờ đứng yên (đúng trạng thái an toàn, `tichTuDonOt()` chỉ
   > log cảnh báo và bỏ qua).
   >
   > **Giới hạn còn lại:** tab này chỉ BẬT được, chưa TẮT được. Gỡ `lamThem` khỏi một
   > bản ghi đã lưu cần `$unset` thẳng trên MongoDB — `CapNhatCauHinhLuongDto` không có
   > đường diễn đạt "xoá trường này", và `capNhatCauHinh()` dùng `Object.assign` nên
   > một `lamThem: undefined` gửi lên sẽ bị bỏ qua im lặng chứ không xoá.

   Trường `lamThem` (kiểu `CauHinhLamThem`, xem
   `be/libs/entities/src/luong/luong.types.ts`) gồm:
   - `cheDoBu`: **chỉ `'chi_nghi_bu'` được hỗ trợ ở P4.2a** — ba chế độ còn lại
     (`chi_tien`, `nhan_vien_chon`, `nghi_bu_va_chenh`) bị DTO từ chối là "chưa được hỗ trợ"
     (xem `CauHinhLamThemHopLe` trong `be/apps/config-service/src/bang-luong/dto/cap-nhat-cau-hinh-luong.dto.ts`).
   - `heSoTichQuy` (`{ ngay_thuong, ngay_nghi, ngay_le }`): với `chi_nghi_bu`, mỗi hệ số
     phải **≥ sàn BLLĐ 2019 Đ98.1** (1.5 / 2.0 / 3.0) — DTO chặn nếu thấp hơn.
   - `soThangHanDung`: số tháng quỹ còn hiệu lực trước khi hết hạn, `null` = không hết hạn.
   - `khiHetHan`: `'quy_ra_tien'` hoặc `'huy_bo'`.
   - `soGioMoiNgay` (trên `CauHinhLuongData`, cùng cấp `lamThem` chứ không nằm trong nó):
     số giờ của một ngày công, dùng quy đổi ngày↔giờ cho đơn nghỉ bù.

   Với công ty **đã có** bản ghi `CauHinhLuong` từ trước (đã từng mở màn Cấu hình lương /
   chạy Tổng hợp lương trước khi P4.2a deploy), bản ghi đó **không có `lamThem`** — mở tab
   "Làm thêm & quỹ giờ", tab sẽ hiện cảnh báo "Công ty chưa bật quỹ giờ làm thêm" kèm nút
   **"Bật quỹ giờ làm thêm"**. Nút đó chỉ điền sẵn giá trị mặc định (chế độ "chỉ nghỉ bù",
   hệ số đúng sàn BLLĐ, không hết hạn, hết hạn thì quy ra tiền) vào form — **vẫn phải bấm
   "Lưu cấu hình"** mới có hiệu lực, và sửa lại các giá trị trước khi lưu nếu công ty khai
   khác. `QuyGio_Service.layCauHinh()` cố ý trả `null` (không rơi về mặc định ngầm) khi
   `lamThem` rỗng, nên trước khi lưu, `tichTuDonOt()` chỉ log cảnh báo và bỏ qua — không
   tích quỹ cho bất kỳ đơn OT nào.

   Với công ty **hoàn toàn mới** (chưa từng có bản ghi `CauHinhLuong`), lần đầu ai đó mở màn
   Cấu hình lương hoặc chạy Tổng hợp lương sau khi deploy, `CAU_HINH_LUONG_MAC_DINH`
   (`be/apps/config-service/src/bang-luong/cau-hinh-luong.seed.ts`) tự tạo một bản ghi đã có
   sẵn `lamThem: { cheDoBu: 'chi_nghi_bu', heSoTichQuy: sàn BLLĐ, soThangHanDung: null,
   khiHetHan: 'quy_ra_tien' }` — nghĩa là tính năng **coi như đã bật ngay từ đầu** cho công
   ty mới, không cần bước điền tay này. Bước 4 dưới đây vẫn áp dụng cho công ty mới y hệt.

4. **⚠️ Báo HR TRƯỚC khi hoàn tất bước 3 — BẮT BUỘC, không phải khuyến nghị.** Từ thời
   điểm công ty có `lamThem` hợp lệ:
   - Đơn nghỉ bù (`nghi_bu`) **không còn tự do nộp** — nó trừ vào quỹ giờ và bị
     `ConflictException` (mã `QUY_GIO_KHONG_DU_SO_DU`) chặn ngay lúc nộp nếu không đủ số dư
     (xem `phanBoChoNghiBu()` trong `quy-gio.service.ts`, gọi từ `don-cham-cong.service.ts`).
   - **Cố ý KHÔNG có backfill.** Mọi nhân viên bắt đầu ở số dư 0 giờ và **không nộp được
     bất kỳ đơn nghỉ bù nào** cho tới khi có ít nhất một đơn làm thêm (OT) MỚI được duyệt
     sau thời điểm này và tích quỹ.
   - Đây là hành vi **có chủ đích**, nhưng nếu HR không được báo trước, ngày đầu tiên họ sẽ
     thấy hàng loạt đơn nghỉ bù bị từ chối nộp và báo cáo như một lỗi hệ thống.

   Nói cách khác: bật tính năng này = tắt khả năng nộp nghỉ bù của TOÀN BỘ công ty cho tới
   khi có đơn OT đầu tiên được duyệt. Xếp lịch bật cùng lúc với đợt duyệt OT đầu tiên, không
   bật rồi im lặng.

Xem thêm hai route vận hành khác của module (không bắt buộc để "bật" tính năng, nhưng nên
biết khi vận hành lâu dài):
- `GET /quy-gio/xem-truoc-dong-quy?den=YYYY-MM-DD` + `POST /quy-gio/dong-quy` (quyền
  `/cham-cong/quy-gio:sua`) — xem trước rồi đóng các quỹ đã quá `hanDung`, ghi sổ
  `quy_ra_tien`/`het_han` theo `khiHetHan`. Không tự chạy định kỳ (không có cron trong repo)
  — phải có người bấm/gọi tay, hoặc dựng job riêng nếu muốn tự động.

  Xem trước trả **hai** danh sách: `seDong` (sẽ đóng) và `vuongCho` (quá hạn NHƯNG còn
  `soGioDangChoDuyet` > 0 — tức còn một đơn nghỉ bù đang chờ giữ chỗ trong đó).
  `dong-quy` **bỏ qua** nhóm `vuongCho` và trả `soQuyVuongCho` để người vận hành biết mình
  vừa không đóng cái gì. Cách xử lý: duyệt hoặc từ chối đơn đang treo đó trước, rồi chạy
  lại `dong-quy`. Đóng một quỹ còn giữ chỗ sẽ làm số giờ đang treo hoặc mất trắng hoặc
  được trả chồng lên số đã chốt — xem docblock `xemTruocDongQuy()`.
- `GET /quy-gio/:employeeId/doi-soat` (quyền `/cham-cong/quy-gio:xem`) — dựng lại số dư từ
  sổ `overtime_balance_entries` và so với `overtime_balances`, trả từng kỳ kèm `lech` và
  `soGioDaDong`. Dùng khi nhân viên thắc mắc số giờ, hoặc sau rollout để xác nhận không
  lệch.

  **`lech` phải bằng 0 với mọi kỳ**, kể cả kỳ đã đóng. Con số giờ được lưu 2 chữ số thập
  phân (0.01 giờ = 36 giây, xem `SO_LE_GIO` trong `luat-quy-gio.ts`) nên `lech` không bao
  giờ ra dạng `1e-15`; thấy `lech` khác 0 nghĩa là có nơi ghi số dư mà quên ghi sổ — báo
  lại, đừng tự sửa số dư (sửa là xoá mất bằng chứng của chính cái bug cần tìm).
  `soGioDaDong` là phần đã được cộng ngược từ hai dòng `quy_ra_tien`/`het_han`: quỹ đóng
  rồi vẫn giữ `soGioConLai` cho chặng lương P4.2b đọc, nên phải cộng lại mới so được.

## Rollout P3.9 — Bảng công tự sinh

`generate()` suy ký hiệu bảng công từ dữ liệu đã có (chấm công, đơn từ, ngày lễ) thay vì HR
tick tay từng ô — hai trường trên `Employee`/`Resignation` phải điền ĐÚNG **trước** lần Tổng
hợp đầu tiên trong production, nếu không HR sẽ thấy hàng trăm ô "chưa xử lý" ma ngay lần bấm
nút đầu tiên và nút Chốt khoá cứng không có cách nào gỡ nhanh:

1. **Backfill `ngayLamViecTrongTuan` cho MỌI NV đang hoạt động** (qua màn Hồ sơ nhân viên, hoặc
   script nhập liệu nội bộ nếu số lượng lớn) — trường này optional trên `Employee`, và FE mặc
   định `[]` khi tạo mới. `laNgayLamViec()` (suy-ky-hieu.ts) đọc lịch rỗng/undefined là **"chưa
   cấu hình ⇒ mọi ngày đều là ngày làm việc"** — cùng quy ước `luat-don.ts` đã dùng — nên một
   NV chưa được điền lịch sẽ có khoảng 25–30 ô trống mỗi tháng (kể cả Chủ nhật), `soOTrong` của
   tháng chạy vào hàng trăm, và nút Chốt khoá cứng: **không có** nút xoá/bỏ qua hàng loạt, phải
   xử lý từng ô hoặc điền lại lịch rồi Tổng hợp lại.
2. **Đảm bảo hồ sơ thôi việc `da_duyet`/`hoàn_thành` có `ngayLamViecCuoi`** trước khi duyệt. Đây
   là trường optional trên `Resignation` và bỏ trống là ĐƯỜNG MẶC ĐỊNH ngoài production, không
   phải ngoại lệ — `generate()` rơi về `ngayNopDon` khi thiếu (thường sớm hơn ngày nghỉ thật, vì
   NV còn đi làm suốt thời gian báo trước). Từ CRITICAL A của đợt review P3.9,
   `suyKyHieuNgay()` chặn chốt và gắn cờ `sau_ngay_nghi_viec` khi có chấm công/đơn nghỉ SAU mốc
   đó — đây là lưới an toàn phát hiện, KHÔNG phải cách sửa; muốn hết cảnh báo thì phải quay lại
   hồ sơ thôi việc điền đúng `ngayLamViecCuoi`, không có cách sửa nào ở tầng bảng công.

Không cần chạy `ops/grant-quyen-module-moi.ts` cho đợt này — P3.9 không thêm module quyền mới,
vẫn dùng `/cham-cong/bang-cong:xem|them|sua|xoa|xuat` đã có (xem spec §10).
