import { describe, it, expect } from "vitest";
import { buildTaiChinhSheets } from "./taiChinhExport";
import type { TreeNode } from "./utils/buildAccountTree";
import type { TrialBalance } from "@/services/soCaiService";

const tree: TreeNode<TrialBalance>[] = [
  {
    taiKhoan: "1",
    tenTaiKhoan: "Loại 1",
    soDuDauKyNo: 0,
    soDuDauKyCo: 0,
    phatSinhNo: 0,
    phatSinhCo: 0,
    soDuCuoiKyNo: 0,
    soDuCuoiKyCo: 0,
    __ma: "1",
    __isParent: true,
    __rollup: { soDuCuoiKyNo: 130 } as Record<string, number>,
    children: [
      {
        taiKhoan: "111",
        tenTaiKhoan: "Tiền mặt",
        soDuDauKyNo: 100,
        soDuDauKyCo: 0,
        phatSinhNo: 50,
        phatSinhCo: 20,
        soDuCuoiKyNo: 130,
        soDuCuoiKyCo: 0,
        __ma: "111",
        __isParent: false,
        __rollup: {} as Record<string, number>,
      } as TreeNode<TrialBalance>,
    ],
  } as TreeNode<TrialBalance>,
];

const state = {
  trialBalanceTree: tree,
  trialBalance: [
    {
      taiKhoan: "111",
      tenTaiKhoan: "Tiền mặt",
      soDuDauKyNo: 100,
      soDuDauKyCo: 0,
      phatSinhNo: 50,
      phatSinhCo: 20,
      soDuCuoiKyNo: 130,
      soDuCuoiKyCo: 0,
    },
  ] as unknown as TrialBalance[],
  taiSanTree: [],
  nguonVonTree: [],
  kqkdData: null,
  pnlComparison: null,
};

describe("buildTaiChinhSheets", () => {
  it("tab 1: parent indent 0, child indent 1, parent cuoiKyNo = own + rollup", () => {
    const [sheet] = buildTaiChinhSheets("1", state, "Năm 2026");
    expect(sheet.rows[0].indent).toBe(0);
    expect(sheet.rows[0].cells?.soDuCuoiKyNo).toBe(130); // 0 + rollup 130
    expect(sheet.rows[1].indent).toBe(1);
    expect(sheet.rows[1].cells?.soDuCuoiKyNo).toBe(130);
    const total = sheet.rows[sheet.rows.length - 1];
    expect(total.cells?.taiKhoan).toBe("Tổng cộng");
    expect(total.cells?.phatSinhNo).toBe(50);
  });
  it("tab 3 without kqkd returns empty", () => {
    expect(buildTaiChinhSheets("3", state, "Năm 2026")).toEqual([]);
  });
});
