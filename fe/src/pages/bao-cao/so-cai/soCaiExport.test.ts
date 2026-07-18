import { describe, it, expect } from "vitest";
import { buildSoCaiSheets } from "./soCaiExport";
import type { SoCaiByAccount, TrialBalance } from "@/services/soCaiService";

const acc = {
  taiKhoan: "111", tenTaiKhoan: "Tiền mặt",
  soDuDauKyNo: 100, soDuDauKyCo: 0, phatSinhNo: 50, phatSinhCo: 20,
  soDuCuoiKyNo: 130, soDuCuoiKyCo: 0, chiTiet: [],
} as unknown as SoCaiByAccount;
const tb = [{ taiKhoan: "111", tenTaiKhoan: "Tiền mặt", soDuDauKyNo: 100, soDuDauKyCo: 0, phatSinhNo: 50, phatSinhCo: 20, soDuCuoiKyNo: 130, soDuCuoiKyCo: 0 }] as unknown as TrialBalance[];

describe("buildSoCaiSheets", () => {
  it("tab 1: summary + Tổng cộng bold", () => {
    const [sheet] = buildSoCaiSheets("1", { summaryData: [acc], selectedAccount: null, trialBalance: [] });
    expect(sheet.rows[0].cells?.taiKhoan).toBe("111");
    const total = sheet.rows[sheet.rows.length - 1];
    expect(total.bold).toBe(true);
    expect(total.cells?.phatSinhNo).toBe(50);
  });
  it("tab 2 without selectedAccount returns empty", () => {
    expect(buildSoCaiSheets("2", { summaryData: [], selectedAccount: null, trialBalance: [] })).toEqual([]);
  });
  it("tab 3: trial balance grouped + total", () => {
    const [sheet] = buildSoCaiSheets("3", { summaryData: [], selectedAccount: null, trialBalance: tb });
    expect(sheet.columns.some((c) => c.children)).toBe(true);
    expect(sheet.rows[sheet.rows.length - 1].cells?.taiKhoan).toBe("Tổng cộng");
  });
});
