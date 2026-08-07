import { mucKhaiBaoApDung } from './muc-khai-bao';

describe('mucKhaiBaoApDung', () => {
  const MAC_DINH = 5_500_000;

  it('lấy mức đã khai của nhân viên khi có', () => {
    expect(mucKhaiBaoApDung(8_000_000, MAC_DINH)).toBe(8_000_000);
  });

  it('undefined/null → rơi về mức mặc định của công ty', () => {
    expect(mucKhaiBaoApDung(undefined, MAC_DINH)).toBe(MAC_DINH);
    expect(mucKhaiBaoApDung(null, MAC_DINH)).toBe(MAC_DINH);
  });

  /**
   * Đây là lỗi đã xảy ra thật trên production (NV0004, tháng 07/2026): hồ sơ
   * lưu `mucKhaiBao = 0`, code cũ dùng `??` nên coi 0 là MỘT MỨC ĐÃ KHAI →
   * `baseBHXH = 0` → BHXH = 10,5% × 0 = 0 dù HR đã tích "đóng BH", và thuế
   * TNCN vì thế cũng bị tính thừa (thiếu khoản trừ BHXH trước thuế).
   *
   * Không có mức đóng BHXH nào bằng 0: "không đóng" đã có cờ `dongBH` riêng.
   */
  it('0 là CHƯA KHAI, không phải mức 0 — rơi về mức mặc định', () => {
    expect(mucKhaiBaoApDung(0, MAC_DINH)).toBe(MAC_DINH);
  });

  it('số âm (dữ liệu hỏng) cũng rơi về mặc định, không trả số âm', () => {
    // BHXH âm là cộng tiền cho người lao động rồi lại giảm thuế — sai kép.
    expect(mucKhaiBaoApDung(-1_000_000, MAC_DINH)).toBe(MAC_DINH);
  });

  it('mặc định của công ty cũng hỏng thì trả 0 chứ không trả NaN', () => {
    // NaN đi hết đường tính rồi hiện `thucLinh = NaN` trên phiếu lương thật.
    expect(mucKhaiBaoApDung(0, undefined as unknown as number)).toBe(0);
    expect(mucKhaiBaoApDung(0, NaN)).toBe(0);
  });
});
