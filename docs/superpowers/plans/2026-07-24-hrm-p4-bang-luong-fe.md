# P4 (A+B) — Bảng lương FRONTEND: Hồ sơ NV + Cấu hình lương + Bảng lương — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Chạy SAU khi Plan Backend (`…-bang-luong-be.md`) đã xong** (API `/config/bang-luong` + `/config/cau-hinh-luong` sống).

**Goal:** Màn admin cho phân hệ Bảng lương: (1) Hồ sơ NV thêm tab "Lương"; (2) màn **Cấu hình lương** sửa **động** mọi khoản lương + bậc thuế + hằng số; (3) màn **Bảng lương** — chọn kỳ → Tổng hợp → hai bảng Khai báo/Thực tế, sửa ô biến động, chốt kỳ.

**Architecture:** React + Vite + antd v6, pattern **CHandler/RxJS** (xem `fe/HANDLER_GUIDE.md`), sao khuôn từ `fe/src/pages/cham-cong/ngay-le/` (list+modal) và `fe/src/pages/cham-cong/bang-cong/` (grid + ô sửa tại chỗ dạng Popover). Service kế thừa `ServiceBase`, endpoint `/config/...`.

**Tech Stack:** React 18, antd v6, react-hook-form, Vitest. Node 22, npm (chạy ở `fe/`). Spec: `docs/superpowers/specs/2026-07-24-hrm-p4-bang-luong-A-B-design.md`.

## Global Constraints

- Chạy ở `fe/`, Node 22: `cd /Users/os_anhvt/Documents/Dino/hrm/fe && export PATH="/Users/os_anhvt/.nvm/versions/node/v22.0.0/bin:$PATH"`. Test 1 file: `npx vitest run <path>`. Full: `npx vitest run` (**không được làm hỏng ~500 test hiện có**). Build: `npm run build`. Repo root: `/Users/os_anhvt/Documents/Dino/hrm`.
- **CHandler**: mỗi màn = `Handler` (extends `CHanlder`, `super("<ctx>-context")`) + `HandlerContext` (Provider + `useXHandler`/`useXState`) + `Page` (bọc Provider, `init` trong `useEffect`) + `sub-handler/` (`@RegisterHandler` + `@HandlerDecorator("event")`) + `components/`. Event/State khai bằng module augmentation trong `*.event.ts`/`*.state.ts`. **Sao khuôn `fe/src/pages/cham-cong/ngay-le/` từng file**, đổi tên context/entity.
- Service map `/config/<slug>` khớp `@Controller('<slug>')` của BE. Quyền màn: `usePagePermission('/luong/...')`; route bọc `<ProtectedRoute requiredPermission="/luong/...:xem">`.
- antd v6: modal bo góc/nút do hệ CSS lo; dùng `apiErrorMessage(err, fallback)` từ `@/config/api` cho lỗi. Number field: `InputNumber`; cờ boolean: antd `Checkbox` (theo repo).
- Commit sau mỗi task, cuối message:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: Hồ sơ NV — thêm nhóm "Lương"

**Files:**
- Modify: `fe/src/services/employeeService.ts` (thêm trường lương vào `Employee`, `CreateEmployeeDto`, `transform`)
- Modify: `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/HoSoNhanVienForm.state.ts` (thêm field vào `HoSoNhanVienFormValues`)
- Modify: `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/HoSoNhanVienForm.tsx` (DEFAULT_VALUES + toFormValues + đăng ký tab)
- Modify: `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/hoSoNhanVienForm.convert.ts` (map field mới → DTO)
- Create: `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/tabs/LuongTab.tsx`
- Test: `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/hoSoNhanVienForm.convert.test.ts` (đã có → thêm ca)

**Interfaces:**
- Produces: `Employee` + `CreateEmployeeDto` có `luongThoaThuan:number`, `mucKhaiBao?:number`, `phuCapCoDinh:number`, `soNguoiPhuThuoc:number`, `dongBH:boolean`, `thoiVu:boolean`, `camKet:boolean`.

- [ ] **Step 1: `employeeService.ts`** — thêm vào interface `Employee` và `CreateEmployeeDto` (mirror nhau) các trường trên. Trong `transform(x)` thêm (theo mẫu `??` để 0/false không bị mất):
```ts
luongThoaThuan: (x.luongThoaThuan as number) ?? 0,
mucKhaiBao: x.mucKhaiBao as number | undefined,
phuCapCoDinh: (x.phuCapCoDinh as number) ?? 0,
soNguoiPhuThuoc: (x.soNguoiPhuThuoc as number) ?? 0,
dongBH: (x.dongBH as boolean) ?? false,
thoiVu: (x.thoiVu as boolean) ?? false,
camKet: (x.camKet as boolean) ?? false,
```

