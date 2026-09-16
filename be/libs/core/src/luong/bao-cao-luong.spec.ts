import type { CauHinhLuongData, DongLuong } from '@app/entities';
import {
  dungBangBaoHiem,
  dungBangCongDoan,
  dungBangThueTheoKy,
  TY_LE_QUY_MAC_DINH,
} from './bao-cao-luong';

function cauHinh(over: Partial<CauHinhLuongData> = {}): CauHinhLuongData {
  return {
    mucKhaiBaoMacDinh: 5_500_000,
    congChuan: 24,
    khoanLuong: [
      { ma: 'LUONG_CONG', ten: 'Lương theo công', loaiCongThuc: 'LUONG_THEO_CONG', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: true, thuTu: 1 },
      { ma: 'PC_CHUC_VU', ten: 'Phụ cấp chức vụ', loaiCongThuc: 'TRON_THANG', thamSo: { soTien: 2_000_000 }, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: true, thuTu: 2 },
    ],
    giamTruBanThan: 15_500_000,
    giamTruNPT: 6_200_000,
    bhxh: { tyLe: 0.105, canCu: 'MUC_KHAI_BAO' },
    bacThue: [{ den: null, suat: 0.05 }],
    thuViec: { tyLe: 0.85 },
    quyTacThoiVu: { tyLe: 0.1, nguong: 2_000_000 },
    quyTacCamKet: { mienThue: true },
    bhCongTy: { tyLe: 0.215, tyLeHopDongThu2: 0.005 },
    phiCongDoan: { tyLe: 0.01 },
    lamTron: 1000,
    soGioMoiNgay: 8,
    lamThem: {
      cheDoBu: 'chi_nghi_bu',
      heSoTra: {},
      heSoTichQuy: {},
      khungGioDem: null,
      uuTienLoai: [],
      mienThueChenh: [],
      soThangHanDung: null,
      khiHetHan: 'huy_bo',
    },
    ...over,
  };
}

function dong(over: Partial<DongLuong> = {}): DongLuong {
  return {
    thang: '2026-09',
    employeeId: 'nv-1',
    employeeName: 'Nguyễn Văn A',
    employeeCode: 'NV0001',
    luongThoaThuan: 12_000_000,
    mucKhaiBao: 6_000_000,
    phuCapCoDinh: 0,
    dongBH: true,
    hopDongThu2: false,
    cauHinhApDung: {
      congChuan: 24,
      thuViecTyLe: 0.85,
      bhxhTyLe: 0.105,
      bhxhCanCu: 'MUC_KHAI_BAO',
    },
    ...over,
  } as unknown as DongLuong;
}

describe('dungBangBaoHiem', () => {
  it('trích theo từng quỹ trên nền đóng, tổng 32%', () => {
    const [d] = dungBangBaoHiem([dong()], cauHinh());

    expect(d.mucDong).toBe(6_000_000);
    expect(d.omDauThaiSan).toBe(180_000); // 3%
    expect(d.huuTriTuTuat).toBe(1_320_000); // 22%
    expect(d.bhyt).toBe(270_000); // 4,5%
    expect(d.bhtn).toBe(120_000); // 2%
    expect(d.tnldBnn).toBe(30_000); // 0,5%
    expect(d.cong).toBe(1_920_000); // 32%
  });

  it('tách đúng phần NLĐ và phần doanh nghiệp', () => {
    const [d] = dungBangBaoHiem([dong()], cauHinh());
    expect(d.nld).toBe(630_000); // 10,5%
    expect(d.dn).toBe(1_290_000); // 21,5%
    expect(d.nld + d.dn).toBe(d.cong);
  });

  it('người KHÔNG đóng BH không có mặt trong bảng', () => {
    expect(dungBangBaoHiem([dong({ dongBH: false })], cauHinh())).toStrictEqual(
      [],
    );
  });

  it('HĐLĐ thứ 2: NLĐ không bị trừ, doanh nghiệp chỉ chịu BHTNLĐ-BNN', () => {
    const [d] = dungBangBaoHiem([dong({ hopDongThu2: true })], cauHinh());
    expect(d.nld).toBe(0);
    expect(d.dn).toBe(30_000); // 0,5%
  });

  it('căn cứ LƯƠNG + PHỤ CẤP: nền đóng gồm cả phụ cấp bật cờ vaoBHXH', () => {
    const [d] = dungBangBaoHiem(
      [
        dong({
          cauHinhApDung: {
            congChuan: 24,
            thuViecTyLe: 0.85,
            bhxhTyLe: 0.105,
            bhxhCanCu: 'LUONG_VA_PHU_CAP',
          },
        }),
      ],
      cauHinh(),
    );
    expect(d.mucDong).toBe(14_000_000); // 12tr + 2tr
  });

  it('đánh số thứ tự liên tục sau khi đã lọc người không đóng', () => {
    const ds = dungBangBaoHiem(
      [
        dong({ employeeId: 'a', employeeCode: 'NV0001' }),
        dong({ employeeId: 'b', dongBH: false }),
        dong({ employeeId: 'c', employeeCode: 'NV0003' }),
      ],
      cauHinh(),
    );
    expect(ds.map((d) => d.stt)).toStrictEqual([1, 2]);
  });

  it('tỷ lệ quỹ truyền vào thắng mặc định', () => {
    const [d] = dungBangBaoHiem([dong()], cauHinh(), {
      ...TY_LE_QUY_MAC_DINH,
      bhyt: 0.05,
    });
    expect(d.bhyt).toBe(300_000);
  });
});

