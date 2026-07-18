import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { SoCaiByAccount, SoCaiEntry, TrialBalance } from "@/services/soCaiService";

const numC = (k: string, h: string): ReportCol => ({ key: k, header: h, numFmt: NUM_FMT, width: 16 });

interface SoCaiExportState {
  summaryData: SoCaiByAccount[];
  selectedAccount: SoCaiByAccount | null;
  trialBalance: TrialBalance[];
}

const BALANCE_COLUMNS: ReportCol[] = [
  { key: "taiKhoan", header: "TK", width: 10 },
  { key: "tenTaiKhoan", header: "Tên tài khoản", width: 28 },
  { key: "dk", header: "Số dư đầu kỳ", children: [numC("soDuDauKyNo", "Nợ"), numC("soDuDauKyCo", "Có")] },
  { key: "ps", header: "Phát sinh trong kỳ", children: [numC("phatSinhNo", "Nợ"), numC("phatSinhCo", "Có")] },
  { key: "ck", header: "Số dư cuối kỳ", children: [numC("soDuCuoiKyNo", "Nợ"), numC("soDuCuoiKyCo", "Có")] },
];

type BalanceLike = {
  taiKhoan: string; tenTaiKhoan: string;
  soDuDauKyNo: number; soDuDauKyCo: number;
  phatSinhNo: number; phatSinhCo: number;
  soDuCuoiKyNo: number; soDuCuoiKyCo: number;
};

function balanceRows(list: BalanceLike[]): ReportRow[] {
  const rows: ReportRow[] = list.map((r) => ({
    cells: {
      taiKhoan: r.taiKhoan, tenTaiKhoan: r.tenTaiKhoan,
      soDuDauKyNo: r.soDuDauKyNo, soDuDauKyCo: r.soDuDauKyCo,
      phatSinhNo: r.phatSinhNo, phatSinhCo: r.phatSinhCo,
      soDuCuoiKyNo: r.soDuCuoiKyNo, soDuCuoiKyCo: r.soDuCuoiKyCo,
    },
  }));
  const t = list.reduce(
    (a, r) => ({
      soDuDauKyNo: a.soDuDauKyNo + r.soDuDauKyNo, soDuDauKyCo: a.soDuDauKyCo + r.soDuDauKyCo,
      phatSinhNo: a.phatSinhNo + r.phatSinhNo, phatSinhCo: a.phatSinhCo + r.phatSinhCo,
      soDuCuoiKyNo: a.soDuCuoiKyNo + r.soDuCuoiKyNo, soDuCuoiKyCo: a.soDuCuoiKyCo + r.soDuCuoiKyCo,
    }),
    { soDuDauKyNo: 0, soDuDauKyCo: 0, phatSinhNo: 0, phatSinhCo: 0, soDuCuoiKyNo: 0, soDuCuoiKyCo: 0 },
  );
  rows.push({ cells: { taiKhoan: "Tổng cộng", tenTaiKhoan: "", ...t }, bold: true, fill: "total" });
  return rows;
}

const DETAIL_COLUMNS: ReportCol[] = [
  { key: "ngay", header: "Ngày", width: 12 },
  { key: "soPhieu", header: "Số chứng từ", width: 14 },
  { key: "loaiChungTu", header: "Loại CT", width: 12 },
  { key: "dienGiai", header: "Diễn giải", width: 40 },
  numC("phatSinhNo", "Phát sinh Nợ"),
  numC("phatSinhCo", "Phát sinh Có"),
  numC("soDuNo", "Số dư Nợ"),
  numC("soDuCo", "Số dư Có"),
];

export function buildSoCaiSheets(activeTab: string, s: SoCaiExportState): ReportSheet[] {
  if (activeTab === "1") {
    if (!s.summaryData.length) return [];
    return [{ name: "Tổng hợp theo TK", title: "SỔ CÁI - TỔNG HỢP THEO TÀI KHOẢN", columns: BALANCE_COLUMNS, rows: balanceRows(s.summaryData) }];
  }
  if (activeTab === "2") {
    const a = s.selectedAccount;
    if (!a) return [];
    const rows: ReportRow[] = (a.chiTiet ?? []).map((e: SoCaiEntry) => ({
      cells: {
        ngay: e.ngay, soPhieu: e.soPhieu, loaiChungTu: e.loaiChungTu, dienGiai: e.dienGiai,
        phatSinhNo: e.phatSinhNo, phatSinhCo: e.phatSinhCo, soDuNo: e.soDuNo, soDuCo: e.soDuCo,
      },
    }));
    return [{
      name: "Chi tiết tài khoản",
      title: `SỔ CÁI - CHI TIẾT TÀI KHOẢN ${a.taiKhoan} - ${a.tenTaiKhoan}`,
      meta: [
        `Số dư đầu kỳ: Nợ ${a.soDuDauKyNo.toLocaleString("vi-VN")} / Có ${a.soDuDauKyCo.toLocaleString("vi-VN")}`,
        `Số dư cuối kỳ: Nợ ${a.soDuCuoiKyNo.toLocaleString("vi-VN")} / Có ${a.soDuCuoiKyCo.toLocaleString("vi-VN")}`,
      ],
      columns: DETAIL_COLUMNS,
      rows,
    }];
  }
  if (activeTab === "3") {
    if (!s.trialBalance.length) return [];
    return [{ name: "Bảng cân đối phát sinh", title: "BẢNG CÂN ĐỐI PHÁT SINH", columns: BALANCE_COLUMNS, rows: balanceRows(s.trialBalance) }];
  }
  return [];
}
