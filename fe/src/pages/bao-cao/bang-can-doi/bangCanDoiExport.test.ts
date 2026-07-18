// fe/src/pages/bao-cao/bang-can-doi/bangCanDoiExport.test.ts
import { describe, it, expect } from "vitest";
import { buildBangCanDoiSheets } from "./bangCanDoiExport";
import type { BalanceSheetData } from "@/services/balanceSheetService";

const data = {
  taiSan: [
    { ma: "100", tenChiTieu: "TÀI SẢN NGẮN HẠN", dauNam: 0, cuoiKy: 500, level: 0, isSection: true },
    { ma: "110", tenChiTieu: "Tiền", dauNam: 100, cuoiKy: 300, level: 1 },
  ],
  nguonVon: [
    { ma: "300", tenChiTieu: "NỢ PHẢI TRẢ", dauNam: 0, cuoiKy: 200, level: 0, isSection: true },
  ],
  tongTaiSan: { cuoiKy: 500, dauNam: 100 },
  tongNguonVon: { cuoiKy: 500, dauNam: 100 },
} as unknown as BalanceSheetData;

describe("buildBangCanDoiSheets", () => {
  it("empty on chart tab", () => {
    expect(buildBangCanDoiSheets("2", data)).toEqual([]);
  });
  it("tab 1: two blocks with section titles + tổng cộng bold rows", () => {
    const [sheet] = buildBangCanDoiSheets("1", data);
    const sections = sheet.rows.filter((r) => r.section);
    expect(sections.map((s) => s.section)).toEqual(["TÀI SẢN", "NGUỒN VỐN"]);
    const totals = sheet.rows.filter((r) => r.bold && typeof r.cells?.tenChiTieu === "string" && String(r.cells?.tenChiTieu).startsWith("TỔNG CỘNG"));
    expect(totals.length).toBe(2);
  });
});
