// fe/src/pages/bao-cao/hop-dong/hopDongExport.test.ts
import { describe, it, expect } from "vitest";
import { buildHopDongSheets } from "./hopDongExport";
import type { BaoCaoHopDongRow } from "@/types";

const rows = [
  { nam: 2025, soLuong: 3, giaTri: 900, quyetToan: 800, thuTien: 700, chuaCoHD: 1, hdChuaKy: 0, hdPhotoScan: 1, hdGoc: 1, giaTriBinhQuan: 300 },
] as unknown as BaoCaoHopDongRow[];
const tong = { nam: null, soLuong: 3, giaTri: 900, quyetToan: 800, thuTien: 700, chuaCoHD: 1, hdChuaKy: 0, hdPhotoScan: 1, hdGoc: 1, giaTriBinhQuan: 300 } as unknown as BaoCaoHopDongRow;

describe("buildHopDongSheets", () => {
  it("empty when no rows", () => {
    expect(buildHopDongSheets([], null)).toEqual([]);
  });
  it("maps rows + bold Tổng row last", () => {
    const [sheet] = buildHopDongSheets(rows, tong);
    expect(sheet.rows[0].cells?.nam).toBe(2025);
    const last = sheet.rows[sheet.rows.length - 1];
    expect(last.cells?.nam).toBe("Tổng");
    expect(last.bold).toBe(true);
    expect(last.cells?.giaTri).toBe(900);
  });
});
