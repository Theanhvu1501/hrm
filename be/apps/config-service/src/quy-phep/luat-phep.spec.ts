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

  it('có thâm niên mà bị prorate → làm tròn LÊN bội số 0.5', () => {
    // 13/12 × 5 tháng = 5.4166… → 5.5
    const { soNgay } = tinhPhepDuocCap({
      ngayVaoLam: '2020-08-01',
      nam: 2025,
      ngayLamViecTrongTuan: T2_T7,
    });
    expect(soNgay).toBe(13); // làm trọn năm 2025
    expect(
      lamTronLen05((12 + 1) / 12 * 5),
    ).toBe(5.5);
  });
});

describe('hanDungCuaNam', () => {
  it('quỹ năm N dùng đến 31/3 năm N+1', () => {
    expect(hanDungCuaNam(2026)).toBe('2027-03-31');
  });
});
