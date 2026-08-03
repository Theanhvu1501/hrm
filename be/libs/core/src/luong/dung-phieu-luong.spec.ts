import { dungPhieuLuong } from './dung-phieu-luong';
import type { KhoanLuong } from '@app/entities';

const KHOAN: KhoanLuong[] = [
  { ma: 'LUONG_CONG', ten: 'Lương theo công', loaiCongThuc: 'LUONG_THEO_CONG', thamSo: {}, chiuThue: true, tranMienThue: null, vaoTongThuNhap: true, vaoBHXH: true, thuTu: 1 },
  { ma: 'AN_CA', ten: 'Ăn ca', loaiCongThuc: 'DINH_MUC_x_CONG', thamSo: {}, chiuThue: true, tranMienThue: 1_200_000, vaoTongThuNhap: true, vaoBHXH: false, thuTu: 2 },
  { ma: 'CP_NOI_BO', ten: 'Chi phí nội bộ', loaiCongThuc: 'NHAP_THEO_KY', thamSo: {}, chiuThue: false, tranMienThue: null, vaoTongThuNhap: false, vaoBHXH: false, thuTu: 8 },
];

const dong = (over: any = {}) => ({
  thang: '2026-07',
  employeeName: 'Đào Thị Kiều Oanh',
  employeeCode: 'NV0001',
  congThuong: 24, congThuViec: 0, congKhac: 0,
  // Ba số dưới đây cố ý KHÔNG là chuỗi con của bất kỳ số nào trong `thucTe`:
  // phép kiểm rò rỉ ở dưới so chuỗi thô trên JSON, nên `5500000` nằm trong
  // `15500000` (giảm trừ) sẽ báo rò rỉ giả.
  mucKhaiBao: 7_654_321,
  luongThoaThuan: 9_876_543,
  tamUng: 500_000,
  khauTruKhac: 0,
  khaiBao: { tongThuNhap: 7_654_321, thucLinh: 6_543_210 },
  thucTe: {
    giaTriTungKhoan: { LUONG_CONG: 12_000_000, AN_CA: 1_200_000, CP_NOI_BO: 999_000 },
    tongThuNhap: 13_200_000,
    thuNhapMienThue: 16_900_000,
    mienThueKhoan: 1_200_000,
    otMienThue: 0,
    bhxh: 577_500,
    giamTru: 15_500_000,
    thuNhapTinhThue: 0,
    thue: 0,
    phiCongDoan: 110_000,
    thucLinh: 12_012_500,
    chiPhiBHCongTy: 1_182_500,
    tongChiPhiCongTy: 14_382_500,
  },
  trangThai: 'chot',
  ...over,
});

describe('dungPhieuLuong', () => {
  it('lấy số từ mức THỰC TẾ, không phải khai báo', () => {
    const p = dungPhieuLuong(dong() as any, KHOAN);

    expect(p.tongThuNhap).toBe(13_200_000);
    expect(p.thucLinh).toBe(12_012_500);
  });

  it('KHÔNG mang mức khai báo ra ngoài — kiểm trên CHÍNH chuỗi JSON trả về', () => {
    // Lọc ở service chứ không ở FE: lọc phía FE thì dữ liệu vẫn đi qua đường
    // truyền và nằm trong tab Network của mọi nhân viên.
    const p = dungPhieuLuong(dong() as any, KHOAN) as any;
    const chuoi = JSON.stringify(p);

    expect(p.khaiBao).toBeUndefined();
    expect(p.mucKhaiBao).toBeUndefined();
    expect(p.luongThoaThuan).toBeUndefined();
    expect(chuoi).not.toContain('7654321');
    expect(chuoi).not.toContain('9876543');
    expect(chuoi).not.toContain('6543210');
  });

  it('ghép NHÃN tiếng Việt cho từng khoản — nhân viên không đọc được cấu hình', () => {
    const p = dungPhieuLuong(dong() as any, KHOAN);

    expect(p.khoan).toEqual([
      { ma: 'LUONG_CONG', ten: 'Lương theo công', soTien: 12_000_000 },
      { ma: 'AN_CA', ten: 'Ăn ca', soTien: 1_200_000 },
    ]);
  });

  it('BỎ khoản không vào tổng thu nhập — không phải thứ nhân viên nhận', () => {
    const p = dungPhieuLuong(dong() as any, KHOAN);
    expect(p.khoan.some((k) => k.ma === 'CP_NOI_BO')).toBe(false);
  });

  it('khoản có trong dòng lương nhưng KHÔNG còn trong cấu hình vẫn hiện, nhãn = mã', () => {
    // Cấu hình đổi giữa chừng: xoá một khoản khỏi danh mục KHÔNG được làm biến
    // mất một dòng tiền đã trả — nhân viên sẽ thấy các khoản cộng lại không ra
    // tổng thu nhập.
    const goc = dong();
    const p = dungPhieuLuong(
      dong({
        thucTe: {
          ...goc.thucTe,
          giaTriTungKhoan: { ...goc.thucTe.giaTriTungKhoan, KHOAN_CU: 300_000 },
        },
      }) as any,
      KHOAN,
    );

    expect(p.khoan).toContainEqual({ ma: 'KHOAN_CU', ten: 'KHOAN_CU', soTien: 300_000 });
  });

  it('bỏ khoản giá trị 0 — phiếu lương không liệt kê thứ không có', () => {
    const goc = dong();
    const p = dungPhieuLuong(
      dong({
        thucTe: { ...goc.thucTe, giaTriTungKhoan: { LUONG_CONG: 12_000_000, AN_CA: 0 } },
      }) as any,
      KHOAN,
    );

    expect(p.khoan.map((k) => k.ma)).toEqual(['LUONG_CONG']);
  });

  it('dòng chốt TRƯỚC P4.2c-2 không có phiCongDoan → 0, không undefined', () => {
    const t = { ...dong().thucTe } as any;
    delete t.phiCongDoan;

    const p = dungPhieuLuong(dong({ thucTe: t }) as any, KHOAN);
    expect(p.phiCongDoan).toBe(0);
  });

  it('mang đủ công, tạm ứng, khấu trừ khác, danh tính', () => {
    const p = dungPhieuLuong(dong() as any, KHOAN);

    expect(p.congThuong).toBe(24);
    expect(p.tamUng).toBe(500_000);
    expect(p.khauTruKhac).toBe(0);
    expect(p.maNhanVien).toBe('NV0001');
    expect(p.hoTen).toBe('Đào Thị Kiều Oanh');
  });
});