- [ ] **Step 2: Form state** — thêm 7 field trên vào `HoSoNhanVienFormValues` (`HoSoNhanVienForm.state.ts`), kiểu `number`/`number|undefined`/`boolean`.

- [ ] **Step 3: `LuongTab.tsx`** — tab lương (InputNumber tiền VND + Checkbox cờ):
```tsx
import { Controller, useFormContext } from "react-hook-form";
import { InputNumber, Checkbox, Row, Col, Form } from "antd";
import type { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";

const tien = {
  style: { width: "100%" } as const,
  min: 0,
  step: 100000,
  formatter: (v?: number | string) =>
    `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  parser: (v?: string) => Number((v ?? "").replace(/,/g, "")) as unknown as number,
};

export function LuongTab() {
  const { control } = useFormContext<HoSoNhanVienFormValues>();
  return (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Lương thỏa thuận (thực nhận)">
          <Controller name="luongThoaThuan" control={control}
            render={({ field }) => <InputNumber {...tien} {...field} />} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Mức lương khai báo" tooltip="Bỏ trống = dùng mức mặc định trong Cấu hình lương (5.5tr)">
          <Controller name="mucKhaiBao" control={control}
            render={({ field }) => <InputNumber {...tien} {...field} />} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Phụ cấp cố định / tháng" tooltip="Xăng xe, điện thoại, chuyên cần… gộp một số">
          <Controller name="phuCapCoDinh" control={control}
            render={({ field }) => <InputNumber {...tien} {...field} />} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Số người phụ thuộc">
          <Controller name="soNguoiPhuThuoc" control={control}
            render={({ field }) => <InputNumber style={{ width: "100%" }} min={0} {...field} />} />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Controller name="dongBH" control={control}
          render={({ field }) => <Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)}>Đóng BHXH</Checkbox>} />
        {"  "}
        <Controller name="thoiVu" control={control}
          render={({ field }) => <Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)}>HĐ thời vụ (khấu trừ 10%)</Checkbox>} />
        {"  "}
        <Controller name="camKet" control={control}
          render={({ field }) => <Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)}>Có cam kết (miễn khấu trừ)</Checkbox>} />
      </Col>
    </Row>
  );
}
```

- [ ] **Step 4: Đăng ký tab + default + toFormValues** — trong `HoSoNhanVienForm.tsx`:
  - import `LuongTab`, thêm `{ key: "luong", label: "Lương", children: <LuongTab /> }` vào mảng `items`.
  - `DEFAULT_VALUES`: `luongThoaThuan:0, mucKhaiBao:undefined, phuCapCoDinh:0, soNguoiPhuThuoc:0, dongBH:false, thoiVu:false, camKet:false`.
  - `toFormValues(emp)`: map 7 trường với `?? default` (mirror `choPhepChamNgoaiVung`).

- [ ] **Step 5: convert** — trong `hoSoNhanVienForm.convert.ts` (`toCreateEmployeeDto`), thêm 7 trường vào DTO trả về.

- [ ] **Step 6: Test convert** — thêm ca vào `hoSoNhanVienForm.convert.test.ts`: form có `luongThoaThuan:15000000, dongBH:true, soNguoiPhuThuoc:2` → DTO chứa đúng các giá trị; `mucKhaiBao` undefined → không ép thành 0.

- [ ] **Step 7: Chạy test + build** — `cd fe && npx vitest run src/pages/nhan-su/ho-so-nhan-vien/components/form/hoSoNhanVienForm.convert.test.ts && npm run build 2>&1 | tail -5`. Expected: PASS + build OK.

- [ ] **Step 8: Commit**
```bash
cd /Users/os_anhvt/Documents/Dino/hrm
git add fe/src/services/employeeService.ts fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/
git commit -m "feat(fe): Hồ sơ NV thêm tab Lương (thỏa thuận/khai báo/phụ cấp/NPT/cờ BH-thời vụ-cam kết)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Services + types (`cauHinhLuongService`, `bangLuongService`)

**Files:**
- Create: `fe/src/services/cauHinhLuongService.ts`
- Create: `fe/src/services/bangLuongService.ts`

