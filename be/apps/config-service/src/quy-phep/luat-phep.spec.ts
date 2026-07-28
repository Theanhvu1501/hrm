import {
  lamTronLen05,
  demSoNamLamViec,
  demThangLamViec,
  tinhPhepDuocCap,
  hanDungCuaNam,
} from './luat-phep';

/** Lịch T2–T7 (nghỉ Chủ nhật) — cấu hình phổ biến nhất ở VN. */
const T2_T7 = [1, 2, 3, 4, 5, 6];

describe('lamTronLen05', () => {
  it.each([
    [5, 5],
    [5.1, 5.5],
    [5.5, 5.5],
    [5.6, 6],
    [0, 0],
  ])('%p → %p', (vao, ra) => {
    expect(lamTronLen05(vao)).toBe(ra);
  });
});

describe('demSoNamLamViec', () => {
  it('đủ 5 năm tròn tính là 5', () => {
    expect(demSoNamLamViec({ ngayVaoLam: '2020-03-01', den: '2025-03-01' })).toBe(5);
  });

  it('thiếu một ngày là 4 — mốc thâm niên không được làm tròn lên', () => {
    expect(demSoNamLamViec({ ngayVaoLam: '2020-03-01', den: '2025-02-28' })).toBe(4);
  });
});

describe('demThangLamViec', () => {
  it('làm trọn năm → 12 tháng', () => {
    expect(
      demThangLamViec({ ngayVaoLam: '2020-03-01', nam: 2025, ngayLamViecTrongTuan: T2_T7 }),
    ).toBe(12);
  });

  it('ca A — vào làm 1/8/2026 → 5 tháng (T8–T12)', () => {
    expect(
      demThangLamViec({ ngayVaoLam: '2026-08-01', nam: 2026, ngayLamViecTrongTuan: T2_T7 }),
    ).toBe(5);
  });

  // T10/2026 có 27 ngày làm việc (31 ngày - 4 Chủ nhật); từ 20/10 còn 11 ngày
  // → 40.7% < 50% nên tháng 10 KHÔNG được tính.
  it('ca B — vào làm 20/10/2026 → 2 tháng, tháng lẻ dưới ngưỡng bị loại', () => {
    expect(
      demThangLamViec({ ngayVaoLam: '2026-10-20', nam: 2026, ngayLamViecTrongTuan: T2_T7 }),
    ).toBe(2);
  });

  // T11/2026 bắt đầu vào Chủ nhật: 25 ngày làm việc, từ 15/11 còn 13 → 52% ≥ 50%.
  // Cùng "ngày 15-20 của tháng" nhưng khác kết quả với ca B — đây là lý do
  // ngưỡng phải tính bằng lịch thật chứ không ước lượng.
  it('ca sát ngưỡng — vào làm 15/11/2026 → 2 tháng (T11 đủ 52%)', () => {
    expect(
      demThangLamViec({ ngayVaoLam: '2026-11-15', nam: 2026, ngayLamViecTrongTuan: T2_T7 }),
    ).toBe(2);
  });

  it('ca D — vào làm 20/11/2026 → 1 tháng (T11 chỉ 36%)', () => {
    expect(
      demThangLamViec({ ngayVaoLam: '2026-11-20', nam: 2026, ngayLamViecTrongTuan: T2_T7 }),
    ).toBe(1);
  });

  // Sát trên ngưỡng: T12/2026 có 27 ngày làm việc (31 ngày - 4 Chủ nhật); từ 16/12
  // còn 14 ngày → 14/27 = 51.85% ≥ 50% nên tháng 12 ĐƯỢC tính.
  it('sát trên ngưỡng — vào làm 16/12/2026 → 1 tháng (14/27 = 51.85%)', () => {
    expect(
      demThangLamViec({ ngayVaoLam: '2026-12-16', nam: 2026, ngayLamViecTrongTuan: T2_T7 }),
    ).toBe(1);
  });

  // Biên THẬT của phép so `>=`: tháng 2/2027 tròn 4 tuần nên với lịch T2–T6 có
  // đúng 20 ngày làm việc; vào làm 15/2 còn đúng 10 ngày = 10/20 = 50.0%.
  // Đây là cấu hình duy nhất dựng được đúng ngưỡng — các tháng 30/31 ngày cho
  // ra số ngày làm việc lẻ nên không bao giờ chia đôi được.
  it('đúng 50.0% thì tháng vẫn được tính (biên của phép so >=)', () => {
    expect(
      demThangLamViec({
        ngayVaoLam: '2027-02-15',
        nam: 2027,
        ngayLamViecTrongTuan: [1, 2, 3, 4, 5],
      }),
    ).toBe(11);
  });

  // Ngay dưới biên: lùi vào làm sang ngày làm việc kế tiếp (16/2) thì còn 9/20
  // = 45% → tháng 2 bị loại, chỉ còn 10 tháng.
  it('ngay dưới 50% thì tháng bị loại', () => {
    expect(
      demThangLamViec({
        ngayVaoLam: '2027-02-16',
        nam: 2027,
        ngayLamViecTrongTuan: [1, 2, 3, 4, 5],
      }),
    ).toBe(10);
  });

  it('chưa cấu hình lịch làm việc → mọi ngày là ngày làm việc, không phải nghỉ hết', () => {
    // 20/10 → còn 12/31 ngày = 38.7% < 50% → 0 tháng, còn T11+T12 đủ.
    expect(demThangLamViec({ ngayVaoLam: '2026-10-20', nam: 2026 })).toBe(2);
  });

  it('năm trước khi vào làm → 0 tháng', () => {
    expect(
      demThangLamViec({ ngayVaoLam: '2026-08-01', nam: 2025, ngayLamViecTrongTuan: T2_T7 }),
    ).toBe(0);
  });
});

