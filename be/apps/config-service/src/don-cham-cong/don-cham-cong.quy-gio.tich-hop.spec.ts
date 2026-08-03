/**
 * TÍCH HỢP `DonChamCong_Service` × `QuyGio_Service` THẬT (review nhánh,
 * IMPORTANT 7).
 *
 * Vì sao file này tồn tại: `don-cham-cong.service.spec.ts` tiêm một
 * `QuyGio_Service` MOCK HOÀN TOÀN cho cả trăm bài test, còn
 * `quy-gio.service.spec.ts` chỉ chạy quỹ với repo giả — không chỗ nào nối hai
 * bên lại. Nghĩa là toàn bộ chuỗi "duyệt đơn OT → tích quỹ → nộp nghỉ bù →
 * duyệt → đối soát" chỉ từng được khẳng định ở mức "đã gọi đúng mock". Đó là
 * lý do CRITICAL 1 và IMPORTANT 2–4 sống sót qua 14 vòng review task.
 *
 * Ở đây `QuyGio_Service` là hàng THẬT (chỉ repo là giả), nên mọi con số dưới
 * đây là số quỹ thật sự tính ra.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AttendanceRequest,
  CauHinhLuong,
  Employee,
  OvertimeBalance,
  OvertimeBalanceEntry,
} from '@app/entities';
import { DonChamCong_Service } from './don-cham-cong.service';
import { NgayLe_Service } from '../ngay-le/ngay-le.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { QuyPhep_Service } from '../quy-phep/quy-phep.service';
import { QuyGio_Service } from '../quy-gio/quy-gio.service';

// 24 hex — `findOne()`/`findEmployee()` dựng `new ObjectId(...)` trước khi
// chạm repo, nên id kiểu 'nv1' sẽ ném BSONError.
const ID_NV = '650000000000000000000101';
const T2_DEN_T6 = [1, 2, 3, 4, 5];

/**
 * Repo giả — cùng hình dạng với `repoGia()` trong `quy-gio.service.spec.ts`.
 *
 * Từ P4.2b, `QuyGio_Service.apDung()` KHÔNG còn sửa tại chỗ rồi `save()`: nó
 * tính trên bản sao rồi ghi bằng CAS qua `findOneAndUpdate()`. Nên fake trả
 * tham chiếu hay bản sao đều không còn quan trọng với quỹ giờ — nhưng
 * `findOneAndUpdate` thì BẮT BUỘC phải có, nếu không mọi lời gọi giữ chỗ ném
 * "is not a function".
 */
function repoGia(khoiTao: any[] = []) {
  const rows: any[] = [...khoiTao];
  let seq = 0;
  // CAS (P4.2b Task 1): `apDung()` của quỹ giờ ghi qua cửa này thay vì save().
  const findOneAndUpdate = jest.fn(
    async (filter: any, update: any, _opts?: any) => {
      const i = rows.findIndex((r) =>
        Object.entries(filter).every(([k, v]) => String(r[k]) === String(v)),
      );
      if (i < 0) return null;
      rows[i] = { ...rows[i], ...(update.$set ?? {}) };
      return rows[i];
    },
  );
  return {
    rows,
    findOneAndUpdate,
    manager: { getMongoRepository: () => ({ findOneAndUpdate }) },
    find: jest.fn(async ({ where }: any = {}) =>
      rows.filter((r) =>
        Object.entries(where ?? {}).every(([k, v]) => String(r[k]) === String(v)),
      ),
    ),
    findOne: jest.fn(
      async ({ where }: any = {}) =>
        rows.find((r) =>
          Object.entries(where ?? {}).every(
            ([k, v]) => String(r[k]) === String(v),
          ),
        ) ?? null,
    ),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => {
      if (!x._id) {
        seq += 1;
        // ObjectId hợp lệ để `findOne()` của đơn còn dựng lại được.
        x._id = seq.toString(16).padStart(24, '0');
        rows.push(x);
        return x;
      }
      const i = rows.findIndex((r) => String(r._id) === String(x._id));
      if (i >= 0) rows[i] = x;
      else rows.push(x);
      return x;
    }),
  };
}

