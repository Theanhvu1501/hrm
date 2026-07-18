import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import { buildKqkdSheet } from "@/pages/bao-cao/kqkd/kqkdExport";
import type { TreeNode } from "./utils/buildAccountTree";
import type { TrialBalance } from "@/services/soCaiService";
import type { BalanceSheetItem } from "@/services/balanceSheetService";
import type { KqkdReport } from "@/services/kqkdService";
import type { PnLComparisonData } from "@/services/pnlService";

const numC = (k: string, h: string): ReportCol => ({ key: k, header: h, numFmt: NUM_FMT, width: 16 });

export interface TaiChinhExportState {
  trialBalanceTree: TreeNode<TrialBalance>[];
  trialBalance: TrialBalance[];
  taiSanTree: TreeNode<BalanceSheetItem>[];
  nguonVonTree: TreeNode<BalanceSheetItem>[];
  kqkdData: KqkdReport | null;
  pnlComparison: PnLComparisonData | null;
}

// Số hiển thị: cha = own + rollup, lá = own.
function amount<T>(node: TreeNode<T>, field: string): number {
  const own = Number((node as unknown as Record<string, unknown>)[field]) || 0;
  if (node.__isParent) return own + (node.__rollup[field] ?? 0);
  return own;
}

// Duyệt cây phẳng kèm độ sâu.
function flatten<T>(
  nodes: TreeNode<T>[],
  depth: number,
  out: { node: TreeNode<T>; depth: number }[],
): void {
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.children && n.children.length) flatten(n.children, depth + 1, out);
  }
}

const TB_COLUMNS: ReportCol[] = [
  { key: "taiKhoan", header: "Tài khoản", width: 12 },
  { key: "tenTaiKhoan", header: "Tên tài khoản", width: 32 },
  { key: "dk", header: "Số dư đầu kỳ", children: [numC("soDuDauKyNo", "Nợ"), numC("soDuDauKyCo", "Có")] },
  { key: "ps", header: "Phát sinh trong kỳ", children: [numC("phatSinhNo", "Nợ"), numC("phatSinhCo", "Có")] },
  { key: "ck", header: "Số dư cuối kỳ", children: [numC("soDuCuoiKyNo", "Nợ"), numC("soDuCuoiKyCo", "Có")] },
];

const TB_FIELDS = [
  "soDuDauKyNo",
  "soDuDauKyCo",
  "phatSinhNo",
  "phatSinhCo",
  "soDuCuoiKyNo",
  "soDuCuoiKyCo",
] as const;

function trialBalanceSheet(state: TaiChinhExportState, periodLabel: string): ReportSheet {
  const flat: { node: TreeNode<TrialBalance>; depth: number }[] = [];
  flatten(state.trialBalanceTree, 0, flat);
  const rows: ReportRow[] = flat.map(({ node, depth }) => {
    const cells: Record<string, string | number> = { taiKhoan: node.taiKhoan, tenTaiKhoan: node.tenTaiKhoan };
    for (const f of TB_FIELDS) cells[f] = amount(node, f);
    return { cells, bold: node.__isParent, indent: depth };
  });
  const t = state.trialBalance.reduce(
    (a, r) => {
      for (const f of TB_FIELDS) a[f] += Number(r[f as keyof TrialBalance]) || 0;
      return a;
    },
    Object.fromEntries(TB_FIELDS.map((f) => [f, 0])) as Record<string, number>,
  );
  rows.push({ cells: { taiKhoan: "Tổng cộng", tenTaiKhoan: "", ...t }, bold: true, fill: "total" });
  return { name: "Cân đối tài khoản", title: "CÂN ĐỐI TÀI KHOẢN", meta: [`Kỳ: ${periodLabel}`], columns: TB_COLUMNS, rows };
}

const BS_COLUMNS: ReportCol[] = [
  { key: "tenChiTieu", header: "Chỉ tiêu", width: 45 },
  { key: "ma", header: "Mã số", width: 10, align: "center" },
  numC("dauNam", "Số đầu năm"),
  numC("cuoiKy", "Số cuối kỳ"),
  numC("chenhLech", "Chênh lệch"),
];

function bsRows(nodes: TreeNode<BalanceSheetItem>[]): ReportRow[] {
  const flat: { node: TreeNode<BalanceSheetItem>; depth: number }[] = [];
  flatten(nodes, 0, flat);
  return flat.map(({ node, depth }) => {
    const dauNam = amount(node, "dauNam");
    const cuoiKy = amount(node, "cuoiKy");
    return {
      cells: { tenChiTieu: node.tenChiTieu, ma: node.ma, dauNam, cuoiKy, chenhLech: cuoiKy - dauNam },
      bold: Boolean(node.isSection || node.isTotal || node.__isParent),
      indent: depth,
    };
  });
}

function balanceSheetSheet(state: TaiChinhExportState, periodLabel: string): ReportSheet {
  const rows: ReportRow[] = [];
  rows.push({ section: "TÀI SẢN" });
  rows.push(...bsRows(state.taiSanTree));
  rows.push({ spacer: true });
  rows.push({ section: "NGUỒN VỐN" });
  rows.push(...bsRows(state.nguonVonTree));
  return { name: "Cân đối kế toán", title: "BẢNG CÂN ĐỐI KẾ TOÁN", meta: [`Kỳ: ${periodLabel}`], columns: BS_COLUMNS, rows };
}