**Interfaces:**
- Produces:
  - types `KhoanLuong`, `BacThue`, `CauHinhLuong`, `DongLuong`, `KetQuaLuong` (mirror BE `luong.types.ts`).
  - `cauHinhLuongService.get(): Promise<CauHinhLuong>`, `.update(dto): Promise<CauHinhLuong>`.
  - `bangLuongService.danhSach(thang): Promise<DongLuong[]>`, `.tongHop(thang)`, `.capNhatDong(id, dto)`, `.chot(thang)`, `.moLai(thang)`.

- [ ] **Step 1: `cauHinhLuongService.ts`** — theo khuôn `holidayService.ts`:
```ts
import { ServiceBase } from "./base/service-base";

export type LoaiCongThuc =
  | "LUONG_THEO_CONG" | "DINH_MUC_x_CONG" | "CO_DINH_THANG" | "PHAN_TRAM_BASE" | "NHAP_THEO_KY";
export interface KhoanLuong {
  ma: string; ten: string; loaiCongThuc: LoaiCongThuc;
  thamSo: { dinhMuc?: number; soTien?: number; tyLe?: number; nguonHoSo?: "phuCapCoDinh" };
  chiuThue: boolean; tranMienThue: number | null; vaoTongThuNhap: boolean; vaoBHXH: boolean; thuTu: number;
}
export interface BacThue { den: number | null; suat: number; }
export interface CauHinhLuong {
  id?: string; mucKhaiBaoMacDinh: number; congChuan: number; khoanLuong: KhoanLuong[];
  giamTruBanThan: number; giamTruNPT: number;
  bhxh: { tyLe: number; canCu: "MUC_KHAI_BAO" | "LUONG_THOA_THUAN" };
  bacThue: BacThue[]; thuViec: { tyLe: number };
  quyTacThoiVu: { tyLe: number; nguong: number }; quyTacCamKet: { mienThue: boolean }; lamTron: number;
}

class CauHinhLuongService extends ServiceBase {
  constructor() { super({ endpoint: "/config/cau-hinh-luong" }); }
  async get(): Promise<CauHinhLuong> {
    const res = await super.get<Record<string, unknown>>({});
    return res as unknown as CauHinhLuong;
  }
  async update(dto: Partial<CauHinhLuong>): Promise<CauHinhLuong> {
    const res = await super.put<Record<string, unknown>>(dto, {});
    return res as unknown as CauHinhLuong;
  }
}
export const cauHinhLuongService = new CauHinhLuongService();
```
*(Kiểm tra chữ ký thật của `ServiceBase.get/put` — nếu cần `{endpoint:''}` để trỏ đúng base, chỉnh theo `holidayService.ts`. BE gateway map `/config/cau-hinh-luong` → controller `bang-luong` route `cau-hinh` hay controller riêng `cau-hinh-luong`: KHỚP với đường Task 6 BE — ở BE plan route là `bang-luong/cau-hinh`; nếu vậy endpoint FE = `/config/bang-luong` + path `cau-hinh`. Chốt đường dẫn cho khớp trước khi code.)*

- [ ] **Step 2: `bangLuongService.ts`** — types `KetQuaLuong`/`DongLuong` + service:
```ts
import { ServiceBase } from "./base/service-base";
export interface KetQuaLuong {
  giaTriTungKhoan: Record<string, number>;
  tongThuNhap: number; thuNhapMienThue: number; bhxh: number; giamTru: number;
  thuNhapTinhThue: number; thue: number; thucLinh: number;
}
export interface DongLuong {
  id: string; thang: string; employeeId: string; employeeName?: string; employeeCode?: string;
  congThuong: number; congThuViec: number; congKhac: number;
  luongThoaThuan: number; mucKhaiBao: number; phuCapCoDinh: number; soNguoiPhuThuoc: number;
  dongBH: boolean; thoiVu: boolean; camKet: boolean; tamUng: number; khauTruKhac: number;
  nhapTheoKy: Record<string, number>;
  khaiBao: KetQuaLuong; thucTe: KetQuaLuong; trangThai: string;
}
class BangLuongService extends ServiceBase {
  constructor() { super({ endpoint: "/config/bang-luong" }); }
  async danhSach(thang: string): Promise<DongLuong[]> {
    const res = await super.get<Array<Record<string, unknown>>>({ params: { thang } });
    return res.map((x) => ({ ...(x as unknown as DongLuong), id: (x._id ?? x.id) as string }));
  }
  async tongHop(thang: string) { return super.post({ thang }, { endpoint: "/tong-hop" }); }
  async capNhatDong(id: string, dto: Partial<Pick<DongLuong, "nhapTheoKy" | "tamUng" | "khauTruKhac">>) {
    return super.patch(dto, { endpoint: `/${id}` });
  }
  async chot(thang: string) { return super.post({ thang }, { endpoint: "/chot" }); }
  async moLai(thang: string) { return super.post({ thang }, { endpoint: "/mo-lai" }); }
}
export const bangLuongService = new BangLuongService();
```
*(Chỉnh chữ ký `post/patch/get` cho khớp `ServiceBase` thật — xem `attendanceRecordService.ts` cách override `endpoint`/`params`.)*