const CAU_HINH = {
  soGioMoiNgay: 8,
  lamThem: {
    cheDoBu: 'chi_nghi_bu',
    heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3 },
    soThangHanDung: 6,
    khiHetHan: 'quy_ra_tien',
  },
};

async function dungHeThong(
  tuyChon: {
    ngayLe?: string[];
    quy?: any[];
    don?: any[];
    // Rollout blocker: `cauHinh: null` mô phỏng công ty CHƯA khai `lamThem`
    // (repoCauHinh phải RỖNG THẬT, không phải một hàng thiếu `lamThem`) —
    // cùng quy ước `undefined` = mặc định đã bật với `dungService()` bên
    // `quy-gio.service.spec.ts`.
    cauHinh?: any;
  } = {},
) {
  const repoDon = repoGia(tuyChon.don);
  const repoNv = repoGia([
    {
      _id: ID_NV,
      employeeId: 'NV0001',
      hoTen: 'Nguyễn Văn Hải',
      ngayChinhThuc: '2025-01-01',
      ngayLamViecTrongTuan: T2_DEN_T6,
    },
  ]);
  const repoQuy = repoGia(tuyChon.quy);
  const repoSo = repoGia();
  const repoCauHinh = repoGia(
    tuyChon.cauHinh === undefined
      ? [CAU_HINH]
      : tuyChon.cauHinh
        ? [tuyChon.cauHinh]
        : [],
  );

  const ngayLe = {
    timTheoNgay: jest.fn(async (ngay: string) =>
      (tuyChon.ngayLe ?? []).includes(ngay) ? { _id: 'le1', tuNgay: ngay } : null,
    ),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DonChamCong_Service,
      // ── HÀNG THẬT, không mock ────────────────────────────────────────
      QuyGio_Service,
      { provide: getRepositoryToken(AttendanceRequest), useValue: repoDon },
      { provide: getRepositoryToken(Employee), useValue: repoNv },
      { provide: getRepositoryToken(OvertimeBalance), useValue: repoQuy },
      { provide: getRepositoryToken(OvertimeBalanceEntry), useValue: repoSo },
      { provide: getRepositoryToken(CauHinhLuong), useValue: repoCauHinh },
      { provide: NgayLe_Service, useValue: ngayLe },
      // Không đơn nào ở đây là phep_nam nên quỹ PHÉP không bao giờ được gọi;
      // chỉ cần đủ provider để DI resolve.
      {
        provide: NhanVien_Service,
        useValue: {
          // Phải REJECT NotFoundException chứ không resolve undefined: đó
          // là hình dạng thật của "người bấm duyệt chưa gắn hồ sơ nhân
          // viên", và `laChuDonTheoHoSo()` chỉ nuốt đúng lỗi đó.
          resolveEmployeeFromUser: jest
            .fn()
            .mockRejectedValue(new NotFoundException()),
        },
      },
      {
        provide: QuyPhep_Service,
        useValue: {
          layQuyCuaNhanVien: jest.fn().mockResolvedValue([]),
          phanBoChoNgayNghi: jest.fn().mockResolvedValue([]),
          giuCho: jest.fn(),
          nhaCho: jest.fn(),
          chuyenSangDaDung: jest.fn(),
          hoanTraDaDung: jest.fn(),
        },
      },
    ],
  }).compile();

  return {
    don: module.get<DonChamCong_Service>(DonChamCong_Service),
    quyGio: module.get<QuyGio_Service>(QuyGio_Service),
    repoQuy,
    repoSo,
    repoDon,
  };
}

const HR = { id: 'hr1' } as any;

