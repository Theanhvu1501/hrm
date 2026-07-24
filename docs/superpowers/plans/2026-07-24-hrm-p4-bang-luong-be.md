# P4 (A+B) — Bảng lương BACKEND: entities + engine config động + API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend của phân hệ Bảng lương: cấu hình lương **hoàn toàn động** (khoản lương + thuế cấu hình được), một **engine tính lương thuần** chạy cho cả 2 mức (khai báo/thực tế), và API tổng hợp/chốt kỳ lấy công từ chấm công + tham số từ Hồ sơ NV.

**Architecture:** NestJS module `bang-luong` trong `config-service` (theo khuôn `bang-cong`). Engine là hàm thuần trong `libs` (không DB, test bằng bảng). Không hằng số nghiệp vụ trong code — mọi thứ đọc từ entity `CauHinhLuong` (seed mặc định theo file 2026). Mongo qua `DatabaseModule.forFeature` (tenant-aware). Guard `JwtGuard`+`PermissionGuard`.

**Tech Stack:** NestJS, TypeORM (mongodb driver), Jest. Node 22, yarn. Spec: `docs/superpowers/specs/2026-07-24-hrm-p4-bang-luong-A-B-design.md`.

## Global Constraints

- Backend chạy ở `be/`, Node 22: `cd be && nvm use` (hoặc `export PATH="/Users/os_anhvt/.nvm/versions/node/v22.0.0/bin:$PATH"`). Test 1 file: `cd be && yarn jest <path> ` (hoặc `npx jest`). Repo root: `/Users/os_anhvt/Documents/Dino/hrm`.
- **KHÔNG hằng số nghiệp vụ trong code** (thuế/BHXH/giảm trừ/trần/công thức): engine chỉ diễn giải `CauHinhLuong`. Con số mặc định CHỈ nằm ở hàm seed.
- Entity: extends `BaseEntity` (`@app/entities`), `@Entity('...')`, JSON field `@Column('json',{nullable:true})`, kèm block `declare module '../entities' { interface Entities extends X {} }`. Đăng ký qua `DatabaseModule.forFeature([...])` (KHÔNG `TypeOrmModule.forFeature` trần).
- Class đặt tên kiểu `BangLuong_Service`/`BangLuong_Controller`/`BangLuong_Module`. File/thư mục kebab-case.
- Controller: `@UseGuards(JwtGuard)` cấp class + `@UseGuards(PermissionGuard)`+`@Permissions('/luong/<x>:<action>')` mỗi route. KHÔNG AdminGuard/@Roles (xem chú thích `ngay-le.controller.ts`). Xem [[authz-adminguard-vs-permissionguard]].
- Quyền: thêm module vào `be/libs/core/src/permissions/all-permissions.ts` VÀ `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts` **đồng bộ**. Khi deploy chạy grant script ([[deploy-grant-quyen-module-moi]]).
- DTO: class-validator, message tiếng Việt, `PartialType` cho update, barrel `dto/index.ts`.
- Commit sau mỗi task, cuối message:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: Kiểu dữ liệu lương dùng chung (types thuần)

**Files:**
- Create: `be/libs/entities/src/luong/luong.types.ts`

**Interfaces:** (Produces) — dùng bởi entity, engine, service, DTO.

- [ ] **Step 1: Tạo file types** `be/libs/entities/src/luong/luong.types.ts`:

```ts
/** Loại công thức cho một khoản lương — engine diễn giải, KHÔNG công thức tự do. */
export type LoaiCongThuc =
  | 'LUONG_THEO_CONG' // base/congChuan × (congThuong+congKhac) + base/congChuan × congThuViec × thuViec.tyLe
  | 'DINH_MUC_x_CONG' // thamSo.dinhMuc × congThuong (vd ăn ca 50k×công)
  | 'CO_DINH_THANG' // (thamSo.soTien | phụ cấp từ hồ sơ)/congChuan × (congThuong + congThuViec×thuViec.tyLe)
  | 'PHAN_TRAM_BASE' // thamSo.tyLe × base
  | 'NHAP_THEO_KY'; // số nhập/import theo kỳ, khoá theo `ma`

export interface ThamSoKhoan {
  dinhMuc?: number;
  soTien?: number;
  tyLe?: number;
  /** với CO_DINH_THANG: lấy số tiền từ trường Hồ sơ NV này (vd 'phuCapCoDinh') thay vì soTien. */
  nguonHoSo?: 'phuCapCoDinh';
}

export interface KhoanLuong {
  ma: string;
  ten: string;
  loaiCongThuc: LoaiCongThuc;
  thamSo: ThamSoKhoan;
  /** khoản này có tính vào thu nhập chịu thuế không. */
  chiuThue: boolean;
  /** phần ≤ trần được miễn thuế, phần vượt mới chịu (null = không có trần). */
  tranMienThue: number | null;
  vaoTongThuNhap: boolean;
  vaoBHXH: boolean;
  thuTu: number;
}

export interface BacThue {
  /** cận trên của bậc; null = ∞ (bậc cuối). */
  den: number | null;
  suat: number; // 0..1
}

export interface CauHinhLuongData {
  mucKhaiBaoMacDinh: number;
  congChuan: number;
  khoanLuong: KhoanLuong[];
  giamTruBanThan: number;
  giamTruNPT: number;
  bhxh: { tyLe: number; canCu: 'MUC_KHAI_BAO' | 'LUONG_THOA_THUAN' };
  bacThue: BacThue[];
  thuViec: { tyLe: number };
  quyTacThoiVu: { tyLe: number; nguong: number };
  quyTacCamKet: { mienThue: boolean };
  lamTron: number;
}

/** Đầu vào engine cho MỘT dòng (một NV, một mức lương). */
export interface DauVaoDongLuong {
  base: number; // luongGoc của mức đang tính
  mucKhaiBao: number; // để BHXH khi canCu = MUC_KHAI_BAO
  congThuong: number;
  congThuViec: number;
  congKhac: number;
  phuCapCoDinh: number; // từ Hồ sơ NV
  soNguoiPhuThuoc: number;
  tamUng: number;
  khauTruKhac: number;
  dongBH: boolean;
  thoiVu: boolean;
  camKet: boolean;
  /** số nhập theo kỳ, khoá theo `ma` khoản (vd { HIEU_SUAT: 2000000, THUONG: 0 }). */
  nhapTheoKy: Record<string, number>;
}

export interface KetQuaLuong {
  giaTriTungKhoan: Record<string, number>;
  tongThuNhap: number;
  thuNhapMienThue: number;
  bhxh: number;
  giamTru: number;
  thuNhapTinhThue: number;
  thue: number;
  thucLinh: number;
}
```

