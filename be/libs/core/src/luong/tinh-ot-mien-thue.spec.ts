import { tinhOtMienThue } from './tinh-ot-mien-thue';

const G = 28_645.8333; // đơn giá giờ của ca kiểm chuẩn

describe('tinhOtMienThue', () => {
  it('chỉ loại nằm trong mienThueChenh mới được tách', () => {
    const kq = tinhOtMienThue({
      theoLoai: {
        ngay_thuong: { soGio: 10, heSo: 1.5, thanhTien: 10 * G * 1.5 },
        ngay_dem: { soGio: 10, heSo: 1.5, thanhTien: 10 * G * 1.5 },
      },
      donGiaGio: G,
      mienThueChenh: ['ngay_dem'],
      truMotDonVi: false,
    });

    // Chỉ ca đêm: 10 × G × (1,5 − 1) = 10 × G × 0,5.
    expect(kq).toBeCloseTo(10 * G * 0.5, 4);
  });

  it('truMotDonVi: toàn bộ khoản trả LÀ phần chênh nên miễn hết', () => {
    // Chế độ nghi_bu_va_chenh trả đúng phần vượt 1.0; phần 1.0 đã vào quỹ.
    const kq = tinhOtMienThue({
      theoLoai: { ngay_dem: { soGio: 10, heSo: 0.5, thanhTien: 10 * G * 0.5 } },
      donGiaGio: G,
      mienThueChenh: ['ngay_dem'],
      truMotDonVi: true,
    });

    expect(kq).toBeCloseTo(10 * G * 0.5, 4);
  });

  it('hệ số ≤ 1 thì không có phần chênh — trả 0, KHÔNG trả số âm', () => {
    // Số âm ở đây làm cột TN miễn thuế tụt, tức thu THỪA thuế của NLĐ.
    const kq = tinhOtMienThue({
      theoLoai: { ngay_dem: { soGio: 10, heSo: 0.8, thanhTien: 10 * G * 0.8 } },
      donGiaGio: G,
      mienThueChenh: ['ngay_dem'],
      truMotDonVi: false,
    });

    expect(kq).toBe(0);
  });

  it('cộng nhiều loại cùng nằm trong mienThueChenh', () => {
    const kq = tinhOtMienThue({
      theoLoai: {
        ngay_dem: { soGio: 10, heSo: 1.5, thanhTien: 1 },
        ngay_le: { soGio: 8, heSo: 3.0, thanhTien: 1 },
      },
      donGiaGio: G,
      mienThueChenh: ['ngay_dem', 'ngay_le'],
      truMotDonVi: false,
    });

    expect(kq).toBeCloseTo(10 * G * 0.5 + 8 * G * 2.0, 4);
  });

  it('mienThueChenh trỏ vào loại KHÔNG có trong bảng → bỏ qua, không NaN', () => {
    const kq = tinhOtMienThue({
      theoLoai: { ngay_dem: { soGio: 10, heSo: 1.5, thanhTien: 1 } },
      donGiaGio: G,
      mienThueChenh: ['ngay_dem', 'loai_khong_ton_tai'],
      truMotDonVi: false,
    });

    expect(kq).toBeCloseTo(10 * G * 0.5, 4);
  });

  it('mienThueChenh rỗng → 0', () => {
    expect(
      tinhOtMienThue({
        theoLoai: { ngay_dem: { soGio: 10, heSo: 1.5, thanhTien: 1 } },
        donGiaGio: G, mienThueChenh: [], truMotDonVi: false,
      }),
    ).toBe(0);
  });

  it('theoLoai rỗng → 0, không NaN', () => {
    expect(
      tinhOtMienThue({
        theoLoai: {}, donGiaGio: G, mienThueChenh: ['ngay_dem'], truMotDonVi: false,
      }),
    ).toBe(0);
  });
});