describe('Tích hợp: duyệt OT → tích quỹ → nghỉ bù → đối soát', () => {
  /**
   * Đúng lộ trình mà review nhánh yêu cầu. `2h20'` ngày lễ (hệ số 3.0) được
   * chọn vì nó là số giờ KHÔNG rơi mốc nửa giờ — `140/60 =
   * 2.3333333333333335`. (Ghi nhận trung thực: tích của riêng cặp này lại
   * sạch trong IEEE-754, cho đúng 7; cặp thật sự sinh dư là hệ số 2.0 — có
   * bài riêng ngay dưới.)
   */
  it("2h20' ngày lễ → 7 giờ quỹ; nghỉ bù 3.5 giờ → đã dùng 3.5; doiSoat lech = 0", async () => {
    const { don, quyGio, repoQuy } = await dungHeThong({
      ngayLe: ['2026-01-15'],
    });

    // 1) Nộp + duyệt đơn OT.
    const donOt = await don.create({
      employeeId: ID_NV,
      loaiDon: 'lam_them_gio',
      ngay: '2026-01-15',
      gioTu: '18:00',
      gioDen: '20:20',
    } as any);
    expect(donOt.loaiNgayOt).toBe('ngay_le');

    await don.updateStatus(String((donOt as any)._id), 'da_duyet', 'HR', HR);

    expect(repoQuy.rows).toHaveLength(1);
    expect(repoQuy.rows[0]).toMatchObject({
      kyTich: '2026-01',
      soGioTich: 7,
      soGioConLai: 7,
      hanDung: '2026-07-31',
    });

    // 2) Nộp đơn nghỉ bù theo giờ 3.5 giờ — giữ chỗ ngay lúc nộp.
    const donNghiBu = await don.create({
      employeeId: ID_NV,
      loaiDon: 'nghi_bu',
      kieuNghi: 'theo_gio',
      ngay: '2026-02-10',
      gioTu: '09:00',
      gioDen: '12:30',
    } as any);

    expect(donNghiBu.soGioNghiBu).toBe(3.5);
    expect(repoQuy.rows[0]).toMatchObject({
      soGioDangChoDuyet: 3.5,
      soGioDaDung: 0,
      soGioConLai: 3.5,
    });

    // 3) Duyệt đơn nghỉ bù.
    await don.updateStatus(String((donNghiBu as any)._id), 'da_duyet', 'HR', HR);

    expect(repoQuy.rows[0]).toMatchObject({
      soGioTich: 7,
      soGioDaDung: 3.5,
      soGioDangChoDuyet: 0,
      soGioConLai: 3.5,
    });

    // 4) Số dư hiển thị và đối soát.
    const soDu = await quyGio.soDuKhaDung(ID_NV, '2026-02-10');
    expect(soDu.soGioConLai).toBe(3.5);

    const doiSoat = await quyGio.doiSoat(ID_NV);
    expect(doiSoat).toHaveLength(1);
    expect(doiSoat[0].lech).toBe(0);
  });

  /**
   * Bản sinh dư nhị phân THẬT của kịch bản trên — không có bản vá IMPORTANT
   * 2 thì NV thấy "Bạn còn 8.333333333333334 giờ" và `doiSoat()` báo lệch
   * ~1e-15 trên một quỹ hoàn toàn đúng.
   */
  it("4h10' ngày nghỉ (hệ số 2.0) → 8.33; nghỉ bù 2h20' → còn 6; doiSoat lech = 0", async () => {
    // 2026-01-18 là Chủ nhật, ngoài lịch T2–T6 ⇒ loaiNgayOt = ngay_nghi.
    const { don, quyGio, repoQuy } = await dungHeThong();

    const donOt = await don.create({
      employeeId: ID_NV,
      loaiDon: 'lam_them_gio',
      ngay: '2026-01-18',
      gioTu: '08:00',
      gioDen: '12:10',
    } as any);
    expect(donOt.loaiNgayOt).toBe('ngay_nghi');
    expect(donOt.soGioOt).toBeCloseTo(250 / 60, 10);

    await don.updateStatus(String((donOt as any)._id), 'da_duyet', 'HR', HR);
    expect(repoQuy.rows[0].soGioTich).toBe(8.33);

    const donNghiBu = await don.create({
      employeeId: ID_NV,
      loaiDon: 'nghi_bu',
      kieuNghi: 'theo_gio',
      ngay: '2026-02-10',
      gioTu: '09:00',
      gioDen: '11:20',
    } as any);
    expect(donNghiBu.soGioNghiBu).toBe(2.33);

    await don.updateStatus(String((donNghiBu as any)._id), 'da_duyet', 'HR', HR);

    expect(repoQuy.rows[0]).toMatchObject({
      soGioDaDung: 2.33,
      soGioConLai: 6,
    });
    expect((await quyGio.soDuKhaDung(ID_NV, '2026-02-10')).soGioConLai).toBe(6);
    expect((await quyGio.doiSoat(ID_NV))[0].lech).toBe(0);
  });

  /** IMPORTANT 3 qua đường thật: đóng quỹ hết hạn rồi đối soát. */
  it('quỹ hết hạn được đóng xong vẫn đối soát về lech = 0', async () => {
    const { don, quyGio } = await dungHeThong({ ngayLe: ['2026-01-15'] });

    const donOt = await don.create({
      employeeId: ID_NV,
      loaiDon: 'lam_them_gio',
      ngay: '2026-01-15',
      gioTu: '18:00',
      gioDen: '20:20',
    } as any);
    await don.updateStatus(String((donOt as any)._id), 'da_duyet', 'HR', HR);

    // hanDung = 2026-07-31 ⇒ tới 2026-08-01 là quá hạn.
    const tomTat = await quyGio.dongQuyGio('2026-08-01', 'hr1');
    expect(tomTat).toMatchObject({ soQuyDong: 1, soGioHetHan: 7, soQuyVuongCho: 0 });

    const doiSoat = await quyGio.doiSoat(ID_NV);
    expect(doiSoat[0]).toMatchObject({ lech: 0, soGioDaDong: 7 });
  });

  /**
   * IMPORTANT 5 qua đường thật — bài mock trong `don-cham-cong.service.spec.ts`
   * chỉ chứng minh "đã gọi hàm ngược lại"; bài này chứng minh CHỖ GIỮ THẬT
   * SỰ được nhả khỏi số dư.
   *
   * Dàn cảnh: đơn nghỉ bù đang `tu_choi`, `phanBoQuyGio` trải hai kỳ. Kỳ 2
   * trong lúc đó đã bị một đơn KHÁC giữ hết chỗ, nên `giuCho()` giữ xong kỳ
   * 1 rồi ném ở kỳ 2 (guard `kiem()` của `apDung`).
   */
  it('giuCho hỏng ở kỳ 2 → chỗ giữ kỳ 1 được NHẢ LẠI, không kẹt vĩnh viễn', async () => {
    const quy = [
      {
        _id: 'b1', employeeId: ID_NV, kyTich: '2026-01',
        soGioTich: 4, soGioDaDung: 0, soGioDangChoDuyet: 0, soGioConLai: 4,
        hanDung: '2026-07-31', trangThai: 'dang_hieu_luc', isActive: true,
      },
      {
        // Đã bị một đơn khác giữ hết: giữ thêm 1 giờ sẽ vượt soGioTich.
        _id: 'b2', employeeId: ID_NV, kyTich: '2026-02',
        soGioTich: 2, soGioDaDung: 0, soGioDangChoDuyet: 2, soGioConLai: 0,
        hanDung: '2026-08-31', trangThai: 'dang_hieu_luc', isActive: true,
      },
    ];
    const donTuChoi = {
      _id: '650000000000000000000701',
      employeeId: ID_NV,
      loaiDon: 'nghi_bu',
      kieuNghi: 'theo_gio',
      ngay: '2026-03-10',
      soGioNghiBu: 3,
      phanBoQuyGio: [
        { balanceId: 'b1', kyTich: '2026-01', soGio: 2 },
        { balanceId: 'b2', kyTich: '2026-02', soGio: 1 },
      ],
      trangThai: 'tu_choi',
      isActive: true,
    };
    const { don, repoQuy } = await dungHeThong({ quy, don: [donTuChoi] });

    await expect(
      don.updateStatus('650000000000000000000701', 'cho_duyet', 'HR', HR),
    ).rejects.toThrow();

    // Vế then chốt: kỳ 1 KHÔNG còn giữ chỗ treo.
    expect(repoQuy.rows[0]).toMatchObject({
      kyTich: '2026-01',
      soGioDangChoDuyet: 0,
      soGioConLai: 4,
    });
    // Kỳ 2 không bị đụng tới (chỗ giữ của đơn KHÁC vẫn nguyên).
    expect(repoQuy.rows[1].soGioDangChoDuyet).toBe(2);
  });
});

