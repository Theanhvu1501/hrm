import { describe, it, expect } from "vitest";
import { normalizeAmount, normalizeDate } from "../normalize";

describe("normalizeAmount", () => {
  it("số nguyên thường", () => {
    expect(normalizeAmount("1000")).toBe(1000);
    expect(normalizeAmount(1000)).toBe(1000);
  });
  it("dấu phẩy ngăn cách nghìn", () => {
    expect(normalizeAmount("10,000,000")).toBe(10000000);
  });
  it("dấu chấm ngăn cách nghìn", () => {
    expect(normalizeAmount("10.000.000")).toBe(10000000);
  });
  it("thập phân dùng phẩy", () => {
    expect(normalizeAmount("1000,5")).toBe(1000.5);
  });
  it("hỗn hợp: chấm nghìn + phẩy thập phân", () => {
    expect(normalizeAmount("1.000.000,5")).toBe(1000000.5);
  });
  it("rỗng / không hợp lệ → null", () => {
    expect(normalizeAmount("")).toBeNull();
    expect(normalizeAmount("abc")).toBeNull();
    expect(normalizeAmount(undefined as unknown as string)).toBeNull();
  });
});

describe("normalizeDate", () => {
  it("DD/MM/YYYY → ISO yyyy-mm-dd", () => {
    expect(normalizeDate("01/06/2026")).toBe("2026-06-01");
    expect(normalizeDate("1/6/2026")).toBe("2026-06-01");
  });
  it("nhận serial ngày của Excel", () => {
    expect(normalizeDate(46174)).toBe("2026-06-01");
    expect(normalizeDate(46053)).toBe("2026-01-31");
  });
  it("sai định dạng → null", () => {
    expect(normalizeDate("2026/06/01")).toBeNull();
    expect(normalizeDate("không phải ngày")).toBeNull();
    expect(normalizeDate("")).toBeNull();
  });
});
