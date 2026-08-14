# Đơn làm việc online & ngày công online — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nhân viên nộp đơn "Làm việc online" cho một khoảng ngày (hoặc nửa buổi); đơn được duyệt thì ngày đó chấm công được từ bất kỳ đâu, bảng công hiện ký hiệu `OL` = 1 công, và ngày đó **không** được tính tiền ăn ca.

**Architecture:** Loại đơn thứ 5 (`lam_online`) dùng lại nguyên cấu trúc `attendance_requests` — không cột mới. Chấm công thêm một điều kiện thoát ở đúng chỗ chặn ngoài-bán-kính đã có. Bảng công chèn đúng một bậc vào thang ưu tiên của `suy-ky-hieu.ts`, sinh ký hiệu `OL`. Bảng lương **không sửa dòng nào** — `demNgayLamDu()` vốn chỉ đếm ô `X` nên `OL` tự rớt khỏi ăn ca.

**Tech Stack:** NestJS + TypeORM (MongoDB) ở `be/`, React + antd + CHandler ở `fe/`, Jest (BE) / Vitest (FE).

**Spec:** `docs/superpowers/specs/2026-08-14-hrm-don-lam-online-design.md`

## Global Constraints

- Nhánh: `feat/hrm-don-lam-online` (đã tạo từ `main`).
- Mã loại đơn: **`lam_online`** (không phải `online`/`wfh`). Ký hiệu bảng công: **`OL`**, nhãn **"Làm online"**, `soCong: 1`, `nhom: 'lam_viec'`.
- Nửa buổi online vẫn ra `OL` = **1 công** và **không** ăn ca. **Không** tạo ký hiệu riêng cho nửa buổi.
- Ngày online **không** tự phát công: không có bản ghi chấm vào thì ô để trống + `chua_xu_ly`.
- Đơn nghỉ **thắng** đơn online khi trùng ngày.
- Bản ghi ngày online: `laOnline: true`, `ngoaiVung: false`, `locationId`/`locationTen` bỏ trống, nhưng **vẫn lưu** `latitude`/`longitude`/`doChinhXacMet`/`ipAddress`/`deviceId`.
- Chỉ đơn `trangThai === 'da_duyet'` **và** `isActive !== false` mới có hiệu lực.
- **Không** sửa `be/apps/config-service/src/bang-luong/**`.
- BE chạy Node 22 (`cd be && nvm use v22.0.0`). Test BE: `cd be && yarn test`. Test FE: `cd fe && npm run test`.
- BE test **không type-check** (`isolatedModules`) — luôn `toStrictEqual` thay vì `toEqual` khi so object/mảng, và đừng tin test xanh là code đúng kiểu.
- FE `tsconfig` để `strict: false` — narrowing discriminated union không chạy, viết type guard tường minh khi cần.

---

### Task 1: Ký hiệu `OL` trong bảng ký hiệu chấm công

**Files:**
- Modify: `be/apps/config-service/src/bang-cong/cham-cong-ky-hieu.ts`
- Test: `be/apps/config-service/src/bang-cong/cham-cong-ky-hieu.spec.ts`

**Interfaces:**
- Consumes: —
- Produces: hằng `KY_HIEU_CHAM_CONG` có thêm phần tử `{ kyHieu: 'OL', nhan: 'Làm online', soCong: 1, nhom: 'lam_viec' }`; `soCongCuaKyHieu('OL') === 1`.

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối `cham-cong-ky-hieu.spec.ts`:

```ts
describe('ký hiệu OL (làm online)', () => {
  it('có mặt trong bảng ký hiệu, 1 công, nhóm làm việc', () => {
    const ol = KY_HIEU_CHAM_CONG.find((k) => k.kyHieu === 'OL');
    expect(ol).toStrictEqual({
      kyHieu: 'OL',
      nhan: 'Làm online',
      soCong: 1,
      nhom: 'lam_viec',
    });
  });

  it('soCongCuaKyHieu tính OL là 1 công', () => {
    expect(soCongCuaKyHieu('OL')).toBe(1);
  });
});
```

Nếu file spec chưa import `KY_HIEU_CHAM_CONG`/`soCongCuaKyHieu` thì bổ sung vào dòng import sẵn có ở đầu file (`from './cham-cong-ky-hieu'`).

- [ ] **Step 2: Chạy để chắc chắn test ĐỎ**

Run: `cd be && npx jest --config apps/config-service/jest.config.ts -t "ký hiệu OL"`
Expected: FAIL — `ol` là `undefined`.

(Nếu đường `--config` không đúng, dùng `cd be && yarn test --testPathPattern cham-cong-ky-hieu`.)

- [ ] **Step 3: Thêm ký hiệu**

Trong `KY_HIEU_CHAM_CONG`, chèn ngay **sau** dòng `CT` (công tác) — hai ký hiệu này cùng nhóm "có công nhưng không ăn cơm công ty":

```ts
  /**
   * Làm việc online (ở nhà) theo đơn `lam_online` đã duyệt. 1 công như X, và
   * cố ý KHÔNG được `demNgayLamDu()` bên bảng lương đếm ⇒ không có tiền ăn ca
   * — chủ sản phẩm chốt 2026-08-14. Nửa buổi online cũng dùng ký hiệu này:
   * nửa buổi vẫn là làm cả ngày (chỉ khác chỗ ngồi) nên vẫn 1 công, và cũng
   * không có suất ăn. Thêm một ký hiệu nửa buổi riêng chỉ để hiển thị là bắt
   * mọi nơi tính tiền học thuộc thêm một ngoại lệ mà không đổi một đồng nào.
   */
  { kyHieu: 'OL', nhan: 'Làm online', soCong: 1, nhom: 'lam_viec' },
```