- [ ] **Step 2: Barrel** — tạo `be/libs/entities/src/luong/index.ts` với `export * from './luong.types';`, và thêm `export * from './luong';` vào cuối `be/libs/entities/src/index.ts`.

- [ ] **Step 3: Build kiểm tra** — Run: `cd be && export PATH="/Users/os_anhvt/.nvm/versions/node/v22.0.0/bin:$PATH" && npx tsc -p libs/entities/tsconfig.lib.json --noEmit` (hoặc `yarn build` nếu nhanh hơn). Expected: không lỗi type. *(Nếu không có tsconfig riêng, bỏ qua — Task 2 build sẽ bắt lỗi.)*

- [ ] **Step 4: Commit**
```bash
cd /Users/os_anhvt/Documents/Dino/hrm
git add be/libs/entities/src/luong/luong.types.ts be/libs/entities/src/luong/index.ts be/libs/entities/src/index.ts
git commit -m "feat(be): kiểu dữ liệu lương dùng chung (khoản lương + cấu hình config động)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Engine tính lương thuần + test (TRÁI TIM — TDD)

**Files:**
- Create: `be/libs/core/src/luong/tinh-luong.ts`
- Create: `be/libs/core/src/luong/tinh-luong.spec.ts`
- (Barrel) Modify: `be/libs/core/src/index.ts` — thêm `export * from './luong/tinh-luong';` (kiểm tra đường dẫn barrel thật của `@app/core`; nếu khác thì thêm đúng chỗ).

**Interfaces:**
- Consumes: types từ `@app/entities` (Task 1) — `CauHinhLuongData`, `DauVaoDongLuong`, `KetQuaLuong`, `KhoanLuong`, `BacThue`.
- Produces: `tinhDongLuong(dauVao, ch): KetQuaLuong`, `thueLuyTien(tntt, bac): number`, `lamTronTheo(x, buoc): number`.

- [ ] **Step 1: Viết test thất bại** — `be/libs/core/src/luong/tinh-luong.spec.ts`:

```ts
import { tinhDongLuong, thueLuyTien, lamTronTheo } from './tinh-luong';
import { CauHinhLuongData, DauVaoDongLuong } from '@app/entities';

const BAC_MAC_DINH = [
  { den: 10_000_000, suat: 0.05 },
  { den: 30_000_000, suat: 0.1 },
  { den: 60_000_000, suat: 0.2 },
  { den: 100_000_000, suat: 0.3 },
  { den: null, suat: 0.35 },
];

function cauHinh(over: Partial<CauHinhLuongData> = {}): CauHinhLuongData {
  return {
    mucKhaiBaoMacDinh: 5_500_000,
    congChuan: 24,
    khoanLuong: [
      { ma: 'LUONG_CONG', ten: 'Lương theo công', loaiCongThuc: 'LUONG_THEO_CONG', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: true, thuTu: 1 },
      { ma: 'AN_CA', ten: 'Ăn ca', loaiCongThuc: 'DINH_MUC_x_CONG', thamSo: { dinhMuc: 50_000 }, chiuThue: true, tranMienThue: 1_200_000, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 2 },
      { ma: 'HIEU_SUAT', ten: 'Hiệu suất', loaiCongThuc: 'NHAP_THEO_KY', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 3 },
    ],
    giamTruBanThan: 15_500_000,
    giamTruNPT: 6_200_000,
    bhxh: { tyLe: 0.105, canCu: 'MUC_KHAI_BAO' },
    bacThue: BAC_MAC_DINH,
    thuViec: { tyLe: 0.85 },
    quyTacThoiVu: { tyLe: 0.1, nguong: 2_000_000 },
    quyTacCamKet: { mienThue: true },
    lamTron: 1000,
    ...over,
  };
}

function dauVao(over: Partial<DauVaoDongLuong> = {}): DauVaoDongLuong {
  return {
    base: 5_500_000, mucKhaiBao: 5_500_000,
    congThuong: 24, congThuViec: 0, congKhac: 0,
    phuCapCoDinh: 0, soNguoiPhuThuoc: 0, tamUng: 0, khauTruKhac: 0,
    dongBH: false, thoiVu: false, camKet: false,
    nhapTheoKy: {}, ...over,
  };
}

