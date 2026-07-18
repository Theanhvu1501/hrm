# HRM (nhan-su) — Base tái sử dụng + Phase 1 Design

> Trạng thái: **Draft chờ duyệt**. Ngày: 2026-07-18.
> Nguồn yêu cầu: `hrm/Xây dựng hệ thống nhân sự.xlsx` (sheet "Module Chấm công").

## 1. Mục tiêu

Xây app HRM `nhan-su` như một **app con thứ 3** trong platform `masterceo.com.vn` (sau `ke-toan` = master-seo, `giao-viec` = task-management), bằng cách:

1. **Fork base từ master-seo** — giữ nguyên layout (sidebar/header), SSO, và các chức năng nền tảng: **phân quyền, vai trò, thành viên, tenant**. Bỏ toàn bộ nghiệp vụ kế toán.
2. **Copy `libs/auth` nguyên khối** vào hrm (giữ import `@app/auth` như master-seo). KHÔNG tách package dùng chung ở giai đoạn này — ưu tiên an toàn, không đụng gì tới master-seo production.
3. Sau khi base chạy end-to-end trong hrm, làm nghiệp vụ HRM theo thứ tự: **Hồ sơ Nhân sự → Chấm công → Đào tạo & Phát triển**.
4. Chốt base thành khuôn mẫu (`app-starter`) để "sinh app mới" lần sau chỉ việc copy + đổi domain.

**Quyết định đã chốt** (qua brainstorm): Base = *Fork & strip, copy libs/auth nguyên khối (không tách package)*; MVP = *Base khung + Hồ sơ Nhân sự*; định danh = `nhan-su`.

## 2. Định danh & hạ tầng app

| Hạng mục | Giá trị |
|---|---|
| `appId` (bảng `apps` trong identity) | `nhan-su` |
| FE URL / subdomain | `https://nhan-su.masterceo.com.vn` |
| DB riêng của app | `nhan_su` (MongoDB) — app tự sở hữu, không đụng `masterceo_identity` |
| Cookie SSO | dùng chung `mc_session` trên `.masterceo.com.vn` (đã có sẵn) |
| Đăng ký vào identity | thêm 1 row `App{appId:'nhan-su', name:'Nhân sự', feUrl}` + cấp `tenant_apps` cho tenant; thêm subdomain vào `CORS_ORIGINS` của identity-service |

Việc đăng ký app trong identity chỉ là **data + 1 dòng CORS** — không sửa code identity-service.

## 3. Kiến trúc tổng thể

```
identity-service (SSO/IdP)  — không đổi code, chỉ thêm data app + CORS
        │  phát hành JWT (mc_session, shared cookie .masterceo.com.vn)
        ▼
  ┌───────────────┬──────────────────┬────────────────────┐
  ke-toan          giao-viec           nhan-su (MỚI)
  (master-seo)     (task-management)   (hrm — fork từ master-seo)
  DB digital_book  DB task...          DB nhan_su
  libs/auth        (auth riêng)        libs/auth (copy từ master-seo)
```

- Mỗi app **verify access token local** (không gọi identity mỗi request), tự nạp RBAC từ DB của chính nó — đúng mô hình `sso-decoupling` của master-seo.
- hrm dùng bản **copy `libs/auth`** của riêng nó (import `@app/auth`). Chấp nhận việc nhân bản để đổi lấy an toàn tuyệt đối cho master-seo; nếu sau này số app tăng và auth drift thành vấn đề, mới tính tách package (đã ghi ở §10).

## 4. Base fork từ master-seo

### 4.1 GIỮ LẠI (base tái dùng)

**Backend (`be/`):**
- `apps/gateway` — API gateway
- `apps/auth-service` — login/session/select-tenant (đã tích hợp SSO identity)
- `apps/config-service` — modules nền tảng: `nguoi-dung` (thành viên), `phan-quyen`, `vai-tro`
- `libs/auth` — **copy nguyên khối**, giữ import `@app/auth` (xem §5)
- `libs/core`, `libs/database`, `libs/dto`, `libs/service-client`
- `libs/entities` — chỉ giữ nhánh nền tảng: `auth/`, `config/`, `tenant/`, `menu-catalog/`. **Bỏ** `voucher`, `payable`, `tax`, `kho`, `mam-non`, `master-data`, `linh-vuc`, `nganh`.

**Frontend (`fe/`):**
- `components/layout/` — `MainLayout` (sidebar + header), `AppSwitcher`, `TenantSwitcher`
- `pages/cau-hinh/` — `phan-quyen`, `vai-tro`, `thanh-vien`, `tenant`
- `common/c-handler` (state framework), `components/ui` (shadcn), `contexts/AuthContext`, `components/ProtectedRoute`, `NavLink`
- `pages/auth`, `pages/profile`, `ComingSoon/NotFound/PlaceholderPage`

### 4.2 BỎ ĐI (nghiệp vụ kế toán)

- BE apps: `cash-book-service`, `voucher-service`, `payable-service`, `reporting-service`, `tax-service`, `kho-service`, `mam-non-service`, `master-data-service`
- FE pages: `chung-tu`, `so-quy`, `cong-no`, `bao-cao`, `thue`, `kho`, `bep-an`, `danh-muc`, `trung-tam-du-lieu`, `thu-vien`, `dashboard` (thay bằng dashboard HRM sau)
- Entities/DTO tương ứng; các mục sidebar kế toán trong config sidebar.

### 4.3 Đổi tên & cấu hình