const PNL_COMP_COLUMNS: ReportCol[] = [
  { key: "khoanMuc", header: "Khoản mục", width: 42 },
  numC("kyHienTai", "Kỳ hiện tại"),
  numC("kyTruoc", "Kỳ trước"),
  numC("bienDong", "Biến động"),
  { key: "phanTramBienDong", header: "% Biến động", numFmt: '0.0"%";(0.0"%");"-"', width: 14 },
];

type PnLCompRow = {
  key: string;
  khoanMuc: string;
  kyHienTai: number;
  kyTruoc: number;
  bienDong: number;
  phanTramBienDong: number | null;
  isCategory?: boolean;
  isSummary?: boolean;
};

// Sao chép nguyên logic buildPnLComparisonData của page (không phụ thuộc render).
function buildPnLComparisonRows(pnl: PnLComparisonData): PnLCompRow[] {
  const rows: PnLCompRow[] = [];
  const prev = pnl.kyTruoc;
  const makeRow = (
    key: string,
    name: string,
    cur: number,
    pre: number,
    opts?: { isCategory?: boolean; isSummary?: boolean },
  ): PnLCompRow => {
    const diff = cur - pre;
    const pct = pre !== 0 ? (diff / Math.abs(pre)) * 100 : cur !== 0 ? 100 : null;
    return { key, khoanMuc: name, kyHienTai: cur, kyTruoc: pre, bienDong: diff, phanTramBienDong: pct, ...opts };
  };
  rows.push(makeRow("cat-dt", "DOANH THU", pnl.tongDoanhThu, prev.tongDoanhThu, { isCategory: true }));
  pnl.doanhThu.forEach((item, i) => {
    const p = prev.doanhThu.find((x) => x.ma === item.ma);
    rows.push(makeRow(`dt-${i}`, `${item.ma} - ${item.ten}`, item.soTien, p?.soTien ?? 0));
  });
  rows.push(makeRow("cat-cp", "CHI PHÍ", pnl.tongChiPhi, prev.tongChiPhi, { isCategory: true }));
  pnl.chiPhi.forEach((item, i) => {
    const p = prev.chiPhi.find((x) => x.ma === item.ma);
    rows.push(makeRow(`cp-${i}`, `${item.ma} - ${item.ten}`, item.soTien, p?.soTien ?? 0));
  });
  const lnttCur = pnl.loiNhuan;
  const lnttPrev = prev.loiNhuan;
  rows.push(makeRow("lntt", "LỢI NHUẬN TRƯỚC THUẾ", lnttCur, lnttPrev, { isSummary: true }));
  const thueCur = lnttCur > 0 ? lnttCur * 0.2 : 0;
  const thuePrev = lnttPrev > 0 ? lnttPrev * 0.2 : 0;
  rows.push(makeRow("thue", "Thuế TNDN (20%)", -thueCur, -thuePrev));
  rows.push(makeRow("lnst", "LỢI NHUẬN SAU THUẾ", lnttCur - thueCur, lnttPrev - thuePrev, { isSummary: true }));
  return rows;
}

function pnlComparisonSheet(pnl: PnLComparisonData, periodLabel: string): ReportSheet {
  const rows: ReportRow[] = buildPnLComparisonRows(pnl).map((r) => ({
    cells: {
      khoanMuc: r.khoanMuc,
      kyHienTai: r.kyHienTai,
      kyTruoc: r.kyTruoc,
      bienDong: r.bienDong,
      phanTramBienDong: r.phanTramBienDong,
    },
    bold: Boolean(r.isCategory || r.isSummary),
    indent: r.isCategory || r.isSummary ? 0 : 1,
    fill: r.isSummary ? "total" : r.isCategory ? "category" : undefined,
  }));
  return { name: "So sánh lãi lỗ", title: "SO SÁNH LÃI LỖ", meta: [`Kỳ: ${periodLabel}`], columns: PNL_COMP_COLUMNS, rows };
}

export function buildTaiChinhSheets(
  activeTab: string,
  state: TaiChinhExportState,
  periodLabel: string,
): ReportSheet[] {
  if (activeTab === "1") {
    if (!state.trialBalanceTree.length) return [];
    return [trialBalanceSheet(state, periodLabel)];
  }
  if (activeTab === "2") {
    if (!state.taiSanTree.length && !state.nguonVonTree.length) return [];
    return [balanceSheetSheet(state, periodLabel)];
  }
  if (activeTab === "3") {
    const chiTieu = state.kqkdData?.chiTieu ?? [];
    if (!chiTieu.length) return [];
    return [buildKqkdSheet(chiTieu, "KẾT QUẢ KINH DOANH", [`Kỳ: ${periodLabel}`], "Kết quả kinh doanh")];
  }
  if (activeTab === "4") {
    if (!state.pnlComparison) return [];
    return [pnlComparisonSheet(state.pnlComparison, periodLabel)];
  }
  return [];
}