describe('lamTronTheo', () => {
  it('làm tròn tới nghìn gần nhất', () => {
    expect(lamTronTheo(1_234_500, 1000)).toBe(1_235_000);
    expect(lamTronTheo(1_234_400, 1000)).toBe(1_234_000);
  });
});

describe('thueLuyTien — theo bậc CẤU HÌNH, không số cứng', () => {
  it('bậc mặc định: đúng biên', () => {
    expect(thueLuyTien(0, BAC_MAC_DINH)).toBe(0);
    expect(thueLuyTien(10_000_000, BAC_MAC_DINH)).toBe(500_000); // 10tr×5%
    expect(thueLuyTien(30_000_000, BAC_MAC_DINH)).toBe(500_000 + 2_000_000); // +20tr×10%
    expect(thueLuyTien(60_000_000, BAC_MAC_DINH)).toBe(500_000 + 2_000_000 + 6_000_000); // +30tr×20%
  });
  it('bộ bậc KHÁC → kết quả khác (chứng minh đọc cấu hình)', () => {
    const bac2 = [{ den: 5_000_000, suat: 0.1 }, { den: null, suat: 0.2 }];
    expect(thueLuyTien(5_000_000, bac2)).toBe(500_000);
    expect(thueLuyTien(10_000_000, bac2)).toBe(500_000 + 1_000_000); // +5tr×20%
  });
});

describe('tinhDongLuong', () => {
  it('lương theo công full tháng, không phụ cấp, không thuế (dưới giảm trừ)', () => {
    const r = tinhDongLuong(dauVao(), cauHinh());
    expect(r.giaTriTungKhoan.LUONG_CONG).toBe(5_500_000);
    expect(r.giaTriTungKhoan.AN_CA).toBe(1_200_000); // 50k×24
    expect(r.tongThuNhap).toBe(6_700_000);
    expect(r.thue).toBe(0); // dưới giảm trừ bản thân
    expect(r.thucLinh).toBe(6_700_000);
  });

  it('thử việc hưởng 85%', () => {
    const r = tinhDongLuong(dauVao({ congThuong: 0, congThuViec: 24 }), cauHinh());
    expect(r.giaTriTungKhoan.LUONG_CONG).toBe(lamTronTheo(5_500_000 / 24 * 24 * 0.85, 1000));
  });

  it('ăn ca vượt trần 1.2tr: phần vượt chịu thuế', () => {
    // base cao để phát sinh thuế; đặt ăn ca dinhMuc lớn
    const ch = cauHinh();
    const r = tinhDongLuong(dauVao({ base: 15_000_000 }), ch);
    // ăn ca = 50k×24 = 1.2tr = đúng trần → miễn toàn bộ
    expect(r.giaTriTungKhoan.AN_CA).toBe(1_200_000);
    expect(r.thuNhapMienThue).toBe(1_200_000); // (không đóng BH nên chỉ ăn ca miễn)
  });

  it('BHXH theo MỨC KHAI BÁO ở cả 2 mức (dongBH)', () => {
    const rThucTe = tinhDongLuong(dauVao({ base: 15_000_000, mucKhaiBao: 5_500_000, dongBH: true }), cauHinh());
    expect(rThucTe.bhxh).toBe(lamTronTheo(0.105 * 5_500_000, 1000)); // theo 5.5tr, KHÔNG theo 15tr
  });

  it('cam kết → thuế 0', () => {
    const r = tinhDongLuong(dauVao({ base: 50_000_000, camKet: true }), cauHinh());
    expect(r.thue).toBe(0);
  });

  it('thời vụ → 10% nếu ≥ ngưỡng, dưới ngưỡng → 0', () => {
    const r = tinhDongLuong(dauVao({ base: 10_000_000, thoiVu: true }), cauHinh());
    const tnCT = r.tongThuNhap - r.thuNhapMienThue;
    expect(r.thue).toBe(lamTronTheo(0.1 * tnCT, 1000));
    const nho = tinhDongLuong(dauVao({ base: 1_000_000, congThuong: 4, thoiVu: true }), cauHinh());
    expect(nho.thue).toBe(0); // dưới 2tr
  });

  it('người phụ thuộc giảm thu nhập tính thuế', () => {
    const r0 = tinhDongLuong(dauVao({ base: 40_000_000, soNguoiPhuThuoc: 0 }), cauHinh());
    const r2 = tinhDongLuong(dauVao({ base: 40_000_000, soNguoiPhuThuoc: 2 }), cauHinh());
    expect(r2.giamTru).toBe(15_500_000 + 2 * 6_200_000);
    expect(r2.thuNhapTinhThue).toBeLessThan(r0.thuNhapTinhThue);
  });

  it('thêm một khoản NHAP_THEO_KY → tổng thu nhập tăng đúng', () => {
    const r = tinhDongLuong(dauVao({ nhapTheoKy: { HIEU_SUAT: 3_000_000 } }), cauHinh());
    expect(r.giaTriTungKhoan.HIEU_SUAT).toBe(3_000_000);
    expect(r.tongThuNhap).toBe(6_700_000 + 3_000_000);
  });

  it('tắt chiuThue của ăn ca → không cộng vào thu nhập miễn kiểu "trần" mà miễn cả khoản', () => {
    const ch = cauHinh();
    ch.khoanLuong[1].chiuThue = false; // ăn ca không chịu thuế
    const r = tinhDongLuong(dauVao({ base: 15_000_000 }), ch);
    expect(r.thuNhapMienThue).toBe(1_200_000); // cả khoản ăn ca (=1.2tr) miễn
  });
});
```

- [ ] **Step 2: Chạy test → FAIL** — Run: `cd be && export PATH="/Users/os_anhvt/.nvm/versions/node/v22.0.0/bin:$PATH" && npx jest libs/core/src/luong/tinh-luong.spec.ts`. Expected: FAIL (module `./tinh-luong` chưa có).

- [ ] **Step 3: Viết engine** — `be/libs/core/src/luong/tinh-luong.ts`:

```ts
import {
  CauHinhLuongData,
  DauVaoDongLuong,
  KetQuaLuong,
  KhoanLuong,
  BacThue,
} from '@app/entities';