describe('dungBangCongDoan', () => {
  it('tính theo tỷ lệ trong cấu hình, trên cùng nền với BHXH', () => {
    const [d] = dungBangCongDoan([dong()], cauHinh());
    expect(d.mucDong).toBe(6_000_000);
    expect(d.tyLe).toBe(0.01);
    expect(d.soTien).toBe(60_000);
  });

  it('kỳ nhiều tháng: cộng dồn thành MỘT dòng cho mỗi người', () => {
    const ds = dungBangCongDoan(
      [dong({ thang: '2026-07' }), dong({ thang: '2026-08' })],
      cauHinh(),
    );
    expect(ds).toHaveLength(1);
    expect(ds[0].soTien).toBe(120_000);
    expect(ds[0].mucDong).toBe(12_000_000);
  });

  it('người không đóng BH thì không thu phí công đoàn', () => {
    expect(dungBangCongDoan([dong({ dongBH: false })], cauHinh())).toStrictEqual(
      [],
    );
  });
});

describe('dungBangThueTheoKy', () => {
  function dongCoThue(over: Partial<DongLuong> = {}): DongLuong {
    return dong({
      khaiBao: {
        giaTriTungKhoan: {},
        tongThuNhap: 20_000_000,
        thuNhapMienThue: 0,
        mienThueKhoan: 1_000_000,
        otMienThue: 200_000,
        bhxh: 630_000,
        giamTru: 15_500_000,
        thuNhapTinhThue: 2_670_000,
        thue: 133_000,
        phiCongDoan: 0,
        thucLinh: 0,
        chiPhiBHCongTy: 0,
        tongChiPhiCongTy: 0,
      },
      ...over,
    } as Partial<DongLuong>);
  }

  it('CỘNG số đã tính từng tháng, không tính lại thuế trên tổng kỳ', () => {
    const ds = dungBangThueTheoKy([
      dongCoThue({ thang: '2026-07' }),
      dongCoThue({ thang: '2026-08' }),
      dongCoThue({ thang: '2026-09' }),
    ]);

    expect(ds).toHaveLength(1);
    expect(ds[0].soKy).toBe(3);
    expect(ds[0].thue).toBe(399_000); // 133.000 × 3
    expect(ds[0].tongThuNhap).toBe(60_000_000);
    expect(ds[0].mienThue).toBe(3_600_000); // (1tr + 200k) × 3
  });

  it('dòng chưa có kết quả mức đang xem thì bỏ qua, không đẻ dòng rỗng', () => {
    expect(dungBangThueTheoKy([dong()])).toStrictEqual([]);
  });

  it('chọn mức THỰC TẾ thì đọc đúng khối đó', () => {
    const d = dongCoThue();
    (d as any).thucTe = { ...(d as any).khaiBao, thue: 999_000 };
    const [ra] = dungBangThueTheoKy([d], 'thucTe');
    expect(ra.thue).toBe(999_000);
  });

  it('nhiều người: sắp theo mã nhân viên và đánh lại số thứ tự', () => {
    const ds = dungBangThueTheoKy([
      dongCoThue({ employeeId: 'b', employeeCode: 'NV0009' }),
      dongCoThue({ employeeId: 'a', employeeCode: 'NV0001' }),
    ]);
    expect(ds.map((d) => d.maNhanVien)).toStrictEqual(['NV0001', 'NV0009']);
    expect(ds.map((d) => d.stt)).toStrictEqual([1, 2]);
  });
});
