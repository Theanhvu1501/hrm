import type { CauHinhLuongData, Employee } from '@app/entities';
import { dungBangKhaiBaoBH } from './khaiBaoBaoHiem';

function cauHinh(over: Partial<CauHinhLuongData> = {}): CauHinhLuongData {
  return {
    mucKhaiBaoMacDinh: 5_500_000,
    congChuan: 24,
    khoanLuong: [
      { ma: 'LUONG_CONG', ten: 'Lương theo công', loaiCongThuc: 'LUONG_THEO_CONG', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: true, thuTu: 1 },
      { ma: 'PC_CHUC_VU', ten: 'Phụ cấp chức vụ', loaiCongThuc: 'TRON_THANG', thamSo: { soTien: 2_000_000 }, choPhepRieng: true, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: true, thuTu: 2 },
      { ma: 'AN_CA', ten: 'Ăn ca', loaiCongThuc: 'DINH_MUC_x_CONG', thamSo: { dinhMuc: 50_000 }, chiuThue: true, tranMienThue: 1_200_000, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 3 },
    ],
    giamTruBanThan: 15_500_000,
    giamTruNPT: 6_200_000,
    bhxh: { tyLe: 0.105, canCu: 'MUC_KHAI_BAO' },
    bacThue: [{ den: null, suat: 0.05 }],
    thuViec: { tyLe: 0.85 },
    quyTacThoiVu: { tyLe: 0.1, nguong: 2_000_000 },
    quyTacCamKet: { mienThue: true },
    bhCongTy: { tyLe: 0.215, tyLeHopDongThu2: 0.005 },
    phiCongDoan: { tyLe: 0 },
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

function nv(over: Partial<Employee> = {}): Employee {
  return {
    employeeId: 'NV0001',
    hoTen: 'Nguyễn Văn A',
    cccd: '001090000111',
    ngaySinh: '1990-01-02',
    gioiTinh: 'nam',
    diaChi: 'Hà Nội',
    chucDanh: 'Nhân viên',
    soSoBH: '0123456789',
    luongThoaThuan: 12_000_000,
    mucKhaiBao: 6_000_000,
    phuCapCoDinh: 0,
    dongBH: true,
    hopDongThu2: false,
    ngayVaoLam: '2026-01-05',
    ...over,
  } as Employee;
}

describe('dungBangKhaiBaoBH', () => {
  it('mức đóng theo căn cứ MỨC KHAI BÁO', () => {
    const [d] = dungBangKhaiBaoBH([nv()], cauHinh());
    expect(d.mucDong).toBe(6_000_000);
  });

  it('mức khai báo bỏ trống thì dùng mức mặc định của công ty', () => {
    const [d] = dungBangKhaiBaoBH([nv({ mucKhaiBao: undefined })], cauHinh());
    expect(d.mucDong).toBe(5_500_000);
  });

  it('căn cứ LƯƠNG + PHỤ CẤP: cộng đúng khoản bật cờ đóng BHXH', () => {
    const [d] = dungBangKhaiBaoBH(
      [nv()],
      cauHinh({ bhxh: { tyLe: 0.105, canCu: 'LUONG_VA_PHU_CAP' } }),
    );
    // 12tr lương + 2tr phụ cấp chức vụ; ăn ca tắt cờ nên không cộng.
    expect(d.mucDong).toBe(14_000_000);
  });

  it('cấu hình riêng của NV thắng cấu hình chung', () => {
    const [d] = dungBangKhaiBaoBH(
      [nv({ cauHinhLuongRieng: { bhxhCanCu: 'LUONG_THOA_THUAN' } })],
      cauHinh(),
    );
    expect(d.mucDong).toBe(12_000_000);
  });

  it('người không thuộc diện đóng: mức 0 và nói rõ lý do, KHÔNG biến mất khỏi bảng', () => {
    const [d] = dungBangKhaiBaoBH([nv({ dongBH: false })], cauHinh());
    expect(d.mucDong).toBe(0);
    expect(d.ghiChu).toContain('Không thuộc diện đóng BH');
  });

  it('nhắc khi người đóng BH mà chưa có số sổ', () => {
    const [d] = dungBangKhaiBaoBH([nv({ soSoBH: undefined })], cauHinh());
    expect(d.ghiChu).toContain('Chưa có số sổ BHXH');
  });

  it('mốc "từ ngày" ưu tiên ngày báo tăng, không có thì lấy ngày vào làm', () => {
    const [coBaoTang] = dungBangKhaiBaoBH(
      [nv({ ngayBatDauDongBH: '2026-03-01' })],
      cauHinh(),
    );
    expect(coBaoTang.tuNgay).toBe('2026-03-01');

    const [khongCo] = dungBangKhaiBaoBH([nv()], cauHinh());
    expect(khongCo.tuNgay).toBe('2026-01-05');
  });

  it('đánh số thứ tự liên tục và dịch giới tính sang chữ', () => {
    const ds = dungBangKhaiBaoBH(
      [nv(), nv({ employeeId: 'NV0002', gioiTinh: 'nu' })],
      cauHinh(),
    );
    expect(ds.map((d) => d.stt)).toStrictEqual([1, 2]);
    expect(ds[0].gioiTinh).toBe('Nam');
    expect(ds[1].gioiTinh).toBe('Nữ');
  });

  it('HĐLĐ thứ 2 được ghi chú để người khai không báo tăng trùng', () => {
    const [d] = dungBangKhaiBaoBH([nv({ hopDongThu2: true })], cauHinh());
    expect(d.ghiChu).toContain('HĐLĐ thứ 2');
  });
});