export function lamTronTheo(x: number, buoc: number): number {
  if (!buoc || buoc <= 0) return x;
  return Math.round(x / buoc) * buoc;
}

/** Thuế lũy tiến từng phần theo danh sách bậc (đã theo `den` tăng dần, bậc cuối den=null). */
export function thueLuyTien(tntt: number, bac: BacThue[]): number {
  if (tntt <= 0) return 0;
  let thue = 0;
  let moc = 0;
  for (const b of bac) {
    const tran = b.den == null ? Infinity : b.den;
    if (tntt > moc) {
      thue += (Math.min(tntt, tran) - moc) * b.suat;
    }
    moc = tran;
    if (tntt <= tran) break;
  }
  return thue;
}

function tinhKhoan(
  khoan: KhoanLuong,
  dv: DauVaoDongLuong,
  ch: CauHinhLuongData,
): number {
  const congChuan = ch.congChuan || 24;
  const tyLeTV = ch.thuViec.tyLe;
  let x = 0;
  switch (khoan.loaiCongThuc) {
    case 'LUONG_THEO_CONG':
      x =
        (dv.base / congChuan) * (dv.congThuong + dv.congKhac) +
        (dv.base / congChuan) * dv.congThuViec * tyLeTV;
      break;
    case 'DINH_MUC_x_CONG':
      x = (khoan.thamSo.dinhMuc ?? 0) * dv.congThuong;
      break;
    case 'CO_DINH_THANG': {
      const soTien =
        khoan.thamSo.nguonHoSo === 'phuCapCoDinh'
          ? dv.phuCapCoDinh
          : khoan.thamSo.soTien ?? 0;
      x =
        (soTien / congChuan) *
        (dv.congThuong + dv.congThuViec * tyLeTV);
      break;
    }
    case 'PHAN_TRAM_BASE':
      x = (khoan.thamSo.tyLe ?? 0) * dv.base;
      break;
    case 'NHAP_THEO_KY':
      x = dv.nhapTheoKy[khoan.ma] ?? 0;
      break;
  }
  return lamTronTheo(x, ch.lamTron);
}

export function tinhDongLuong(
  dv: DauVaoDongLuong,
  ch: CauHinhLuongData,
): KetQuaLuong {
  const khoanSap = [...ch.khoanLuong].sort((a, b) => a.thuTu - b.thuTu);

  const giaTriTungKhoan: Record<string, number> = {};
  for (const k of khoanSap) giaTriTungKhoan[k.ma] = tinhKhoan(k, dv, ch);

  const tongThuNhap = khoanSap
    .filter((k) => k.vaoTongThuNhap)
    .reduce((s, k) => s + giaTriTungKhoan[k.ma], 0);

  const thuNhapMienThue = khoanSap.reduce((s, k) => {
    const v = giaTriTungKhoan[k.ma];
    if (!k.chiuThue) return s + v; // cả khoản miễn
    if (k.tranMienThue != null) return s + Math.min(v, k.tranMienThue); // phần ≤ trần miễn
    return s;
  }, 0);

  const baseBHXH =
    ch.bhxh.canCu === 'MUC_KHAI_BAO' ? dv.mucKhaiBao : dv.base;
  const bhxh = dv.dongBH ? lamTronTheo(ch.bhxh.tyLe * baseBHXH, ch.lamTron) : 0;

  let thue = 0;
  let giamTru = 0;
  let thuNhapTinhThue = 0;
  if (dv.camKet && ch.quyTacCamKet.mienThue) {
    thue = 0;
  } else if (dv.thoiVu) {
    const tnCT = Math.max(0, tongThuNhap - thuNhapMienThue);
    thue =
      tnCT >= ch.quyTacThoiVu.nguong
        ? lamTronTheo(ch.quyTacThoiVu.tyLe * tnCT, ch.lamTron)
        : 0;
  } else {
    giamTru = ch.giamTruBanThan + dv.soNguoiPhuThuoc * ch.giamTruNPT;
    thuNhapTinhThue = Math.max(
      0,
      tongThuNhap - thuNhapMienThue - bhxh - giamTru,
    );
    thue = lamTronTheo(thueLuyTien(thuNhapTinhThue, ch.bacThue), ch.lamTron);
  }

  const thucLinh = tongThuNhap - bhxh - thue - dv.tamUng - dv.khauTruKhac;

  return {
    giaTriTungKhoan,
    tongThuNhap,
    thuNhapMienThue,
    bhxh,
    giamTru,
    thuNhapTinhThue,
    thue,
    thucLinh,
  };
}
```

- [ ] **Step 4: Chạy test → PASS** — Run: `cd be && export PATH="/Users/os_anhvt/.nvm/versions/node/v22.0.0/bin:$PATH" && npx jest libs/core/src/luong/tinh-luong.spec.ts`. Expected: PASS toàn bộ. Nếu FAIL do đường dẫn `@app/entities` chưa build: chạy `yarn build` một lần rồi test lại; xem lại tsconfig path mapping.

- [ ] **Step 5: Barrel `@app/core`** — thêm `export * from './luong/tinh-luong';` vào barrel core (tìm file `be/libs/core/src/index.ts`; nếu core export theo thư mục con thì thêm đúng chỗ). Build: `cd be && npx tsc --noEmit -p tsconfig.json 2>/dev/null || true`.

- [ ] **Step 6: Commit**
```bash
cd /Users/os_anhvt/Documents/Dino/hrm
git add be/libs/core/src/luong/ be/libs/core/src/index.ts
git commit -m "feat(be): engine tính lương thuần, config động (thuế lũy tiến/khoản/trần theo cấu hình)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Entities lương + mở rộng Employee