- Đổi `CLAUDE.md`, `package.json` name, ports (tránh trùng khi chạy song song local), `.env-cmdrc` (DB `nhan_su`, `appId=nhan-su`), branding sidebar/header.
- Sidebar rút gọn còn: **Cấu hình** (Phân quyền / Vai trò / Thành viên / Tenant) + placeholder cho các phân hệ HRM sắp làm.

## 5. Auth: copy `libs/auth` nguyên khối

**Cách làm:** copy nguyên `master-seo/be/libs/auth` sang `hrm/be/libs/auth`, giữ path alias `@app/auth`. Bao gồm guards (`jwt`, `permission`, `role`, `tenant-active`, `tenant-admin`, `module`, `admin`, `super-admin`, `temp-token`), decorators (`current-user`, `permissions`, `roles`, `auth-token`), `authz-loader.service`, interfaces `decoded-token`.

**Lý do (chốt bởi chủ dự án):** không tách package dùng chung ở giai đoạn này. Ưu tiên **an toàn tuyệt đối** — không thay đổi bất kỳ dòng nào của master-seo, không thêm hạ tầng phân phối package. Đổi lại chấp nhận nhân bản code auth giữa các app.

> Ghi chú: identity hiện dùng HS256 shared secret → hrm verify HS256 giống hệt master-seo. Khi platform lên RS256/JWKS, sửa ở từng app (hoặc lúc đó mới tách package — xem §10).

## 6. Miền nghiệp vụ HRM

### 6.1 Phân hệ & chức năng (từ Excel)

- **Chấm công** (6 cn): Cấu hình ca; Địa điểm chấm công (GPS/Wifi/QR); Check-in/out (ảnh khuôn mặt); Đơn giải trình quên chấm công; Đơn làm thêm giờ (OT); Tổng hợp bảng công (batch).
- **Hồ sơ Nhân sự** (6 cn): Onboarding (CCCD/MST, tạo Employee ID); Hợp đồng lao động (merge template → PDF); Auto-sync sang Chấm công; Lương & Phúc lợi (C&B → Payroll); Quá trình công tác & đánh giá (versioning, điều chuyển/tăng lương); Thôi việc/Bàn giao.
- **Đào tạo & Phát triển**: *chưa có đặc tả* → brainstorm riêng khi có yêu cầu.

### 6.2 Đặc điểm kỹ thuật cần lưu ý (khác kế toán)

- **Mobile/real-time**: check-in GPS/Wifi/QR + nhận diện khuôn mặt; xử lý offline; chống fake GPS. (Nặng — nằm ở P3.)
- **Batch job**: tổng hợp bảng công (so khớp log vs ca chuẩn). (P3.)
- **Workflow duyệt đơn** (Pending→Approved/Rejected) + notify quản lý trực tiếp. (Dùng lại được cho giải trình/OT/thôi việc.)
- **Versioning** lịch sử nhân sự; **prorated** lương khi thay đổi giữa kỳ.
- **Tích hợp nội bộ**: HĐLĐ kích hoạt → Chấm công; C&B → Payroll (Payroll chưa có → **stub interface**).

## 7. Lộ trình (mỗi phase = 1 spec + plan + nghiệm thu riêng)

- **P1 — Base khung** (spec này): fork + strip + copy `libs/auth` + đăng ký app trong identity + subdomain + verify login SSO và 4 màn cấu hình (Phân quyền/Vai trò/Thành viên/Tenant) chạy trong hrm.
- **P2 — Hồ sơ Nhân sự** (spec riêng kế tiếp): Employee master record + Onboarding + HĐLĐ + Quá trình công tác (versioning) + Thôi việc. Các tích hợp xuống Chấm công/Payroll để **hook/stub** (target chưa tồn tại).
- **P3 — Chấm công**: ca, địa điểm, check-in/out, đơn từ, batch bảng công. Kích hoạt integration từ Hồ sơ NS.
- **P4 — Đào tạo & Phát triển**: sau khi có đặc tả.

**Phạm vi P2 (MVP nghiệp vụ):** trọng tâm là *Hồ sơ điện tử nhân viên* (Master Record) làm dữ liệu gốc mà Chấm công phụ thuộc. Không làm live-integration ở P2 vì Chấm công/Payroll chưa tồn tại — chỉ định nghĩa interface + để trạng thái sync là stub.

## 8. Kiểm thử

- Tái dùng hạ tầng test của master-seo (Jest BE, Playwright e2e FE).
- P1 nghiệm thu: login qua SSO identity → vào nhan-su → CRUD được Vai trò/Thành viên/Phân quyền trên DB `nhan_su`; guard chặn đúng theo quyền; `libs/auth` (bản copy) verify token pass unit test.
- Mỗi task kết thúc bằng test xanh + 1 commit (theo chuẩn plan sso-decoupling).

## 9. Kết quả phụ: `app-starter`

Sau P1, chụp lại trạng thái base (hrm sau khi strip, chưa có nghiệp vụ) làm **template `app-starter`** + checklist "sinh app mới": (1) copy khung (gồm cả `libs/auth`), (2) đổi appId/subdomain/DB, (3) đăng ký `App` trong identity + CORS. Đây chính là "1 base tái sử dụng" bạn muốn.

## 10. Câu hỏi mở / hoãn quyết định

- Cơ chế nhận diện khuôn mặt (on-device vs service) — quyết ở P3.
- Payroll: tích hợp app kế toán hay module riêng — quyết trước P2 khi làm C&B (nhưng P2 chỉ cần stub).
- Tách package auth dùng chung: **hoãn vô thời hạn**; chỉ tính lại nếu số app tăng và việc auth bị nhân bản trở thành gánh nặng bảo trì thực sự.
- hrm hiện chưa phải git repo → sẽ `git init` khi bắt đầu fork; sau đó commit spec này.