- [ ] **Step 4: Chạy lại — XANH**

Run: `cd be && yarn test --testPathPattern cham-cong-ky-hieu`
Expected: PASS, và các test cũ của file vẫn xanh (chú ý test nào đếm `KY_HIEU_CHAM_CONG.length` — sửa số cho đúng).

- [ ] **Step 5: Commit**

```bash
git add be/apps/config-service/src/bang-cong/cham-cong-ky-hieu.ts be/apps/config-service/src/bang-cong/cham-cong-ky-hieu.spec.ts
git commit -m "feat(bang-cong): ký hiệu OL — làm online, 1 công, không ăn ca"
```

---

### Task 2: `suy-ky-hieu` sinh `OL` khi có đơn online + chấm công

**Files:**
- Modify: `be/apps/config-service/src/bang-cong/suy-ky-hieu.ts`
- Test: `be/apps/config-service/src/bang-cong/suy-ky-hieu.spec.ts`

**Interfaces:**
- Consumes: ký hiệu `OL` (Task 1).
- Produces: `SuyKyHieuInput` thêm trường `coDonOnline?: boolean`. `suyKyHieuNgay()` trả `kyHieu: 'OL'` khi `coDonOnline && coChamVao` và không bị các dòng trên chặn.

- [ ] **Step 1: Viết test đỏ**

Thêm vào `suy-ky-hieu.spec.ts` (dùng helper dựng input sẵn có trong file nếu có; nếu không, viết `input()` như dưới):

```ts
describe('đơn làm online', () => {
  const co = (patch: Partial<SuyKyHieuInput> = {}): SuyKyHieuInput => ({
    ngay: '2026-08-12', // thứ Tư
    laNgayLe: false,
    coChamVao: false,
    coChamRa: false,
    coBanGhiNgoaiVung: false,
    ...patch,
  });

  it('có đơn online + chấm đủ vào/ra → OL', () => {
    const kq = suyKyHieuNgay(co({ coDonOnline: true, coChamVao: true, coChamRa: true }));
    expect(kq.kyHieu).toBe('OL');
    expect(kq.canhBao).toStrictEqual([]);
    expect(kq.chuaXuLy).toBe(false);
  });

  it('có đơn online nhưng KHÔNG chấm công → ô trống, chưa xử lý', () => {
    const kq = suyKyHieuNgay(co({ coDonOnline: true }));
    expect(kq.kyHieu).toBeNull();
    expect(kq.chuaXuLy).toBe(true);
    expect(kq.canhBao).toContain(MA_CANH_BAO.CHUA_XU_LY);
  });

  it('có đơn online, chấm vào mà quên chấm ra → vẫn OL, kèm cảnh báo thiếu giờ ra', () => {
    const kq = suyKyHieuNgay(co({ coDonOnline: true, coChamVao: true }));
    expect(kq.kyHieu).toBe('OL');
    expect(kq.canhBao).toContain(MA_CANH_BAO.THIEU_GIO_RA);
  });

  it('đơn nghỉ thắng đơn online khi trùng ngày', () => {
    const kq = suyKyHieuNgay(
      co({
        coDonOnline: true,
        coChamVao: true,
        donNghi: { loaiDon: 'nghi_phep', loaiNghi: 'phep_nam', laNuaNgay: false },
      }),
    );
    expect(kq.kyHieu).toBe('P');
  });

  it('ngày lễ thắng đơn online', () => {
    const kq = suyKyHieuNgay(co({ coDonOnline: true, coChamVao: true, laNgayLe: true }));
    expect(kq.kyHieu).toBe('L');
  });

  it('ngày ngoài lịch tuần không thành OL', () => {
    const kq = suyKyHieuNgay(
      co({
        ngay: '2026-08-16', // Chủ nhật
        ngayLamViecTrongTuan: [1, 2, 3, 4, 5],
        coDonOnline: true,
        coChamVao: true,
      }),
    );
    expect(kq.kyHieu).toBeNull();
    expect(kq.canhBao).toContain(MA_CANH_BAO.LAM_NGOAI_LICH_TUAN);
  });

  it('không có đơn online → vẫn X như cũ', () => {
    const kq = suyKyHieuNgay(co({ coChamVao: true, coChamRa: true }));
    expect(kq.kyHieu).toBe('X');
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn ĐỎ**

Run: `cd be && yarn test --testPathPattern suy-ky-hieu`
Expected: FAIL — ca đầu trả `'X'` thay vì `'OL'`.

- [ ] **Step 3: Cài luật**

Trong `SuyKyHieuInput`, thêm trường (ngay dưới `donNghi`):

```ts
  /**
   * Ngày này được phủ bởi một đơn `lam_online` đã duyệt.
   *
   * KHÔNG gộp vào `donNghi`: đơn nghỉ là "hôm đó không làm", đơn online là
   * "hôm đó có làm, chỉ khác chỗ ngồi". Gộp lại thì `coBangChung()` và luật
   * ưu tiên đều phải phân biệt lại bằng `loaiDon` ở từng chỗ đọc.
   */
  coDonOnline?: boolean;
```

Trong `suyKyHieuNgay()`, chèn **giữa** khối `if (input.donNghi) {…}` (dòng 4) và khối `if (input.coChamVao) {…}` (dòng 5):

```ts
  // Dòng 4.5: đơn làm online đã duyệt + CÓ chấm công → OL (1 công, không ăn ca).
  //
  // Điều kiện `coChamVao` là bắt buộc, không phải phòng hờ: chủ sản phẩm chốt
  // "vẫn phải chấm công như bình thường". Cho đơn tự phát công là biến đơn
  // online thành một dạng nghỉ có lương — ai duyệt xong là khỏi làm.
  // Không có chấm vào thì rơi tiếp xuống dòng 6 (trống + chưa xử lý) để HR
  // nhìn thấy, đúng như một ngày đi làm mà quên bấm.
  if (input.coDonOnline && input.coChamVao) {
    if (!input.coChamRa) canhBao.push(MA_CANH_BAO.THIEU_GIO_RA);
    return { kyHieu: 'OL', canhBao, chuaXuLy: false };
  }
