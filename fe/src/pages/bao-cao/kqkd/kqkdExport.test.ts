// fe/src/pages/bao-cao/kqkd/kqkdExport.test.ts
import { describe, it, expect } from "vitest";
import { buildKqkdSheet, buildKqkdSheets } from "./kqkdExport";
import type { KqkdChiTieu } from "@/services/kqkdService";

const data = [
  { ten: "Doanh thu bán hàng", ma: "01", kyHienTai: 1000, phanTramDTThuan: 100, tyTrongChiPhi: null, kyTruoc: 800, phanTramDTThuanKyTruoc: 100, tyTrongChiPhiKyTruoc: null, bienDong: 200, phanTramBienDong: 25, isBold: false, isCalculated: false },
  { ten: "Lợi nhuận gộp", ma: "20", kyHienTai: 300, phanTramDTThuan: 30, tyTrongChiPhi: null, kyTruoc: 250, phanTramDTThuanKyTruoc: 31, tyTrongChiPhiKyTruoc: null, bienDong: 50, phanTramBienDong: 20, isBold: true, isCalculated: true },
] as unknown as KqkdChiTieu[];

describe("buildKqkdSheet", () => {
  it("empty wrapper when no data", () => {
    expect(buildKqkdSheets([], "T")).toEqual([]);
  });
  it("STT tăng dần, dòng isBold/isCalculated là bold + indent nhỏ hơn", () => {
    const sheet = buildKqkdSheet(data, "KQKD");
    expect(sheet.rows[0].cells?.stt).toBe(1);
    expect(sheet.rows[0].indent).toBe(2);
    expect(sheet.rows[1].bold).toBe(true);
    expect(sheet.rows[1].indent).toBe(1);
    expect(sheet.rows[1].cells?.kyHienTai).toBe(300);
  });
});
