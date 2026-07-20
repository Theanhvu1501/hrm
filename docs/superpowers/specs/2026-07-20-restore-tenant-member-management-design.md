# Design: Khôi phục "Quản lý thành viên" (tenant/member) trong hrm

**Ngày:** 2026-07-20
**Trạng thái:** Draft — chờ duyệt
**Phạm vi:** Backend (config-service + gateway) + env wiring. FE **không đổi**.

## 1. Vấn đề & Root cause

Màn "Quản lý thành viên" (`fe/src/pages/cau-hinh/thanh-vien/ThanhVienPage.tsx`) gọi qua
`fe/src/services/tenantService.ts`, có base endpoint **`/master-data/tenants`**. Ví dụ trên
production:

```
GET https://nhansu.masterceo.com.vn/api/master-data/tenants/:tenantId/members → 404
```

Nguyên nhân:

1. **Gateway hrm không route `/master-data`.** `be/apps/gateway/src/environments/environment.ts`
   chỉ khai báo `/auth`, `/config`, `/tai-lieu`. Trong master-seo (kế toán), `/master-data`
   được phục vụ bởi `master-data-service` (module `tenant`) — service này **đã bị xoá khi fork**
   sang hrm. FE thì được copy nguyên vẹn nên vẫn gọi path cũ → mọi thao tác thành viên 404.
   (Đúng như CLAUDE.md "Known limitations" #2.)

2. **Latent bug liên quan:** config-service khởi động bằng `env-cmd -e config,db,jwt` (thiếu
   nhóm `services`), mà `SERVICE_IDENTITY_URL` chỉ nằm trong nhóm `services`. Do đó IdentityClient
   trong config-service không có URL identity → `BaseServiceClient` fallback về `localhost:3000`
   và mọi lệnh gọi identity fail. Phải sửa cùng, nếu không endpoint mới (proxy identity) vẫn hỏng.

Xác minh đối chiếu: `ThanhVienPage.tsx`, `tenantService.ts`, `nguoi-dung.service.ts` của hrm
**giống hệt** master-seo (`diff` rỗng) — nên đây thuần là thiếu backend + sai wiring, không phải
lỗi logic FE.

## 2. Mục tiêu

- Khôi phục đúng các endpoint mà `tenantService` gọi, **giữ nguyên FE**, hành vi giống kế toán 1:1.
- Sửa wiring để config-service gọi được identity.
- Không kéo theo refactor ngoài phạm vi.

## 3. Hướng tiếp cận (đã chọn)

**Port module `tenant` từ master-seo `master-data-service` vào hrm `config-service`, thêm route
`/master-data` ở gateway trỏ về config-service.**

Lý do chọn (so với "repoint FE sang `/config/...`"): giữ FE identical với kế toán (đúng yêu cầu),
chỉ đụng backend + gateway; `tenantService` còn được dùng ở chỗ khác (glossary trong
`TableTitleSettings`, dashboard config) nên khôi phục full module tránh 404 rải rác.

### 3.1 Gateway

Thêm 1 route vào `environment.ts`:

```ts
{ pathPrefix: '/master-data', service: 'config', stripPrefix: true }
```

→ `/master-data/tenants/:id/members` được strip thành `/tenants/:id/members` và forward sang
config-service. (Gateway đã nạp nhóm env `services` nên có `SERVICE_CONFIG_HOST/PORT`.)

### 3.2 config-service: thêm `tenant` module

Port 3 file từ master-seo `apps/master-data-service/src/tenant/` sang
`apps/config-service/src/tenant/`:

- `tenant.controller.ts` — `@Controller('tenants')`, các route: tenant CRUD, `/users`,
  `current/glossary`, `current/dashboard`, và `:id/members[...]`. Giữ nguyên guard
  (`JwtGuard` + `SuperAdminGuard`/`TenantAdminGuard`/`AdminGuard`) — **hrm đã có đủ các guard này**.
- `tenant.service.ts` — proxy toàn bộ thao tác identity qua `IdentityClient` (đã có sẵn đủ method:
  `listTenants/createTenant/updateTenant/deleteTenant/listMembers/addMember/updateMember/
  removeMember/listUsers/updateUser/resetPassword`) + đọc/ghi `AppUserRole`, `TenantAppConfig`
  trong DB `nhan_su`; RAW repo `VaiTro`, `PhanQuyen` cho `ensureAdminRole`.
- `tenant.module.ts` — `DatabaseModule.forFeatureRaw([VaiTro, PhanQuyen])`,
  `DatabaseModule.forFeature([AppUserRole, TenantAppConfig])`, `ServiceClientModule.forRoot()`.

Đăng ký `TenantModule` trong `config-service.module.ts`.

### 3.3 Điều chỉnh cho hrm (khác kế toán)

- **Bỏ phụ thuộc `Nganh`** (entity này không tồn tại trong hrm). Hàm `cloneGlossaryFromNganh`
  rút gọn: luôn trả `{}` (app HR chưa có template glossary theo ngành). Bỏ RAW repo `Nganh` khỏi
  module + constructor.
- `TenantAppConfig.modules` mặc định: giữ giá trị hiện có của entity hrm (không hard-code
  `['KE_TOAN']` như kế toán). Kiểm tra default của entity khi implement; nếu cần đặt `[]`.
- Các phần còn lại port nguyên trạng.

### 3.4 Env wiring (bắt buộc)

- **Local:** sửa script `start:config` và `start:config:dev` trong `be/package.json` thành
  `env-cmd -e config,db,jwt,services` để config-service có `SERVICE_IDENTITY_URL`.
  (Cách thay thế: thêm `SERVICE_IDENTITY_URL` vào nhóm `config` trong `.env-cmdrc` — chọn 1,
  spec dùng cách thêm nhóm `services` cho gọn.)
- **Deployed:** đảm bảo tiến trình config-service có biến môi trường `SERVICE_IDENTITY_URL`
  trỏ đúng identity production.

## 4. Danh sách file thay đổi

| File | Thay đổi |
|---|---|
| `be/apps/gateway/src/environments/environment.ts` | +1 route `/master-data` → config |
| `be/apps/config-service/src/tenant/tenant.controller.ts` | mới (port) |
| `be/apps/config-service/src/tenant/tenant.service.ts` | mới (port, bỏ Nganh) |
| `be/apps/config-service/src/tenant/tenant.module.ts` | mới (port, bỏ Nganh) |
| `be/apps/config-service/src/tenant/tenant.service.spec.ts` | mới (port test, bỏ Nganh) |
| `be/apps/config-service/src/config-service.module.ts` | import `TenantModule` |
| `be/package.json` | `start:config[:dev]` thêm nhóm `services` |

## 5. Interface / hành vi (giữ nguyên hợp đồng FE)

`tenantService` FE kỳ vọng các response (đã transform `_id`→`id`):

- `GET /master-data/tenants/:id/members` → `[{id,email,hoTen,role,isActive,membershipId}]`
- `POST /master-data/tenants/:id/members` (AddMemberDto) → `{user,role,isNew}`
- `PUT /master-data/tenants/:id/members/:userId` (role/isActive) → 200
- `PUT /master-data/tenants/:id/members/:userId/profile` → `{id,email,hoTen}`
- `POST /master-data/tenants/:id/members/:userId/reset-password` → `{defaultPassword}`
- `DELETE /master-data/tenants/:id/members/:userId` → 200
- `GET /master-data/tenants/users` → `[{id,email,hoTen}]`
- `GET|POST|PUT|DELETE /master-data/tenants[...]`, `current/glossary`, `current/dashboard`

`role` trả về là **vai trò chức năng** lấy từ `AppUserRole` (fallback membership role của identity) —
đây là chỗ nối "set quyền": gán user ↔ vai trò trong DB `nhan_su`.

## 6. Testing

- Port `tenant.service.spec.ts` (bỏ các case liên quan `Nganh`), chạy `yarn test` cho config-service.
- `yarn build` toàn BE để chắc không lỗi type sau khi bỏ `Nganh`.
- Smoke test routing: gọi gateway `GET /api/master-data/tenants/:id/members` với token hợp lệ →
  không còn 404 (trả 200/401/500 tuỳ identity), khác hẳn 404 hiện tại.
- **E2E thật** (list/add/xoá thành viên) cần identity-service chạy + có dữ liệu — không thuộc phạm vi
  verify local (identity không được dựng ở repo này); kiểm chứng cuối trên môi trường có identity.

## 7. Tiền đề để deploy hoạt động (ngoài code)

Để màn thành viên chạy trên `nhansu.masterceo.com.vn`, ngoài việc deploy code này cần đảm bảo
(theo CLAUDE.md #5):

1. config-service deployed có env `SERVICE_IDENTITY_URL` trỏ identity production.
2. App `nhan-su` đã đăng ký trong identity (`apps` + `tenant_apps` cho tenant liên quan) —
   dùng `ops/seed-nhan-su-app.ts`.
3. Domain `nhansu.masterceo.com.vn` nằm trong `CORS_ORIGINS` của identity.
4. Người đăng nhập là admin của tenant (guard `TenantAdminGuard`) hoặc superadmin.

## 8. Ngoài phạm vi (YAGNI)

- Không sửa/đụng FE.
- Không xoá `nguoiDungService.ts` / module `nguoi-dung` (đường proxy song song, để nguyên).
- Không thêm template glossary theo ngành (Nganh) cho HR.
- Không tự deploy production (không có quyền truy cập) — cung cấp hướng dẫn ở §7.