```

Và trong `coBangChung()`, tính cả đơn online (ngày online nằm ngoài khoảng làm việc vẫn là bằng chứng cần HR nhìn):

```ts
function coBangChung(input: SuyKyHieuInput): boolean {
  return input.coChamVao || input.coChamRa || !!input.donNghi || !!input.coDonOnline;
}
```

- [ ] **Step 4: Chạy lại — XANH**

Run: `cd be && yarn test --testPathPattern suy-ky-hieu`
Expected: PASS toàn bộ file (cả test cũ).

- [ ] **Step 5: Commit**

```bash
git add be/apps/config-service/src/bang-cong/suy-ky-hieu.ts be/apps/config-service/src/bang-cong/suy-ky-hieu.spec.ts
git commit -m "feat(bang-cong): đơn online + chấm công → ký hiệu OL"
```

---

### Task 3: Nạp đơn online vào dữ liệu nguồn của bảng công

**Files:**
- Modify: `be/apps/config-service/src/bang-cong/nguon-thang.ts`
- Modify: `be/apps/config-service/src/bang-cong/bang-cong.service.ts` (3 chỗ gọi `suyKyHieuNgay`: ~dòng 235, ~444, ~511)
- Test: `be/apps/config-service/src/bang-cong/nguon-thang.spec.ts` (nếu chưa có, tạo mới)

**Interfaces:**
- Consumes: `SuyKyHieuInput.coDonOnline` (Task 2).
- Produces: `DuLieuNgay` thêm `coDonOnline: boolean`; `gomTheoNgay()` set cờ này cho mọi ngày trong khoảng của đơn `lam_online` đã duyệt.

- [ ] **Step 1: Viết test đỏ**

```ts
import { gomTheoNgay } from './nguon-thang';

