import { describe, it, expect } from "vitest";
import { extractCode } from "../extractCode";

describe("extractCode", () => {
  it("lấy mã từ 'Mã - Tên'", () => {
    expect(extractCode("111 - Tiền mặt")).toBe("111");
    expect(extractCode("NV01 - Bán hàng (PHIEU_THU)")).toBe("NV01");
  });
  it("mã thuần giữ nguyên", () => {
    expect(extractCode("111")).toBe("111");
  });
  it("tên có dấu '-' thường (không có khoảng trắng hai bên) không bị tách", () => {
    expect(extractCode("ABC-XYZ")).toBe("ABC-XYZ");
  });
  it("tách ở ' - ' đầu tiên", () => {
    expect(extractCode("A - B - C")).toBe("A");
  });
  it("trim khoảng trắng", () => {
    expect(extractCode("  111 - x  ")).toBe("111");
  });
  it("rỗng / null / undefined → ''", () => {
    expect(extractCode("")).toBe("");
    expect(extractCode(undefined)).toBe("");
    expect(extractCode(null)).toBe("");
  });
});
