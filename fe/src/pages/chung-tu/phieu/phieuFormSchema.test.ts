import { describe, it, expect } from "vitest";
import { phieuFormSchema } from "./phieuFormSchema";

const valid = { ngay: "2026-06-17", soTien: 1000, noiDung: "Thu tiền KH" };

describe("phieuFormSchema", () => {
  it("accepts a valid phieu", () => {
    expect(phieuFormSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty noiDung", () => {
    expect(phieuFormSchema.safeParse({ ...valid, noiDung: "" }).success).toBe(false);
  });

  it("rejects soTien <= 0", () => {
    expect(phieuFormSchema.safeParse({ ...valid, soTien: 0 }).success).toBe(false);
  });

  it("rejects missing ngay", () => {
    expect(phieuFormSchema.safeParse({ ...valid, ngay: "" }).success).toBe(false);
  });

  it("allows optional fields", () => {
    const r = phieuFormSchema.safeParse({ ...valid, nguoiGiaoDich: "A", diaChi: "HN", ghiChu: "x" });
    expect(r.success).toBe(true);
  });
});