describe('gomTheoNgay — đơn làm online', () => {
  const donOnline = {
    employeeId: 'e1',
    loaiDon: 'lam_online',
    trangThai: 'da_duyet',
    isActive: true,
    ngay: '2026-08-10',
    denNgay: '2026-08-12',
  } as any;

  it('trải cờ coDonOnline ra từng ngày trong khoảng', () => {
    const map = gomTheoNgay([], [donOnline], '2026-08');
    expect(map.get('e1')?.get('2026-08-10')?.coDonOnline).toBe(true);
    expect(map.get('e1')?.get('2026-08-11')?.coDonOnline).toBe(true);
    expect(map.get('e1')?.get('2026-08-12')?.coDonOnline).toBe(true);
    expect(map.get('e1')?.get('2026-08-13')).toBeUndefined();
  });

  it('không nhận đơn chờ duyệt hoặc đã huỷ', () => {
    const cho = gomTheoNgay([], [{ ...donOnline, trangThai: 'cho_duyet' }], '2026-08');
    expect(cho.get('e1')).toBeUndefined();
    const huy = gomTheoNgay([], [{ ...donOnline, isActive: false }], '2026-08');
    expect(huy.get('e1')).toBeUndefined();
  });

  it('không đụng donNghi', () => {
    const map = gomTheoNgay([], [donOnline], '2026-08');
    expect(map.get('e1')?.get('2026-08-10')?.donNghi).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn ĐỎ**

Run: `cd be && yarn test --testPathPattern nguon-thang`
Expected: FAIL — `coDonOnline` là `undefined`.

- [ ] **Step 3: Cài**

Trong `nguon-thang.ts`:

```ts
export interface DuLieuNgay {
  coChamVao: boolean;
  coChamRa: boolean;
  coBanGhiNgoaiVung: boolean;
  donNghi: DonNghiCuaNgay | null;
  /** Ngày được phủ bởi đơn `lam_online` đã duyệt — xem SuyKyHieuInput. */
  coDonOnline: boolean;
}

function oTrong(): DuLieuNgay {
  return {
    coChamVao: false,
    coChamRa: false,
    coBanGhiNgoaiVung: false,
    donNghi: null,
    coDonOnline: false,
  };
}
```

Trong vòng lặp `for (const don of requests)`, thay đoạn lọc loại đơn:

```ts
    if (don.loaiDon === 'lam_online') {
      if (!don.ngay) continue;
      const denOnline = don.denNgay || don.ngay;
      // Nửa buổi (buoi='sang'|'chieu') KHÔNG đổi gì ở đây: nửa buổi online
      // vẫn là 1 công `OL` không ăn ca, y hệt online trọn ngày.
      for (let t = moc(don.ngay); t <= moc(denOnline); t += MOT_NGAY_MS) {
        const ngay = chuoiNgay(t);
        if (!ngay.startsWith(thang)) continue;
        layO(map, don.employeeId, ngay).coDonOnline = true;
      }
      continue;
    }
    if (!LOAI_DON_NGHI.has(don.loaiDon)) continue;
```

(giữ nguyên hai dòng `isActive`/`trangThai` phía trên — đơn online cũng phải qua chúng.)

Trong `bang-cong.service.ts`, cả **ba** chỗ dựng input cho `suyKyHieuNgay` (tìm bằng `rg -n "donNghi: duLieu"`), thêm ngay dưới dòng `donNghi:`:

```ts
          coDonOnline: duLieu?.coDonOnline ?? false,
```

- [ ] **Step 4: Chạy lại — XANH**

Run: `cd be && yarn test --testPathPattern "nguon-thang|bang-cong"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add be/apps/config-service/src/bang-cong/
git commit -m "feat(bang-cong): nạp đơn làm online vào dữ liệu nguồn của tháng"
```

---

### Task 4: Tổng `soNgayCongOnline` trên bảng công tháng

**Files:**
- Modify: `be/libs/entities/src/cham-cong/timesheet.entity.ts`
- Modify: `be/apps/config-service/src/bang-cong/bang-cong.service.ts` (hàm tính tổng, ~dòng 97-112)
- Modify: `fe/src/services/timesheetService.ts`
- Modify: `fe/src/pages/cham-cong/bang-cong/components/table/BangCongTable.tsx`
- Test: `be/apps/config-service/src/bang-cong/bang-cong.service.spec.ts`

**Interfaces:**
- Consumes: ký hiệu `OL` (Task 1).
- Produces: `Timesheet.soNgayCongOnline: number` (default 0), FE `TimesheetRow.soNgayCongOnline?: number`.

- [ ] **Step 1: Viết test đỏ**

Thêm vào `bang-cong.service.spec.ts` (bám theo cách các test tổng hiện có dựng `chiTietNgay`):

```ts
it('đếm số ngày công online từ ô OL', () => {
  const ts: any = {
    chiTietNgay: [
      { ngay: '2026-08-10', kyHieu: 'OL' },
      { ngay: '2026-08-11', kyHieu: 'OL' },
      { ngay: '2026-08-12', kyHieu: 'X' },
      { ngay: '2026-08-13', kyHieu: 'P' },
    ],
  };
  (service as any).tinhTong(ts);
  expect(ts.soNgayCongOnline).toBe(2);
  expect(ts.soNgayCong).toBe(4); // OL và P đều 1 công
});
```

> Tên hàm tính tổng: mở `bang-cong.service.ts` quanh dòng 97-112 và dùng **đúng** tên đang có (doc-comment ghi `soNgayCong = Σ soCongCuaKyHieu(cell.kyHieu)`). Nếu nó là private, gọi qua `(service as any).<tên>`.

- [ ] **Step 2: Chạy để chắc chắn ĐỎ**

Run: `cd be && yarn test --testPathPattern bang-cong.service`
Expected: FAIL — `soNgayCongOnline` là `undefined`.

- [ ] **Step 3: Cài**

`timesheet.entity.ts`, ngay dưới `soNgayOm`:

```ts
  /** computed: count of 'OL' — ngày làm online, đã tính trong soNgayCong nhưng không có ăn ca. */
  @Column({ default: 0 }) soNgayCongOnline: number;
```

`bang-cong.service.ts`, cạnh dòng `ts.soNgayOm = …`:

```ts
    ts.soNgayCongOnline = cells.filter((c) => c.kyHieu === 'OL').length;
```

`fe/src/services/timesheetService.ts`: thêm `soNgayCongOnline?: number;` vào interface hàng bảng công (cạnh `soNgayOm`), và trong hàm map (~dòng 148-151):

```ts
      soNgayCongOnline: (x.soNgayCongOnline as number) ?? 0,
```

`BangCongTable.tsx`: thêm cột ngay sau cột `soNgayOm` (chép nguyên hình dạng của cột đó, đổi 3 chỗ):

```tsx
      {
        title: "Công online",
        dataIndex: "soNgayCongOnline",
        key: "soNgayCongOnline",
        width: 110,
        align: "center" as const,
        render: (v: number) => v ?? 0,
      },
```

- [ ] **Step 4: Chạy lại — XANH**

Run: `cd be && yarn test --testPathPattern bang-cong.service` rồi `cd fe && npm run test -- --run timesheetService`
Expected: PASS cả hai.

- [ ] **Step 5: Commit**

```bash
git add be/libs/entities/src/cham-cong/timesheet.entity.ts be/apps/config-service/src/bang-cong/ fe/src/services/timesheetService.ts fe/src/pages/cham-cong/bang-cong/components/table/BangCongTable.tsx
git commit -m "feat(bang-cong): cột tổng số ngày công online"
```

---

### Task 5: Loại đơn `lam_online` ở backend đơn từ

**Files:**
- Modify: `be/apps/config-service/src/don-cham-cong/dto/create-don-cham-cong.dto.ts`
- Test: `be/apps/config-service/src/don-cham-cong/dto/create-don-cham-cong.dto.spec.ts`, `be/apps/config-service/src/don-cham-cong/dto/tao-don-cua-toi.dto.spec.ts`

**Interfaces:**
- Consumes: —
- Produces: `loaiDon: 'lam_online'` được cả `CreateDonChamCongDto` lẫn `TaoDonCuaToiDto` chấp nhận.

- [ ] **Step 1: Viết test đỏ**

Vào `create-don-cham-cong.dto.spec.ts` (bám theo helper `validate`/`plainToInstance` đang dùng trong file):

```ts
it('nhận loại đơn lam_online', async () => {
  const errs = await validate(
    plainToInstance(CreateDonChamCongDto, {
      employeeId: 'e1',
      loaiDon: 'lam_online',
      ngay: '2026-08-10',
      denNgay: '2026-08-12',
      lyDo: 'Làm ở nhà',
    }),
  );
  expect(errs).toStrictEqual([]);
});

it('vẫn từ chối loại đơn lạ', async () => {
  const errs = await validate(
    plainToInstance(CreateDonChamCongDto, {
      employeeId: 'e1',
      loaiDon: 'wfh',
      ngay: '2026-08-10',
    }),
  );
  expect(errs.length).toBeGreaterThan(0);
});
```

Và vào `tao-don-cua-toi.dto.spec.ts` — đường nhân viên tự nộp:

```ts
it('nhân viên tự nộp được đơn lam_online nửa buổi', async () => {
  const errs = await validate(
    plainToInstance(TaoDonCuaToiDto, {
      loaiDon: 'lam_online',
      ngay: '2026-08-10',
      denNgay: '2026-08-10',
      buoi: 'sang',
      lyDo: 'Sáng ở nhà',
    }),
  );
  expect(errs).toStrictEqual([]);
});
```

- [ ] **Step 2: Chạy để chắc chắn ĐỎ**

Run: `cd be && yarn test --testPathPattern "create-don-cham-cong.dto|tao-don-cua-toi.dto"`
Expected: FAIL — `loaiDon` không hợp lệ.

- [ ] **Step 3: Cài**

`create-don-cham-cong.dto.ts`:

```ts
  @IsIn(['giai_trinh', 'lam_them_gio', 'nghi_phep', 'nghi_bu', 'lam_online'], {
    message: 'Loại đơn không hợp lệ',
  })
  loaiDon: string;
```

Thêm ghi chú cạnh trường `buoi` (nó nay phục vụ cả đơn online):

```ts
  // ca_ngay|sang|chieu — chỉ có ý nghĩa khi đơn đúng 1 ngày (tuNgay = denNgay),
  // xem tinhSoNgayNghi() trong luat-don.ts. Đơn `lam_online` cũng dùng trường
  // này, nhưng chỉ để hiển thị: nửa buổi online vẫn ra `OL` = 1 công.
```

`TaoDonCuaToiDto` **không phải sửa** — nó `OmitType(CreateDonChamCongDto, …)` nên thừa hưởng validator.

- [ ] **Step 4: Chạy lại — XANH**

Run: `cd be && yarn test --testPathPattern don-cham-cong`
Expected: PASS toàn module (kể cả `luat-don`, `don-cham-cong.service`).

- [ ] **Step 5: Commit**

```bash
git add be/apps/config-service/src/don-cham-cong/
git commit -m "feat(don-tu): loại đơn lam_online"
```

---

### Task 6: Chấm công bỏ kiểm vị trí trong ngày có đơn online

**Files:**
- Modify: `be/libs/entities/src/cham-cong/attendance-record.entity.ts`
- Modify: `be/apps/config-service/src/ban-ghi-cham-cong/ban-ghi-cham-cong.service.ts` (~dòng 205-300)
- Modify: `be/apps/config-service/src/ban-ghi-cham-cong/ban-ghi-cham-cong.module.ts` (đăng ký `AttendanceRequest` repo nếu chưa có)
- Test: `be/apps/config-service/src/ban-ghi-cham-cong/ban-ghi-cham-cong.service.spec.ts`

**Interfaces:**
- Consumes: loại đơn `lam_online` (Task 5).
- Produces: `AttendanceRecord.laOnline: boolean` (default false). Method riêng `private async coDonOnlineDaDuyet(employeeId: string, ngay: string): Promise<boolean>`.

- [ ] **Step 1: Viết test đỏ**

Bám theo cách file spec hiện dựng service + repo giả. Thêm:

```ts
describe('ngày làm online', () => {
  it('ngoài vùng + có đơn online đã duyệt → cho chấm, laOnline=true, ngoaiVung=false', async () => {
    // rules trả { ngoaiVung: true, khoangCachMet: 480 }
    // requestRepo.find trả [{ loaiDon:'lam_online', trangThai:'da_duyet', isActive:true,
    //                         ngay:'2026-08-12', denNgay:'2026-08-12', employeeId:'e1' }]
    const bg = await service.checkIn({ id: 'u1' }, dtoGps, 'vao');
    expect(bg.laOnline).toBe(true);
    expect(bg.ngoaiVung).toBe(false);
    expect(bg.locationId).toBeUndefined();
    // Bỏ KIỂM vị trí không có nghĩa là bỏ GHI vị trí:
    expect(bg.latitude).toBe(dtoGps.latitude);
  });

  it('ngoài vùng + đơn online mới CHỜ DUYỆT → vẫn 403', async () => {
    // requestRepo.find trả [{ …, trangThai: 'cho_duyet' }]
    await expect(service.checkIn({ id: 'u1' }, dtoGps, 'vao')).rejects.toThrow(ForbiddenException);
  });

  it('ngoài vùng + không có đơn nào → vẫn 403 như cũ', async () => {
    await expect(service.checkIn({ id: 'u1' }, dtoGps, 'vao')).rejects.toThrow(ForbiddenException);
  });

  it('đơn online KHÔNG nới giờ giấc — đi muộn vẫn tính', async () => {
    // rules trả { ngoaiVung: true, soPhutDiMuon: 15 }
    const bg = await service.checkIn({ id: 'u1' }, dtoGps, 'vao');
    expect(bg.soPhutDiMuon).toBe(15);
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn ĐỎ**

Run: `cd be && yarn test --testPathPattern ban-ghi-cham-cong.service`
Expected: FAIL — ca đầu ném `ForbiddenException`.

- [ ] **Step 3: Cài**

`attendance-record.entity.ts`, ngay dưới `ngoaiVung`:

```ts
  /**
   * Lượt bấm này thuộc một ngày có đơn `lam_online` đã duyệt ⇒ đã BỎ đối
   * chiếu địa điểm. `ngoaiVung` của bản ghi như vậy luôn `false` — ngày đó
   * không có vùng nào để mà nằm ngoài. Toạ độ/IP vẫn được ghi để đối chiếu.
   */
  @Column({ default: false }) laOnline: boolean;
```

`ban-ghi-cham-cong.service.ts` — tiêm repo đơn vào constructor (nếu chưa có):

```ts
    @InjectRepository(AttendanceRequest)
    private readonly requestRepo: Repository<AttendanceRequest>,
```

và trong `ban-ghi-cham-cong.module.ts`, thêm `AttendanceRequest` vào `TypeOrmModule.forFeature([...])`.

Thêm method:

```ts
  /**
   * Ngày `ngay` của nhân viên này có đơn làm online đã duyệt không.
   *
   * Lọc khoảng bằng so sánh chuỗi "YYYY-MM-DD" (đúng thứ tự thời gian) thay
   * vì `Between` trên hai cột: đơn một ngày để `denNgay` rỗng, mà truy vấn
   * khoảng trên cột rỗng sẽ trượt đúng những đơn phổ biến nhất.
   */
  private async coDonOnlineDaDuyet(
    employeeId: string,
    ngay: string,
  ): Promise<boolean> {
    const don = await this.requestRepo.find({
      where: { employeeId, loaiDon: 'lam_online', trangThai: 'da_duyet' },
    });
    return don.some(
      (d) =>
        d.isActive !== false &&
        !!d.ngay &&
        ngay >= d.ngay &&
        ngay <= (d.denNgay || d.ngay),
    );
  }
```

Trước khối chặn ngoài-bán-kính:

```ts
    // Ngày có đơn online đã duyệt thì BỎ đối chiếu vị trí. Đặt cạnh
    // `choPhepChamNgoaiVung` vì cùng một loại ngoại lệ, khác nhau ở phạm vi:
    // cờ kia mở vĩnh viễn cho một người và do HR bật tay; cái này mở đúng
    // những ngày đã có người duyệt.
    const laOnline = kq.ngoaiVung
      ? await this.coDonOnlineDaDuyet(employeeId, ngay)
      : false;
```

Đổi điều kiện chặn:

```ts
    if (kq.ngoaiVung && emp.choPhepChamNgoaiVung !== true && !laOnline) {
```

Và trong `this.repo.create({…})`:

```ts
        locationId: laOnline ? undefined : kq.locationId,
        locationTen: laOnline ? undefined : kq.locationTen,
        // Ngày online không có vùng để nằm ngoài. Giữ `true` ở đây là bắt
        // `suy-ky-hieu` đẻ cảnh báo NGOAI_VUNG cho mọi ngày online của mọi
        // người — một cảnh báo luôn bật là một cảnh báo không ai đọc.
        ngoaiVung: laOnline ? false : kq.ngoaiVung,
        laOnline,
```

(giữ nguyên `latitude`/`longitude`/`doChinhXacMet`/`ipAddress`/`deviceId`/`khoangCachMet`.)

- [ ] **Step 4: Chạy lại — XANH**

Run: `cd be && yarn test --testPathPattern ban-ghi-cham-cong`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add be/libs/entities/src/cham-cong/attendance-record.entity.ts be/apps/config-service/src/ban-ghi-cham-cong/
git commit -m "feat(cham-cong): ngày có đơn online đã duyệt thì chấm ở đâu cũng được"
```

---

### Task 7: Bảng lương — chứng minh ngày `OL` không có tiền ăn ca

**Files:**
- Test: `be/apps/config-service/src/bang-luong/bang-luong.service.spec.ts` (**chỉ thêm test, KHÔNG sửa code bảng lương**)

**Interfaces:**
- Consumes: ký hiệu `OL` (Task 1), `Timesheet.chiTietNgay`.
- Produces: —

- [ ] **Step 1: Viết test**

Bám theo test hiện có của `demNgayLamDu`/ăn ca trong file:

```ts
it('ngày OL không được tính suất ăn ca, nhưng vẫn là 1 công lương chính', () => {
  const ts: any = {
    soNgayCong: 22,
    chiTietNgay: [
      ...Array.from({ length: 20 }, (_, i) => ({ kyHieu: 'X' })),
      { kyHieu: 'OL' },
      { kyHieu: 'OL' },
    ],
  };
  expect((service as any).demNgayLamDu(ts)).toBe(20); // ăn ca chỉ 20 suất
  expect(ts.soNgayCong).toBe(22); // lương chính vẫn 22 công
});
```

- [ ] **Step 2: Chạy — phải XANH NGAY**

Run: `cd be && yarn test --testPathPattern bang-luong.service`
Expected: PASS **mà không sửa một dòng code nào** của `bang-luong`. Nếu ĐỎ thì giả định trung tâm của spec sai — dừng lại và báo, đừng sửa `bang-luong` để test xanh.

- [ ] **Step 3: Commit**

```bash
git add be/apps/config-service/src/bang-luong/bang-luong.service.spec.ts
git commit -m "test(bang-luong): ngày công online không phát sinh tiền ăn ca"
```

---

### Task 8: FE — loại đơn thứ 5 ở cả hai form nộp đơn

**Files:**
- Modify: `fe/src/services/attendanceRequestService.ts`
- Modify: `fe/src/pages/cham-cong/don-cham-cong/constants.ts`
- Modify: `fe/src/pages/cham-cong/don-cham-cong/truongTheoLoaiDon.ts`
- Modify: `fe/src/pages/toi/don-tu/loaiDonUI.tsx`
- Modify: `fe/src/pages/toi/don-tu/moTaDon.ts`
- Test: `fe/src/pages/cham-cong/don-cham-cong/truongTheoLoaiDon.test.ts` (tạo nếu chưa có), `fe/src/pages/toi/don-tu/moTaDon.test.ts`

**Interfaces:**
- Consumes: `loaiDon: 'lam_online'` (Task 5).
- Produces: `AttendanceRequestType` có `'lam_online'`; `TRUONG_THEO_LOAI.lam_online = ["ngay","denNgay","buoi","lyDo"]`; `hienBuoi()` trả `true` cho đơn online đúng một ngày.

- [ ] **Step 1: Viết test đỏ**

```ts
import { TRUONG_THEO_LOAI, hienBuoi, truongCuaDon } from "./truongTheoLoaiDon";

describe("đơn làm online", () => {
  it("có đúng 4 trường: ngày, đến ngày, buổi, lý do", () => {
    expect(TRUONG_THEO_LOAI.lam_online).toStrictEqual([
      "ngay",
      "denNgay",
      "buoi",
      "lyDo",
    ]);
  });

  it("hiện chọn buổi khi đơn đúng một ngày", () => {
    expect(
      hienBuoi({ loaiDon: "lam_online", ngay: "2026-08-10", denNgay: "2026-08-10" })
    ).toBe(true);
  });

  it("ẩn chọn buổi khi đơn nhiều ngày", () => {
    expect(
      hienBuoi({ loaiDon: "lam_online", ngay: "2026-08-10", denNgay: "2026-08-12" })
    ).toBe(false);
  });

  it("truongCuaDon không rỗng cho lam_online", () => {
    expect(truongCuaDon({ loaiDon: "lam_online", ngay: "2026-08-10" }).length).toBe(4);
  });
});
```

- [ ] **Step 2: Chạy để chắc chắn ĐỎ**

Run: `cd fe && npm run test -- --run truongTheoLoaiDon`
Expected: FAIL — `TRUONG_THEO_LOAI.lam_online` là `undefined`.

- [ ] **Step 3: Cài**

`attendanceRequestService.ts`:

```ts
export type AttendanceRequestType =
  | 'giai_trinh'
  | 'lam_them_gio'
  | 'nghi_phep'
  | 'nghi_bu'
  // Làm việc online (ở nhà) — ngày đó bỏ đối chiếu vị trí lúc chấm công và
  // bảng công ra ký hiệu `OL` (1 công, không ăn ca).
  | 'lam_online';
```

`constants.ts`:

```ts
  { value: "lam_online", label: "Làm online" },
```

`truongTheoLoaiDon.ts` — thêm dòng vào bảng:

```ts
  // Đơn online mượn đúng hình dạng của đơn nghỉ theo ngày (khoảng ngày + nửa
  // buổi), chỉ khác: nó KHÔNG có loaiNghi vì đây là ngày LÀM, không phải nghỉ.
  lam_online: ["ngay", "denNgay", "buoi", "lyDo"],
```

và sửa `hienBuoi()`:

```ts
export function hienBuoi(v: DonDangSoan): boolean {
  if (v.loaiDon !== "nghi_phep" && v.loaiDon !== "nghi_bu" && v.loaiDon !== "lam_online")
    return false;
  return !v.denNgay || v.denNgay === v.ngay;
}
```

`loaiDonUI.tsx` — thêm `LaptopOutlined` vào import từ `@ant-design/icons` và:

```tsx
  // Làm online: máy tính xách tay → teal (màu thứ 5 của bảng màu iOS, bốn
  // loại trước đã lấy blue/orange/green/purple).
  lam_online: {
    icon: <LaptopOutlined />,
    gradient: "linear-gradient(135deg, #5ac8fa, #32ade6)",
  },
```

`moTaDon.ts` — thêm nhánh mô tả cho `lam_online`, theo đúng khuôn các loại khác trong file, ví dụ: `"Làm online 2026-08-10 → 2026-08-12"`, và với nửa buổi thì `"Làm online 2026-08-10 (buổi sáng)"`. Đọc hàm hiện có rồi bám nguyên văn phong của nó.

- [ ] **Step 4: Chạy lại — XANH**

Run: `cd fe && npm run test -- --run "truongTheoLoaiDon|moTaDon|don-tu"`
Expected: PASS. Kiểm luôn `npx tsc --noEmit 2>&1 | grep -E "loaiDonUI|truongTheoLoaiDon|attendanceRequestService"` — không được có lỗi mới ở các file vừa sửa (repo vốn có sẵn ~170 lỗi ở file khác, bỏ qua chúng).

- [ ] **Step 5: Commit**

```bash
git add fe/src/services/attendanceRequestService.ts fe/src/pages/cham-cong/don-cham-cong/ fe/src/pages/toi/don-tu/
git commit -m "feat(fe): đơn làm online ở cả form nhân viên và form HR"
```

---

### Task 9: FE — báo cho nhân viên biết hôm nay được làm online

**Files:**
- Modify: `fe/src/pages/cham-cong/cua-toi/ChamCongCuaToiPage.tsx` (và sub-handler nạp đơn nếu màn này chưa có sẵn danh sách đơn đã duyệt)
- Test: `fe/src/pages/cham-cong/cua-toi/ChamCongCuaToiPage.render.test.tsx`

**Interfaces:**
- Consumes: `AttendanceRequestType = 'lam_online'` (Task 8).
- Produces: —

- [ ] **Step 1: Viết test đỏ**

```tsx
it("hiện băng làm online khi hôm nay có đơn online đã duyệt", async () => {
  // mock service đơn trả [{ loaiDon:'lam_online', trangThai:'da_duyet',
  //   ngay: hômNay, denNgay: hômNay, isActive:true }]
  render(<ChamCongCuaToiPage />);
  expect(await screen.findByText(/làm online/i)).toBeInTheDocument();
});

it("không hiện băng khi không có đơn online", async () => {
  render(<ChamCongCuaToiPage />);
  await waitFor(() => expect(screen.queryByText(/làm online/i)).toBeNull());
});
```

> Bám theo cách file test hiện có mock `attendanceRecordService.ln` để mock tiếp service đơn — đừng dựng mock kiểu mới.

- [ ] **Step 2: Chạy để chắc chắn ĐỎ**

Run: `cd fe && npm run test -- --run ChamCongCuaToiPage`
Expected: FAIL — không tìm thấy chữ "làm online".

- [ ] **Step 3: Cài**

Thêm một `Alert` (antd) phía trên nút chấm công, chỉ hiện khi hôm nay được phủ bởi đơn `lam_online` đã duyệt:

```tsx
{laOnlineHomNay && (
  <Alert
    type="info"
    showIcon
    message="Hôm nay bạn làm online"
    description="Cứ bấm chấm công ở bất kỳ đâu — hệ thống không kiểm tra vị trí trong ngày này. Giờ vào/ra vẫn tính như thường."
  />
)}
```

Luật `laOnlineHomNay` viết thành hàm thuần cạnh component (để test được không cần render):

```ts
export function coDonOnlineHomNay(don: AttendanceRequest[], homNay: string): boolean {
  return don.some(
    (d) =>
      d.loaiDon === "lam_online" &&
      d.trangThai === "da_duyet" &&
      d.isActive !== false &&
      !!d.ngay &&
      homNay >= d.ngay &&
      homNay <= (d.denNgay || d.ngay)
  );
}
```

- [ ] **Step 4: Chạy lại — XANH**

Run: `cd fe && npm run test -- --run cua-toi`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/cham-cong/cua-toi/
git commit -m "feat(fe): báo 'hôm nay bạn làm online' ở màn chấm công"
```

---

### Task 10: FE — ô `OL` trên lịch công của nhân viên

**Files:**
- Modify: `fe/src/pages/toi/bang-cong/thangCong.ts`
- Test: `fe/src/pages/toi/bang-cong/thangCong.test.ts`

**Interfaces:**
- Consumes: `loaiDon: 'lam_online'` (Task 8).
- Produces: `KyHieuNghi` đổi thành `"P" | "B" | "OL"`; `tinhONgay()` gắn `kyHieu: "OL"` cho ngày online **có chấm công**.

- [ ] **Step 1: Viết test đỏ**

```ts
it("ngày có đơn online đã duyệt và có chấm công → ký hiệu OL, 1 công", () => {
  const o = tinhONgay(/* … ngày 2026-08-10, bản ghi vào+ra, đơn lam_online đã duyệt … */);
  expect(o.kyHieu).toBe("OL");
  expect(o.cong).toBe(1);
});

it("ngày có đơn online nhưng KHÔNG chấm công → không gắn OL", () => {
  const o = tinhONgay(/* … không có bản ghi nào … */);
  expect(o.kyHieu).toBeUndefined();
});
```

> Chép nguyên tham số của các test `tinhONgay` sẵn có trong file, chỉ đổi phần đơn/bản ghi.

- [ ] **Step 2: Chạy để chắc chắn ĐỎ**

Run: `cd fe && npm run test -- --run thangCong`
Expected: FAIL.

- [ ] **Step 3: Cài**

```ts
/** Ký hiệu hiện trên ô ngày: hai loại nghỉ có đơn, và ngày làm online. */
export type KyHieuNghi = "P" | "B" | "OL";
```

Trong `tinhONgay`, **sau** nhánh `if (donNghi)` (đơn nghỉ vẫn thắng, đúng như backend) thêm:

```ts
  } else if (coDonOnlinePhuNgay(ngay, donDaDuyet) && suySoCong(banGhiNgay) !== 0) {
    // Cùng luật với backend `suy-ky-hieu.ts`: đơn online KHÔNG tự phát công,
    // phải có chấm công thì mới là một ngày công online.
    cong = laHomNay ? congHomNay : suySoCong(banGhiNgay);
    kyHieu = "OL";
```

và hàm lọc đơn online (đặt cạnh `donNghiPhuNgay` sẵn có, cùng khuôn):

```ts
function coDonOnlinePhuNgay(ngay: string, don: DonDaDuyet[]): boolean {
  return don.some(
    (d) =>
      d.loaiDon === "lam_online" &&
      !!d.ngay &&
      ngay >= d.ngay &&
      ngay <= (d.denNgay || d.ngay)
  );
}
```

Kiểm lại nhánh `if (kyHieu) hienThi = cong === 1 ? "1" : "0.5"` vẫn đúng cho `OL` (ngày online là 1 công ⇒ hiện "1").

- [ ] **Step 4: Chạy lại — XANH**

Run: `cd fe && npm run test -- --run "thangCong|bang-cong"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/toi/bang-cong/
git commit -m "feat(fe): lịch công nhân viên hiện ký hiệu OL cho ngày làm online"
```

---

### Task 11: Chạy toàn bộ test + đối chiếu spec

**Files:** —

- [ ] **Step 1: Test BE toàn bộ**

Run: `cd be && nvm use v22.0.0 && yarn test`
Expected: PASS. Test `auth-service` liên quan bcrypt có thể rung do sát mốc timeout 5s — nếu đỏ, chạy lại trên `main` để xác nhận nó đỏ sẵn chứ không phải do thay đổi này.

- [ ] **Step 2: Test FE toàn bộ**

Run: `cd fe && npm run test -- --run`
Expected: PASS.

- [ ] **Step 3: Đối chiếu từng dòng §6 của spec**

Mở `docs/superpowers/specs/2026-08-14-hrm-don-lam-online-design.md` §6 và xác nhận mỗi ô trong bảng có một test thật đang chạy. Ô nào thiếu thì viết bổ sung ngay.

- [ ] **Step 4: Commit (nếu có bổ sung)**

```bash
git add -A && git commit -m "test: phủ nốt các ca còn thiếu của đơn làm online"
```