/**
 * Rollout blocker (chốt ngay trước khi deploy P4.2a): quỹ giờ làm thêm là
 * tính năng OPT-IN theo công ty — runbook `ops/README.md` bước 4 nói rõ
 * "từ lúc lưu cấu hình, nghỉ bù bắt đầu tiêu từ quỹ và bị chặn khi hết số
 * dư". Trước bản vá này, `QuyGio_Service.soGioMoiNgay()` rơi về mặc định 8
 * khi `layCauHinh()` trả `null`, nên MỌI đơn `nghi_bu` ở MỘT công ty CHƯA
 * từng khai `lamThem` vẫn tính ra `soGioNghiBu > 0`, vẫn gọi
 * `phanBoChoNghiBu()`, và vẫn ăn 409 `KHONG_DU_SO_DU` vì quỹ luôn rỗng
 * (chưa ai từng tích) — chặn đứng TOÀN BỘ nghỉ bù ngay khi deploy code,
 * sớm hơn một nhịp so với đúng lúc HR bật tính năng.
 *
 * Dùng `QuyGio_Service` THẬT (không mock) — như describe phía trên — để
 * chứng minh bằng hành vi thật của quỹ, không phải "đã gọi đúng mock".
 */
describe('Rollout blocker: quỹ giờ là opt-in — công ty CHƯA khai lamThem', () => {
  it('công ty CHƯA khai lamThem: nghi_bu tạo thành công, KHÔNG giữ chỗ, KHÔNG chạm quỹ', async () => {
    const { don, repoQuy, repoSo } = await dungHeThong({ cauHinh: null });

    const donNghiBu = await don.create({
      employeeId: ID_NV,
      loaiDon: 'nghi_bu',
      kieuNghi: 'theo_gio',
      ngay: '2026-02-10',
      gioTu: '09:00',
      gioDen: '12:30',
    } as any);

    // Vẫn tính ra soGioNghiBu (bảng công vẫn cần con số này để ra ký hiệu
    // NB) — CHỈ khác ở chỗ không có gì đụng tới quỹ.
    expect(donNghiBu.soGioNghiBu).toBe(3.5);
    expect((donNghiBu as any).phanBoQuyGio).toBeUndefined();
    expect(repoQuy.rows).toHaveLength(0);
    expect(repoSo.rows).toHaveLength(0);
  });

  it('công ty ĐÃ khai lamThem: vẫn giữ chỗ như cũ, và vẫn 409 khi quỹ không đủ', async () => {
    const { don } = await dungHeThong(); // mặc định CAU_HINH (đã bật)

    const loi = await don
      .create({
        employeeId: ID_NV,
        loaiDon: 'nghi_bu',
        kieuNghi: 'theo_gio',
        ngay: '2026-02-10',
        gioTu: '09:00',
        gioDen: '12:30',
      } as any)
      .catch((e) => e);

    // Chưa từng có đơn OT nào được duyệt ⇒ quỹ trống thật ⇒ đúng 409 —
    // hành vi ENABLED phải giữ nguyên y hệt trước bản vá này.
    expect(loi).toBeInstanceOf(ConflictException);
    expect((loi as any).getResponse().code).toBe('QUY_GIO_KHONG_DU_SO_DU');
  });

  /**
   * Yêu cầu báo cáo: duyệt đơn OT ở công ty chưa bật vẫn KHÔNG tích gì —
   * hành vi đã có sẵn từ `tichTuDonOt()` (xem log cảnh báo), bài này xác
   * nhận nó KHÔNG bị bản vá gate ở `create()` (chỉ đụng nhánh nghi_bu) làm
   * hỏng lây.
   */
  it('công ty CHƯA khai lamThem: duyệt đơn OT vẫn không tích quỹ giờ nào', async () => {
    const { don, repoQuy, repoSo } = await dungHeThong({ cauHinh: null });

    const donOt = await don.create({
      employeeId: ID_NV,
      loaiDon: 'lam_them_gio',
      ngay: '2026-01-15',
      gioTu: '18:00',
      gioDen: '20:20',
    } as any);

    await don.updateStatus(String((donOt as any)._id), 'da_duyet', 'HR', HR);

    expect(repoQuy.rows).toHaveLength(0);
    expect(repoSo.rows).toHaveLength(0);
  });
});