**Files:**
- Create: `be/libs/entities/src/luong/cau-hinh-luong.entity.ts`
- Create: `be/libs/entities/src/luong/dong-luong.entity.ts`
- Modify: `be/libs/entities/src/luong/index.ts` (thêm export 2 entity)
- Modify: `be/libs/entities/src/nhan-su/employee.entity.ts` (thêm trường lương)

**Interfaces:**
- Consumes: types Task 1.
- Produces: entities `CauHinhLuong`, `DongLuong`; Employee có thêm `luongThoaThuan`, `mucKhaiBao`, `phuCapCoDinh`, `soNguoiPhuThuoc`, `dongBH`, `thoiVu`, `camKet`.

- [ ] **Step 1: `cau-hinh-luong.entity.ts`** (một bản/tenant; lưu toàn bộ `CauHinhLuongData` dạng cột):

```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { KhoanLuong, BacThue } from './luong.types';

@Entity('cau_hinh_luong')
export class CauHinhLuong extends BaseEntity {
  @Column({ default: 5_500_000 }) mucKhaiBaoMacDinh: number;
  @Column({ default: 24 }) congChuan: number;
  @Column('json', { nullable: true }) khoanLuong: KhoanLuong[];
  @Column({ default: 15_500_000 }) giamTruBanThan: number;
  @Column({ default: 6_200_000 }) giamTruNPT: number;
  @Column('json', { nullable: true }) bhxh: { tyLe: number; canCu: 'MUC_KHAI_BAO' | 'LUONG_THOA_THUAN' };
  @Column('json', { nullable: true }) bacThue: BacThue[];
  @Column('json', { nullable: true }) thuViec: { tyLe: number };
  @Column('json', { nullable: true }) quyTacThoiVu: { tyLe: number; nguong: number };
  @Column('json', { nullable: true }) quyTacCamKet: { mienThue: boolean };
  @Column({ default: 1000 }) lamTron: number;
  @Column({ default: true }) isActive: boolean;
}

export interface CauHinhLuongEntities { CauHinhLuong: typeof CauHinhLuong; }
declare module '../entities' { interface Entities extends CauHinhLuongEntities {} }
```

- [ ] **Step 2: `dong-luong.entity.ts`** (một NV/kỳ; snapshot đầu vào + kết quả 2 mức):

```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { KetQuaLuong } from './luong.types';

@Entity('dong_luong')
export class DongLuong extends BaseEntity {
  @Column() thang: string; // 'YYYY-MM'
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;

  // Snapshot đầu vào (đóng băng khi chốt kỳ)
  @Column({ default: 0 }) congThuong: number;
  @Column({ default: 0 }) congThuViec: number;
  @Column({ default: 0 }) congKhac: number;
  @Column({ default: 0 }) luongThoaThuan: number;
  @Column({ default: 0 }) mucKhaiBao: number;
  @Column({ default: 0 }) phuCapCoDinh: number;
  @Column({ default: 0 }) soNguoiPhuThuoc: number;
  @Column({ default: false }) dongBH: boolean;
  @Column({ default: false }) thoiVu: boolean;
  @Column({ default: false }) camKet: boolean;
  @Column({ default: 0 }) tamUng: number;
  @Column({ default: 0 }) khauTruKhac: number;
  @Column('json', { nullable: true }) nhapTheoKy: Record<string, number>;

  // Kết quả engine cho hai mức
  @Column('json', { nullable: true }) khaiBao: KetQuaLuong;
  @Column('json', { nullable: true }) thucTe: KetQuaLuong;

  @Column({ default: 'nhap' }) trangThai: string; // nhap|chot (theo kỳ)
  @Column({ default: true }) isActive: boolean;
}

export interface DongLuongEntities { DongLuong: typeof DongLuong; }
declare module '../entities' { interface Entities extends DongLuongEntities {} }
```

- [ ] **Step 3: Cập nhật `be/libs/entities/src/luong/index.ts`**:
```ts
export * from './luong.types';
export * from './cau-hinh-luong.entity';
export * from './dong-luong.entity';
```