- [ ] **Step 3: Build** — `cd fe && npm run build 2>&1 | tail -5`. Expected: OK (chưa dùng cũng không lỗi type).

- [ ] **Step 4: Commit**
```bash
cd /Users/os_anhvt/Documents/Dino/hrm
git add fe/src/services/cauHinhLuongService.ts fe/src/services/bangLuongService.ts
git commit -m "feat(fe): service + type cấu hình lương & bảng lương

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Màn Cấu hình lương (config động) + route + gear-menu

**Files:**
- Create thư mục `fe/src/pages/luong/cau-hinh-luong/` theo khuôn `ngay-le/`: `cauHinhLuongHandler.ts`, `CauHinhLuongHandlerContext.tsx`, `CauHinhLuongPage.tsx`, `sub-handler/{index.ts,init/*,luu/*}`, `components/{KhoanLuongEditor.tsx, BacThueEditor.tsx, HangSoEditor.tsx}`.
- Modify: `fe/src/pages/loadable.tsx` (export `CauHinhLuongPage`), `fe/src/App.tsx` (route dưới `/cau-hinh`), `fe/src/config/routePermissions.ts`, `fe/src/components/layout/MainLayout.tsx` (gear-menu).

**Interfaces:**
- Consumes: `cauHinhLuongService` (Task 2).
- Produces: màn sửa toàn bộ `CauHinhLuong` (danh sách khoản + bậc thuế + hằng số), lưu qua `.update`.

- [ ] **Step 1: CHandler skeleton** — sao `ngay-le/` → `luong/cau-hinh-luong/`, đổi context `"cau-hinh-luong-context"`, states: `cauHinh: CauHinhLuong|null`, `dangTai:boolean`, `dangLuu:boolean`. Events: `init` (gọi `cauHinhLuongService.get()` → set `cauHinh`), `luu` (params `{cauHinh}` → `.update` → set lại + `message.success`). (Theo `HANDLER_GUIDE.md` + `sub-handler/init` & `crud` của ngay-le.)

- [ ] **Step 2: `KhoanLuongEditor.tsx`** — bảng sửa danh sách khoản: mỗi dòng có `ten`, `Select loaiCongThuc`, tham số theo loại (InputNumber `dinhMuc`/`soTien`/`tyLe`), `Checkbox chiuThue`, `InputNumber tranMienThue` (cho null = để trống), `Checkbox vaoTongThuNhap`; nút Thêm/Xoá khoản; kéo thứ tự bằng `thuTu` (nút lên/xuống). Sửa mảng `cauHinh.khoanLuong` trong state (không gọi API tới khi bấm Lưu).

- [ ] **Step 3: `BacThueEditor.tsx`** — bảng bậc thuế: mỗi bậc `InputNumber den` (bậc cuối để trống = ∞) + `InputNumber suat` (nhập %, lưu 0..1); Thêm/Xoá bậc. Cảnh báo nếu `den` không tăng dần.

- [ ] **Step 4: `HangSoEditor.tsx`** — form các hằng số còn lại: `mucKhaiBaoMacDinh`, `congChuan`, `giamTruBanThan`, `giamTruNPT`, `bhxh.tyLe` + `Select bhxh.canCu`, `thuViec.tyLe`, `quyTacThoiVu.{tyLe,nguong}`, `quyTacCamKet.mienThue` (Checkbox), `lamTron`.

- [ ] **Step 5: `CauHinhLuongPage.tsx`** — bọc Provider; `init` khi mount; layout: `Tabs`/`Card` gồm 3 editor + nút **Lưu cấu hình** (fire `luu`), nút chỉ bật khi `usePagePermission("/luong/cau-hinh").canEdit`. Loading dùng spinner sẵn có.

- [ ] **Step 6: Đấu route + menu**:
  - `loadable.tsx`: `export const CauHinhLuongPage = loadable(() => import("./luong/cau-hinh-luong/CauHinhLuongPage"), { fallback: <PageLoader/> });`
  - `App.tsx`: dưới `<Route path="cau-hinh">` thêm `<Route path="cau-hinh-luong" element={<ProtectedRoute requiredPermission="/luong/cau-hinh:xem"><CauHinhLuongPage/></ProtectedRoute>} />` + import tên.
  - `routePermissions.ts`: `'/cau-hinh/cau-hinh-luong': '/luong/cau-hinh:xem'` (path route khác key quyền — đặt đúng cặp).
  - `MainLayout.tsx`: thêm mục gear-menu "Cấu hình lương" (`hasPermission('/luong/cau-hinh:xem') || user?.isSuperAdmin` → navigate `/cau-hinh/cau-hinh-luong`) và thêm điều kiện vào `canManageConfig`.

- [ ] **Step 7: Test + build** — thêm 1 render test nhẹ (mount page với service mock trả cấu hình seed → thấy tên khoản "Ăn ca" + bậc thuế) nếu khả thi; tối thiểu `npm run build` OK + `npx vitest run` không hỏng suite.

- [ ] **Step 8: Commit**
```bash
cd /Users/os_anhvt/Documents/Dino/hrm
git add fe/src/pages/luong/cau-hinh-luong/ fe/src/pages/loadable.tsx fe/src/App.tsx fe/src/config/routePermissions.ts fe/src/components/layout/MainLayout.tsx
git commit -m "feat(fe): màn Cấu hình lương config động (khoản lương + bậc thuế + hằng số)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Màn Bảng lương (2 bảng + tổng hợp + sửa ô + chốt) + route + sidebar

**Files:**
- Create thư mục `fe/src/pages/luong/bang-luong/` theo khuôn `bang-cong/`: `bangLuongHandler.ts`, `BangLuongHandlerContext.tsx`, `BangLuongPage.tsx`, `sub-handler/{index.ts,init,tong-hop,cap-nhat,chot}`, `components/{ThanhKy.tsx, BangLuongTable.tsx, OSuaBienDong.tsx}`.
- Modify: `fe/src/pages/loadable.tsx`, `fe/src/App.tsx`, `fe/src/config/routePermissions.ts`, `fe/src/components/layout/MainLayout.tsx` (sidebar).

**Interfaces:**
- Consumes: `bangLuongService` (Task 2).
- Produces: màn chọn tháng → Tổng hợp → 2 tab (Khai báo/Thực tế) lưới NV × cột kết quả; sửa ô biến động (nhập theo kỳ/tạm ứng); chốt/mở kỳ.

- [ ] **Step 1: CHandler skeleton** — sao `bang-cong/` → `luong/bang-luong/`, context `"bang-luong-context"`. States: `thang:string` (mặc định tháng hiện tại), `danhSach: DongLuong[]`, `dangTai`, `dangTongHop`, `tabDangXem: 'khaiBao'|'thucTe'`, `daChot:boolean`. Events: `init`/`doiThang` (gọi `danhSach(thang)`), `tongHop` (gọi `.tongHop` rồi tải lại), `capNhatDong` (params `{id, dto}` → `.capNhatDong` → patch dòng trong state), `chot`/`moLai`.

- [ ] **Step 2: `ThanhKy.tsx`** — chọn tháng (antd `DatePicker picker="month"` hoặc nút ‹ ›), nút **Tổng hợp** (`dangTongHop` loading), nhãn trạng thái kỳ (Nháp/Đã chốt), nút **Chốt kỳ**/**Mở lại** (gate `usePagePermission("/luong/bang-luong").canEdit`), toggle 2 tab Khai báo/Thực tế.

- [ ] **Step 3: `BangLuongTable.tsx`** — antd `Table`, cột theo `tabDangXem`:
  - Cố định: Mã NV, Họ tên, Chức vụ, Công (thường/thử việc).
  - Từ `dong[tab]` (KetQuaLuong): các khoản (`giaTriTungKhoan`), Tổng thu nhập, BHXH, TN miễn thuế, Giảm trừ, TN tính thuế, **Thuế**, **Thực lĩnh**. Định dạng tiền (dấu phẩy ngàn), `font-variant-numeric: tabular-nums`.
  - Dòng tổng cuối bảng (Σ thực lĩnh, Σ thuế).
  - Cột "khoản biến động" (Hiệu suất/Thưởng/Tạm ứng) là **ô sửa tại chỗ** khi kỳ chưa chốt: dùng khuôn Popover của `bang-cong` `RowNoteEditor.tsx` → `OSuaBienDong.tsx` (InputNumber trong Popover, `onSave` fire `capNhatDong`). Kỳ đã chốt → chỉ đọc.
  - Cảnh báo dòng thiếu công/thiếu lương thỏa thuận (icon vàng).

- [ ] **Step 4: `BangLuongPage.tsx`** — bọc Provider, `init` mount, render `<ThanhKy/>` + `<BangLuongTable/>`; rỗng (chưa tổng hợp) → nút Tổng hợp lớn giữa màn.

- [ ] **Step 5: Đấu route + sidebar**:
  - `loadable.tsx`: `export const BangLuongPage = loadable(() => import("./luong/bang-luong/BangLuongPage"), {fallback:<PageLoader/>});`
  - `App.tsx`: thêm nhóm `<Route path="luong"><Route path="bang-luong" element={<ProtectedRoute requiredPermission="/luong/bang-luong:xem"><BangLuongPage/></ProtectedRoute>} /></Route>` + import.
  - `routePermissions.ts`: `'/luong/bang-luong': '/luong/bang-luong:xem'`.
  - `MainLayout.tsx` sidebar: nhóm mới `"LƯƠNG"` (hoặc trong "CHẤM CÔNG") mục `{ key:'/luong/bang-luong', icon:<DollarOutlined/>, label:'Bảng lương' }`, gate `canViewBangLuong = hasPermission('/luong/bang-luong:xem') || user?.isSuperAdmin`.

- [ ] **Step 6: Test + build** — render test nhẹ (mount với service mock trả 1 dòng → thấy thực lĩnh khai báo & thực tế khác nhau khi đổi tab) nếu khả thi; tối thiểu `npm run build` OK + `npx vitest run` không hỏng suite.

- [ ] **Step 7: Commit**
```bash
cd /Users/os_anhvt/Documents/Dino/hrm
git add fe/src/pages/luong/bang-luong/ fe/src/pages/loadable.tsx fe/src/App.tsx fe/src/config/routePermissions.ts fe/src/components/layout/MainLayout.tsx
git commit -m "feat(fe): màn Bảng lương — tổng hợp kỳ, 2 bảng khai báo/thực tế, sửa ô biến động, chốt

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Kiểm thử tổng (sau Task 4)
- `cd fe && npm run build` OK; `npx vitest run` toàn xanh (≥ suite hiện tại).
- QA thủ công sau deploy (cần BE + quyền module `/luong/*` đã grant):
  - Hồ sơ NV: nhập lương thỏa thuận/khai báo/NPT/cờ → lưu.
  - Cấu hình lương: đổi một bậc thuế / bật-tắt chịu thuế ăn ca → Lưu.
  - Bảng lương: chọn tháng → Tổng hợp → 2 tab hiện số; sửa Hiệu suất một dòng → thực lĩnh đổi; Chốt kỳ → ô khoá.

## Ghi chú
- **Khớp đường dẫn API** với BE plan trước khi code service (Task 2): route cấu hình là `bang-luong/cau-hinh` hay controller `cau-hinh-luong` riêng — thống nhất một kiểu.
- **Grid tiền**: tái dùng helper định dạng số hiện có nếu có (`fe/src/ultils`), tránh viết lại.
- Đây là 2 màn admin lớn theo pattern CHandler — bám sát `ngay-le/` (form) và `bang-cong/` (grid + ô Popover) để không lệch khuôn.

## Self-review (đối chiếu spec §3.2/§7)
- §3.2 Hồ sơ NV trường lương → Task 1. §7 màn Cấu hình lương (sửa khoản + bậc + hằng số, config động) → Task 3. §7 màn Bảng lương (2 tab, sửa ô biến động, chốt) → Task 4. Service/type → Task 2. Route/menu/quyền → Task 3+4. Không placeholder ở phần domain (LuongTab, editor, grid có code/đặc tả cụ thể); phần khung CHandler bám khuôn ngay-le/bang-cong đã chỉ rõ file + event/state.