describe('phanBoOt khi tạo đơn làm thêm (P4.2b Task 6)', () => {
  it('đơn vắt nửa đêm được chẻ và snapshot vào phanBoOt', async () => {
    // CAU_HINH là hình dạng P4.2a (chưa có heSoTra/khungGioDem/uuTienLoai) —
    // đúng trạng thái của mọi tenant ngay sau khi deploy P4.2b, trước khi HR
    // kịp vào lưu lại cấu hình. Phải rơi về mặc định, không được ra NaN.
    const { don } = await dungHeThong();

    const donOt = await don.create({
      employeeId: ID_NV,
      loaiDon: 'lam_them_gio',
      ngay: '2026-06-01', // thứ Hai, không lễ
      gioTu: '20:00',
      gioDen: '02:00',
    } as any);

    expect(donOt.phanBoOt).toEqual([
      { loaiNgayOt: 'ngay_thuong', soGio: 2, heSoTra: 1.5, heSoTichQuy: 1.5 },
      { loaiNgayOt: 'ngay_dem', soGio: 4, heSoTra: 1.5, heSoTichQuy: 1.5 },
    ]);
    // Ba trường dẫn xuất vẫn đúng cho màn danh sách và bộ lọc cũ.
    expect(donOt.soGioOt).toBe(6);
    expect(donOt.loaiNgayOt).toBe('ngay_dem');
    expect(donOt.heSoOt).toBe(1.5);
  });

  it('ngày lễ thắng ca đêm — một phần ngay_le, hệ số 3.0', async () => {
    const { don } = await dungHeThong({ ngayLe: ['2026-06-01'] });

    const donOt = await don.create({
      employeeId: ID_NV,
      loaiDon: 'lam_them_gio',
      ngay: '2026-06-01',
      gioTu: '20:00',
      gioDen: '02:00',
    } as any);

    expect(donOt.phanBoOt).toEqual([
      { loaiNgayOt: 'ngay_le', soGio: 6, heSoTra: 3.0, heSoTichQuy: 3.0 },
    ]);
    expect(donOt.loaiNgayOt).toBe('ngay_le');
  });

  it('quỹ tích theo phanBoOt: 2h thường ×1.5 + 4h đêm ×2.0 = 11 giờ', async () => {
    // Hệ số tích ca đêm cố ý KHÁC ngày thường: đường cũ (một phần, loại đại
    // diện `ngay_dem` → rơi về ngay_thuong 1.5) sẽ ra 6×1.5 = 9, nên con số
    // 11 chỉ đạt được nếu quỹ thật sự cộng theo từng phần.
    const { don, repoQuy } = await dungHeThong({
      cauHinh: {
        ...CAU_HINH,
        lamThem: {
          ...CAU_HINH.lamThem,
          heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3, ngay_dem: 2 },
        },
      },
    });

    const donOt = await don.create({
      employeeId: ID_NV,
      loaiDon: 'lam_them_gio',
      ngay: '2026-06-01',
      gioTu: '20:00',
      gioDen: '02:00',
    } as any);
    await don.updateStatus(String((donOt as any)._id), 'da_duyet', 'HR', HR);

    expect(repoQuy.rows[0].soGioTich).toBe(11);
  });

  it('công ty CHƯA khai lamThem thì không chẻ, giữ nguyên hành vi trước P4.2b', async () => {
    const { don } = await dungHeThong({ cauHinh: null });

    const donOt = await don.create({
      employeeId: ID_NV,
      loaiDon: 'lam_them_gio',
      ngay: '2026-06-01',
      gioTu: '20:00',
      gioDen: '02:00',
    } as any);

    expect(donOt.phanBoOt).toBeUndefined();
    expect(donOt.soGioOt).toBe(6);
    expect(donOt.loaiNgayOt).toBe('ngay_thuong');
    expect(donOt.heSoOt).toBe(1.5);
  });
});