- [ ] **Step 4: Thêm trường lương vào Employee** — trong `be/libs/entities/src/nhan-su/employee.entity.ts`, thêm trước `@Column({ default: true }) isActive: boolean;`:
```ts
  // ── Lương (P4) ──
  @Column({ default: 0 }) luongThoaThuan: number;
  @Column({ nullable: true }) mucKhaiBao?: number; // rỗng → dùng mucKhaiBaoMacDinh
  @Column({ default: 0 }) phuCapCoDinh: number;
  @Column({ default: 0 }) soNguoiPhuThuoc: number;
  @Column({ default: false }) dongBH: boolean;
  @Column({ default: false }) thoiVu: boolean;
  @Column({ default: false }) camKet: boolean;
```

- [ ] **Step 5: Build** — Run: `cd be && export PATH="/Users/os_anhvt/.nvm/versions/node/v22.0.0/bin:$PATH" && yarn build 2>&1 | tail -15`. Expected: build entities OK, không lỗi type.

- [ ] **Step 6: Commit**
```bash
cd /Users/os_anhvt/Documents/Dino/hrm
git add be/libs/entities/src/luong/ be/libs/entities/src/nhan-su/employee.entity.ts
git commit -m "feat(be): entity CauHinhLuong + DongLuong + trường lương ở Employee

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Seed cấu hình mặc định + DTO

**Files:**
- Create: `be/apps/config-service/src/bang-luong/cau-hinh-luong.seed.ts`
- Create: `be/apps/config-service/src/bang-luong/dto/cap-nhat-cau-hinh-luong.dto.ts`
- Create: `be/apps/config-service/src/bang-luong/dto/tong-hop-ky.dto.ts`
- Create: `be/apps/config-service/src/bang-luong/dto/cap-nhat-dong-luong.dto.ts`
- Create: `be/apps/config-service/src/bang-luong/dto/index.ts`

**Interfaces:**
- Produces: `CAU_HINH_LUONG_MAC_DINH: CauHinhLuongData`; DTO `CapNhatCauHinhLuongDto`, `TongHopKyDto`, `CapNhatDongLuongDto`.

- [ ] **Step 1: Seed mặc định** — `cau-hinh-luong.seed.ts` (đúng file 2026):
```ts
import { CauHinhLuongData } from '@app/entities';

export const CAU_HINH_LUONG_MAC_DINH: CauHinhLuongData = {
  mucKhaiBaoMacDinh: 5_500_000,
  congChuan: 24,
  khoanLuong: [
    { ma: 'LUONG_CONG', ten: 'Lương theo công', loaiCongThuc: 'LUONG_THEO_CONG', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: true, thuTu: 1 },
    { ma: 'AN_CA', ten: 'Ăn ca', loaiCongThuc: 'DINH_MUC_x_CONG', thamSo: { dinhMuc: 50_000 }, chiuThue: true, tranMienThue: 1_200_000, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 2 },
    { ma: 'PHU_CAP', ten: 'Phụ cấp cố định', loaiCongThuc: 'CO_DINH_THANG', thamSo: { nguonHoSo: 'phuCapCoDinh' }, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 3 },
    { ma: 'HIEU_SUAT', ten: 'Hiệu suất', loaiCongThuc: 'NHAP_THEO_KY', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 4 },
    { ma: 'THUONG', ten: 'Thưởng', loaiCongThuc: 'NHAP_THEO_KY', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 5 },
  ],
  giamTruBanThan: 15_500_000,
  giamTruNPT: 6_200_000,
  bhxh: { tyLe: 0.105, canCu: 'MUC_KHAI_BAO' },
  bacThue: [
    { den: 10_000_000, suat: 0.05 },
    { den: 30_000_000, suat: 0.1 },
    { den: 60_000_000, suat: 0.2 },
    { den: 100_000_000, suat: 0.3 },
    { den: null, suat: 0.35 },
  ],
  thuViec: { tyLe: 0.85 },
  quyTacThoiVu: { tyLe: 0.1, nguong: 2_000_000 },
  quyTacCamKet: { mienThue: true },
  lamTron: 1000,
};
```

- [ ] **Step 2: DTO cập nhật cấu hình** — `cap-nhat-cau-hinh-luong.dto.ts` (nhận nguyên `CauHinhLuongData`, validate mức cơ bản; cho phép object lồng — dùng `@IsObject/@IsArray/@IsNumber` gọn, KHÔNG cần validate sâu từng khoản ở phase này, chỉ chặn kiểu sai):
```ts
import { IsArray, IsNumber, IsObject, IsOptional } from 'class-validator';
import { KhoanLuong, BacThue } from '@app/entities';