describe('tinhPhepDuocCap', () => {
  it('ca A — vào làm 1/8/2026, năm 2026 → 5 ngày', () => {
    const { soNgay, canCuCap } = tinhPhepDuocCap({
      ngayVaoLam: '2026-08-01',
      nam: 2026,
      ngayLamViecTrongTuan: T2_T7,
    });
    expect(soNgay).toBe(5);
    expect(canCuCap).toEqual({
      ngayVaoLam: '2026-08-01',
      soThang: 5,
      thamNienNam: 0,
      mucCaNam: 12,
    });
  });

  it('ca C — vào làm 1/3/2020, năm 2025 → 13 ngày (tròn 5 năm trong năm đó)', () => {
    expect(
      tinhPhepDuocCap({ ngayVaoLam: '2020-03-01', nam: 2025, ngayLamViecTrongTuan: T2_T7 })
        .soNgay,
    ).toBe(13);
  });

  it('thâm niên tính đến 31/12 của năm cấp, không phải tại 1/1', () => {
    // Tròn 5 năm vào 1/6/2025 — vẫn được +1 ngay trong năm 2025.
    expect(
      tinhPhepDuocCap({ ngayVaoLam: '2020-06-01', nam: 2025, ngayLamViecTrongTuan: T2_T7 })
        .soNgay,
    ).toBe(13);
  });

  // Prorate và thâm niên loại trừ nhau: prorate chỉ xảy ra ở NĂM VÀO LÀM, mà
  // năm vào làm thì thamNienNam = 0 ⇒ mucCaNam = 12 ⇒ 12/12 × soThang luôn
  // nguyên. Với chính sách hiện tại, số ngày cấp không bao giờ lẻ.
  it('với chính sách hiện tại, prorate luôn ra số nguyên — không phát sinh nửa ngày', () => {
    [1, 2, 5, 7, 11].forEach((thangVao) => {
      const { soNgay, canCuCap } = tinhPhepDuocCap({
        ngayVaoLam: `2026-${String(thangVao).padStart(2, '0')}-01`,
        nam: 2026,
        ngayLamViecTrongTuan: T2_T7,
      });
      expect(canCuCap.thamNienNam).toBe(0);
      expect(Number.isInteger(soNgay)).toBe(true);
    });
  });

  // lamTronLen05 là lưới an toàn cho chính sách tương lai (mức 14/16 ngày với
  // nghề nặng nhọc — BLLĐ Đ113.1b,c, hiện chưa làm). Lúc đó prorate mới ra số
  // lẻ thật. Test ở mức hàm vì đường qua tinhPhepDuocCap chưa tồn tại.
  it('làm tròn lên nửa ngày khi mức cả năm không chia hết cho 12 (mức 14 giả định)', () => {
    expect(lamTronLen05((14 / 12) * 5)).toBe(6);
    expect(lamTronLen05((14 / 12) * 6)).toBe(7);
  });
});

describe('hanDungCuaNam', () => {
  it('quỹ năm N dùng đến 31/3 năm N+1', () => {
    expect(hanDungCuaNam(2026)).toBe('2027-03-31');
  });
});
