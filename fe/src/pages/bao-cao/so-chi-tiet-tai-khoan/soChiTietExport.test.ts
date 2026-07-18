import { describe, it, expect } from "vitest";
import { buildSoChiTietSheets } from "./soChiTietExport";
import { defaultVisibleKeys } from "./columnRegistry";
import type { SoChiTietReport } from "@/services/soChiTietTaiKhoanService";

const report = {
  taiKhoan: { ma: "111", ten: "Tiền mặt" },
  doiTuong: null,
  soDuDauKyNo: 100, soDuDauKyCo: 0,
  tongPhatSinhNo: 50, tongPhatSinhCo: 20,
  soDuCuoiKyNo: 130, soDuCuoiKyCo: 0,
  rows: [
    { ngay: "2026-07-02", ngayChungTu: "2026-07-02", soPhieu: "PT001", noiDung: "Thu tiền", tkDoiUng: "131", phatSinhNo: 50, phatSinhCo: 0, soDuNo: 150, soDuCo: 0 },
  ],
} as unknown as SoChiTietReport;

describe("buildSoChiTietSheets", () => {
  it("empty when no reports", () => {
    expect(buildSoChiTietSheets([], defaultVisibleKeys(), "01/07/2026", "31/07/2026")).toEqual([]);
  });
  it("one sheet, section title per account, bold non-entry rows", () => {
    const [sheet] = buildSoChiTietSheets([report], defaultVisibleKeys(), "01/07/2026", "31/07/2026");
    expect(sheet.rows[0].section).toContain("111");
    // opening là dòng đầu tiên sau section
    const opening = sheet.rows.find((r) => r.cells?.noiDung === "Số dư đầu kỳ");
    expect(opening?.bold).toBe(true);
    expect(opening?.cells?.soDuNo).toBe(100);
  });
});
