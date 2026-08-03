import { tinhDongThemGio } from './tinh-them-gio';

const HE_SO = { ngay_thuong: 1.5, ngay_nghi: 2.0, ngay_le: 3.0, ngay_dem: 1.5 };

describe('tinhDongThemGio', () => {
  it('CA KIỂM CHUẨN từ sheet LÀM THÊM GIỜ: 5.500.000, 35 giờ ngày thường', () => {
    const kq = tinhDongThemGio({
      luongThang: 5_500_000,
      congChuan: 24,
      soGioMoiNgay: 8,
      gioTheoLoai: { ngay_thuong: 35 },
      heSoTra: HE_SO,
      truMotDonVi: false,
    });

    expect(kq.donGiaNgay).toBeCloseTo(229_166.6667, 4);
    expect(kq.donGiaGio).toBeCloseTo(28_645.8333, 4);
    expect(kq.theoLoai.ngay_thuong.thanhTien).toBeCloseTo(1_503_906.25, 2);
    expect(kq.tongTien).toBeCloseTo(1_503_906.25, 2);
  });

  it('cộng nhiều loại, mỗi loại một hệ số', () => {
    const kq = tinhDongThemGio({
      luongThang: 5_500_000,
      congChuan: 24,
      soGioMoiNgay: 8,
      gioTheoLoai: { ngay_thuong: 10, ngay_le: 8 },
      heSoTra: HE_SO,
      truMotDonVi: false,
    });

    const g = 5_500_000 / 24 / 8;
    expect(kq.theoLoai.ngay_thuong).toEqual({
      soGio: 10,
      heSo: 1.5,
      thanhTien: 10 * g * 1.5,
    });
    expect(kq.theoLoai.ngay_le).toEqual({
      soGio: 8,
      heSo: 3.0,
      thanhTien: 8 * g * 3.0,
    });
    expect(kq.tongTien).toBeCloseTo(10 * g * 1.5 + 8 * g * 3.0, 6);
  });

  it('truMotDonVi: chế độ nghỉ bù + trả chênh chỉ trả phần vượt 1.0', () => {
    const kq = tinhDongThemGio({
      luongThang: 5_500_000,
      congChuan: 24,
      soGioMoiNgay: 8,
      gioTheoLoai: { ngay_le: 8 },
      heSoTra: HE_SO,
      truMotDonVi: true,
    });

    const g = 5_500_000 / 24 / 8;
    // Phần 1.0 đã vào quỹ nghỉ bù, chỉ trả 3.0 − 1.0 = 2.0.
    expect(kq.theoLoai.ngay_le.heSo).toBe(2.0);
    expect(kq.theoLoai.ngay_le.thanhTien).toBeCloseTo(8 * g * 2.0, 6);
  });

  it('truMotDonVi không đẩy hệ số xuống ÂM khi hệ số cấu hình < 1', () => {
    // Hệ số < 1 là cấu hình sai nhưng DTO chỉ chặn ≤ 0, nên vẫn tới được đây.
    // Hệ số âm nghĩa là TRỪ tiền của người lao động vì họ làm thêm giờ.
    const kq = tinhDongThemGio({
      luongThang: 5_500_000,
      congChuan: 24,
      soGioMoiNgay: 8,
      gioTheoLoai: { ngay_thuong: 10 },
      heSoTra: { ngay_thuong: 0.5 },
      truMotDonVi: true,
    });

    expect(kq.theoLoai.ngay_thuong.heSo).toBe(0);
    expect(kq.theoLoai.ngay_thuong.thanhTien).toBe(0);
  });

  it('loại có 0 giờ vẫn hiện trong theoLoai — biểu mẫu cần in đủ cột', () => {
    const kq = tinhDongThemGio({
      luongThang: 5_500_000,
      congChuan: 24,
      soGioMoiNgay: 8,
      gioTheoLoai: { ngay_thuong: 10, ngay_le: 0 },
      heSoTra: HE_SO,
      truMotDonVi: false,
    });

    expect(kq.theoLoai.ngay_le).toEqual({ soGio: 0, heSo: 3.0, thanhTien: 0 });
  });

  it('loại không có trong bảng hệ số cho hệ số 0, KHÔNG NaN', () => {
    // NaN đi qua mọi phép cộng vẫn là NaN rồi nằm im trong DB.
    const kq = tinhDongThemGio({
      luongThang: 5_500_000,
      congChuan: 24,
      soGioMoiNgay: 8,
      gioTheoLoai: { loai_la: 10 },
      heSoTra: HE_SO,
      truMotDonVi: false,
    });

    expect(kq.theoLoai.loai_la.heSo).toBe(0);
    expect(kq.tongTien).toBe(0);
  });

  it('congChuan hoặc soGioMoiNgay = 0 thì đơn giá 0, KHÔNG Infinity', () => {
    // Chia cho 0 ra Infinity; Infinity ghi vào DB rồi hiện lên phiếu lương.
    const kq = tinhDongThemGio({
      luongThang: 5_500_000,
      congChuan: 0,
      soGioMoiNgay: 0,
      gioTheoLoai: { ngay_thuong: 10 },
      heSoTra: HE_SO,
      truMotDonVi: false,
    });

    expect(kq.donGiaNgay).toBe(0);
    expect(kq.donGiaGio).toBe(0);
    expect(kq.tongTien).toBe(0);
  });

  it('gioTheoLoai rỗng thì tổng 0, theoLoai rỗng', () => {
    const kq = tinhDongThemGio({
      luongThang: 5_500_000,
      congChuan: 24,
      soGioMoiNgay: 8,
      gioTheoLoai: {},
      heSoTra: HE_SO,
      truMotDonVi: false,
    });

    expect(kq.tongTien).toBe(0);
    expect(kq.theoLoai).toEqual({});
  });
});