export class CapNhatCauHinhLuongDto {
  @IsOptional() @IsNumber() mucKhaiBaoMacDinh?: number;
  @IsOptional() @IsNumber() congChuan?: number;
  @IsOptional() @IsArray() khoanLuong?: KhoanLuong[];
  @IsOptional() @IsNumber() giamTruBanThan?: number;
  @IsOptional() @IsNumber() giamTruNPT?: number;
  @IsOptional() @IsObject() bhxh?: { tyLe: number; canCu: 'MUC_KHAI_BAO' | 'LUONG_THOA_THUAN' };
  @IsOptional() @IsArray() bacThue?: BacThue[];
  @IsOptional() @IsObject() thuViec?: { tyLe: number };
  @IsOptional() @IsObject() quyTacThoiVu?: { tyLe: number; nguong: number };
  @IsOptional() @IsObject() quyTacCamKet?: { mienThue: boolean };
  @IsOptional() @IsNumber() lamTron?: number;
}
```

- [ ] **Step 3: DTO tổng hợp kỳ** — `tong-hop-ky.dto.ts`:
```ts
import { Matches } from 'class-validator';
export class TongHopKyDto {
  @Matches(/^\d{4}-\d{2}$/, { message: 'Tháng phải có định dạng YYYY-MM' })
  thang: string;
}
```

- [ ] **Step 4: DTO cập nhật dòng (khoản biến động kỳ)** — `cap-nhat-dong-luong.dto.ts`:
```ts
import { IsNumber, IsObject, IsOptional } from 'class-validator';
export class CapNhatDongLuongDto {
  @IsOptional() @IsObject() nhapTheoKy?: Record<string, number>;
  @IsOptional() @IsNumber() tamUng?: number;
  @IsOptional() @IsNumber() khauTruKhac?: number;
}
```

- [ ] **Step 5: Barrel** — `dto/index.ts`:
```ts
export * from './cap-nhat-cau-hinh-luong.dto';
export * from './tong-hop-ky.dto';
export * from './cap-nhat-dong-luong.dto';
```

- [ ] **Step 6: Build** — `cd be && export PATH="/Users/os_anhvt/.nvm/versions/node/v22.0.0/bin:$PATH" && yarn build 2>&1 | tail -8`. Expected: OK.

- [ ] **Step 7: Commit**
```bash
cd /Users/os_anhvt/Documents/Dino/hrm
git add be/apps/config-service/src/bang-luong/cau-hinh-luong.seed.ts be/apps/config-service/src/bang-luong/dto/
git commit -m "feat(be): seed cấu hình lương mặc định (file 2026) + DTO bảng lương

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Service + tổng hợp kỳ (engine × 2 mức) + test

**Files:**
- Create: `be/apps/config-service/src/bang-luong/bang-luong.service.ts`
- Create: `be/apps/config-service/src/bang-luong/bang-luong.service.spec.ts`

**Interfaces:**
- Consumes: `tinhDongLuong` (`@app/core`), `CAU_HINH_LUONG_MAC_DINH`, entities, DTO.
- Produces: `BangLuong_Service` với: `layCauHinh()`, `capNhatCauHinh(dto)`, `tongHop(thang)`, `danhSachDong(thang)`, `capNhatDong(id, dto)`, `chot(thang)`, `moLai(thang)`.

- [ ] **Step 1: Viết test thất bại** — `bang-luong.service.spec.ts` theo khuôn `bang-cong.service.spec.ts` (mock repo bằng store mảng). Test chính:
  - `layCauHinh()`: chưa có → tạo bản mặc định (seed) rồi trả.
  - `tongHop('2026-06')`: đọc employees active + công (mock nguồn công) → tạo `DongLuong` mỗi NV với `khaiBao` (base=mucKhaiBao) và `thucTe` (base=luongThoaThuan) khớp `tinhDongLuong`; `mucKhaiBao` rỗng → dùng `mucKhaiBaoMacDinh`; chạy lại KHÔNG nhân đôi dòng (upsert theo {thang,employeeId}).
  - `capNhatDong(id, {nhapTheoKy:{HIEU_SUAT:...}})`: cập nhật snapshot rồi tính lại `khaiBao`/`thucTe` của dòng.
  - `chot`/`moLai`: đổi `trangThai` các dòng của kỳ; đã chốt thì `capNhatDong` từ chối (throw).

  (Viết đầy đủ mock store + assertion — mô phỏng `matchesWhere` như bang-cong spec. Dùng `tinhDongLuong` thật để so kết quả, không mock engine.)

- [ ] **Step 2: Chạy test → FAIL** — `cd be && npx jest apps/config-service/src/bang-luong/bang-luong.service.spec.ts`.

- [ ] **Step 3: Viết service** — điểm mấu chốt (`tongHop`):
  - Đọc `CauHinhLuong` (layCauHinh, tự seed nếu chưa có).
  - `employeeRepo.find({ where: { isActive: true } })`.
  - Với mỗi NV: lấy công tháng từ **nguồn công** — phase này đọc từ repo bảng công/bản ghi (inject `Timesheet` repo hoặc gọi service công). Ánh xạ: `congThuong` = số công đủ của tháng; `congThuViec`/`congKhac` = 0 nếu chưa có nguồn rõ (đánh dấu để FE cảnh báo). **Ghi chú trong code**: ánh xạ chi tiết chốt khi nối thật; tối thiểu đọc `soNgayCong` từ `Timesheet` của {thang,employeeId} nếu có, else 0.
  - Dựng `DauVaoDongLuong` cho 2 mức (base khai báo = `emp.mucKhaiBao ?? ch.mucKhaiBaoMacDinh`; base thực tế = `emp.luongThoaThuan`), `nhapTheoKy` giữ từ dòng cũ nếu tổng hợp lại (không mất số đã nhập).
  - Gọi `tinhDongLuong` 2 lần, lưu `khaiBao`/`thucTe`, upsert `DongLuong`.
  - `remove`/guard chốt: nếu kỳ `chot` thì `capNhatDong` throw `BadRequestException('Kỳ đã chốt, mở lại để sửa')`.
  - Dùng idiom `ObjectId` động, `NotFoundException` tiếng Việt (như bang-cong).

- [ ] **Step 4: Chạy test → PASS** — `cd be && npx jest apps/config-service/src/bang-luong/bang-luong.service.spec.ts`.

