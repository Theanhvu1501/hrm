// fe/src/pages/bao-cao/bang-tong-hop/congNoExport.test.ts
import { describe, it, expect } from "vitest";
import { buildCongNoSheets } from "./congNoExport";
import type { BangTongHopCongNo } from "@/services/congNoTongHopService";

const data = {
  totals: {
    dauKy: { phaiThu: 100, phaiTra: 0 },
    phatSinh: { phaiThu: 50, phaiTra: 20 },
    cuoiKy: { phaiThu: 130, phaiTra: 0 },
  },
  accounts: [
    {
      ma: "131",
      ten: "Phải thu KH",
      dauKy: { phaiThu: 100, phaiTra: 0 },
      phatSinh: { phaiThu: 50, phaiTra: 20 },
      cuoiKy: { phaiThu: 130, phaiTra: 0 },
      doiTuongs: [
        {
          ma: "KH01",
          ten: "Khách 1",
          dauKy: { phaiThu: 100, phaiTra: 0 },
          phatSinh: { phaiThu: 50, phaiTra: 20 },
          cuoiKy: { phaiThu: 130, phaiTra: 0 },
        },
      ],
    },
  ],
} as unknown as BangTongHopCongNo;

describe("buildCongNoSheets", () => {
  it("returns empty when no data", () => {
    expect(buildCongNoSheets(null, "01/07/2026", "31/07/2026")).toEqual([]);
  });

  it("first data row is bold TỔNG CỘNG then account then đối tượng", () => {
    const [sheet] = buildCongNoSheets(data, "01/07/2026", "31/07/2026");
    expect(sheet.rows[0].cells?.ten).toBe("TỔNG CỘNG");
    expect(sheet.rows[0].bold).toBe(true);
    expect(sheet.rows[1].cells?.ma).toBe("131");
    expect(sheet.rows[2].indent).toBe(1);
    expect(sheet.rows[2].cells?.ck_pt).toBe(130);
  });
});
