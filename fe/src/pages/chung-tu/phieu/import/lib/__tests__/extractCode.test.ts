import { describe, it, expect } from "vitest";
import { extractCode } from "../extractCode";

describe("extractCode", () => {
  it("lấy mã từ 'Mã - Tên'", () => {
    expect(extractCode("KH001 - Khách hàng A")).toBe("KH001");
    expect(extractCode("HD001 - Hợp đồng xây dựng")).toBe("HD001");
  });
  it("mã thuần giữ nguyên", () => {
    expect(extractCode("KH001")).toBe("KH001");
  });
  it("tên có dấu '-' thường (không có khoảng trắng hai bên) không bị tách", () => {
    expect(extractCode("ABC-XYZ")).toBe("ABC-XYZ");
  });
  it("tách ở ' - ' đầu tiên", () => {
    expect(extractCode("A - B - C")).toBe("A");
  });
  it("trim khoảng trắng", () => {
    expect(extractCode("  KH001 - x  ")).toBe("KH001");
  });
  it("rỗng / null / undefined → ''", () => {
    expect(extractCode("")).toBe("");
    expect(extractCode(undefined)).toBe("");
    expect(extractCode(null)).toBe("");
  });
});