- [ ] **Step 5: Commit**
```bash
cd /Users/os_anhvt/Documents/Dino/hrm
git add be/apps/config-service/src/bang-luong/bang-luong.service.ts be/apps/config-service/src/bang-luong/bang-luong.service.spec.ts
git commit -m "feat(be): BangLuong service — tổng hợp kỳ chạy engine cho 2 mức + chốt/mở

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Controller + Module + wire + phân quyền

**Files:**
- Create: `be/apps/config-service/src/bang-luong/bang-luong.controller.ts`
- Create: `be/apps/config-service/src/bang-luong/bang-luong.module.ts`
- Modify: `be/apps/config-service/src/config-service.module.ts`
- Modify: `be/libs/core/src/permissions/all-permissions.ts`
- Modify: `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts`

**Interfaces:**
- Consumes: `BangLuong_Service`.
- Produces: routes dưới `@Controller('bang-luong')` (gateway map `/config/bang-luong`): `GET cau-hinh`, `PUT cau-hinh`, `POST tong-hop`, `GET /` (?thang=), `PATCH :id`, `POST chot`, `POST mo-lai`.

- [ ] **Step 1: Controller** — theo khuôn `bang-cong.controller.ts` (copy chú thích lý do dùng PermissionGuard). Quyền: `GET cau-hinh` & `GET /` → `/luong/bang-luong:xem`; `PUT cau-hinh` → `/luong/cau-hinh:sua`; `POST tong-hop` → `/luong/bang-luong:them`; `PATCH :id`, `POST chot`, `POST mo-lai` → `/luong/bang-luong:sua`. Route `cau-hinh`/`tong-hop`/`chot`/`mo-lai` đặt TRƯỚC `:id` để không bị `:id` nuốt (như chú thích ở `don-cham-cong.controller.ts`).

- [ ] **Step 2: Module** — `bang-luong.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { CauHinhLuong, DongLuong, Employee, Timesheet } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { BangLuong_Service } from './bang-luong.service';
import { BangLuong_Controller } from './bang-luong.controller';

@Module({
  imports: [DatabaseModule.forFeature([CauHinhLuong, DongLuong, Employee, Timesheet])],
  controllers: [BangLuong_Controller],
  providers: [BangLuong_Service],
  exports: [BangLuong_Service],
})
export class BangLuong_Module {}
```

- [ ] **Step 3: Wire** — thêm `import { BangLuong_Module } ...` và `BangLuong_Module` vào mảng imports của `ConfigServiceModule`.

- [ ] **Step 4: Phân quyền (đồng bộ 2 file)** — thêm `'/luong/bang-luong'` và `'/luong/cau-hinh'` vào `PERMISSION_MODULES` (`be/libs/core/src/permissions/all-permissions.ts`); và vào catalog FE `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts` (nhóm mới "Lương": `{key:'/luong/bang-luong',label:'Bảng lương'}`, `{key:'/luong/cau-hinh',label:'Cấu hình lương'}`).

- [ ] **Step 5: Build + test toàn config-service** — Run: `cd be && export PATH="/Users/os_anhvt/.nvm/versions/node/v22.0.0/bin:$PATH" && yarn build 2>&1 | tail -8 && npx jest apps/config-service/src/bang-luong 2>&1 | tail -6`. Expected: build OK, test bang-luong PASS. Chạy nhanh cả suite config-service nếu nhanh: `npx jest apps/config-service 2>&1 | tail -6` — không được làm hỏng test cũ.

- [ ] **Step 6: Commit**
```bash
cd /Users/os_anhvt/Documents/Dino/hrm
git add be/apps/config-service/src/bang-luong/bang-luong.controller.ts be/apps/config-service/src/bang-luong/bang-luong.module.ts be/apps/config-service/src/config-service.module.ts be/libs/core/src/permissions/all-permissions.ts fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts
git commit -m "feat(be): controller + module bang-luong, wire config-service, +quyền module luong

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Kiểm thử tổng (sau Task 6)
- `cd be && yarn build` OK; `npx jest apps/config-service libs/core/src/luong` toàn xanh.
- (Thủ công khi deploy) chạy `ops/grant-quyen-module-moi.ts` cấp quyền module `/luong/*` cho các vai trò hiện có, nếu không 2 màn lương 403.

## Ghi chú / hoãn
- **Gateway route**: kiểm tra `be/apps/gateway` có route `/config/*` phủ `bang-luong` chưa (config-service đã ở sau `/config`); nếu cần thêm mapping thì làm ở Task 6 Step 3.
- **Nguồn công** (Task 5): phase này đọc tối thiểu `Timesheet.soNgayCong`; ánh xạ đầy đủ (thử việc/nghỉ hưởng lương) hoàn thiện khi nối với logic bảng công thực — không chặn engine.
- **Plan 2 (Frontend)** làm sau: Hồ sơ NV thêm tab Lương, service `cauHinhLuongService`/`bangLuongService`, màn Cấu hình lương (sửa khoản + bậc thuế), màn Bảng lương (2 tab khai báo/thực tế, sửa ô biến động, chốt), route + gear-menu + sidebar.

## Self-review (đối chiếu spec)
- §2 engine config động → Task 2 (types Task 1). §2.1 mô hình khoản → Task 1 + seed Task 4. §3 entities → Task 3. §5 khoản biến động kỳ → DTO Task 4 + service Task 5. §6 backend API/guard → Task 5/6. §8 test engine (bậc khác, toggle chiuThue, thêm khoản) → Task 2 spec. Không placeholder; engine + service có code/test đầy đủ; phần FE tách sang Plan 2.
