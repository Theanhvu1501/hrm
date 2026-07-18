import { describe, it, expect } from "vitest";
import { buildPnLSheets } from "./pnlExport";
import type { PnLGroupedData, PnLSummary } from "@/services/pnlService";

const grouped = [
  { category: { name: "DOANH THU" }, subtotal: 1000, items: [{ ma: "511", ten: "Bán hàng", soTien: 1000 }] },
] as unknown as PnLGroupedData[];
const summary = { loiNhuanTruocThue: 300, thue: 60, loiNhuanSauThue: 240 } as unknown as PnLSummary;

describe("buildPnLSheets", () => {
  it("empty when no data", () => {
    expect(buildPnLSheets([], null, "Tháng này")).toEqual([]);
  });
  it("category bold, item indented, summary rows bold", () => {
    const [sheet] = buildPnLSheets(grouped, summary, "Tháng này");
    expect(sheet.rows[0].cells?.khoanMuc).toBe("DOANH THU");
    expect(sheet.rows[0].bold).toBe(true);
    expect(sheet.rows[1].indent).toBe(1);
    const lnst = sheet.rows.find((r) => r.cells?.khoanMuc === "LỢI NHUẬN SAU THUẾ");
    expect(lnst?.bold).toBe(true);
    expect(lnst?.cells?.soTien).toBe(240);
  });
});
