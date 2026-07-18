// fe/src/pages/bao-cao/bang-tong-hop/congNoExport.ts
import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { BangTongHopCongNo, CongNoRowVal } from "@/services/congNoTongHopService";

const num = (k: string, header: string): ReportCol => ({ key: k, header, numFmt: NUM_FMT, width: 15 });

const COLUMNS: ReportCol[] = [
  { key: "ma", header: "Mã ĐT", width: 12 },
  { key: "ten", header: "Tên đối tượng", width: 32 },
  { key: "dk", header: "Số dư đầu kỳ", children: [num("dk_pt", "Phải thu"), num("dk_ptr", "Phải trả")] },
  { key: "ps", header: "Số phát sinh", children: [num("ps_pt", "Phải thu"), num("ps_ptr", "Phải trả")] },
  { key: "ck", header: "Số dư cuối kỳ", children: [num("ck_pt", "Phải thu"), num("ck_ptr", "Phải trả")] },
];

const valCells = (v: CongNoRowVal) => ({
  dk_pt: v.dauKy.phaiThu, dk_ptr: v.dauKy.phaiTra,
  ps_pt: v.phatSinh.phaiThu, ps_ptr: v.phatSinh.phaiTra,
  ck_pt: v.cuoiKy.phaiThu, ck_ptr: v.cuoiKy.phaiTra,
});

export function buildCongNoSheets(
  data: BangTongHopCongNo | null,
  from: string,
  to: string,
): ReportSheet[] {
  if (!data) return [];
  const rows: ReportRow[] = [
    { cells: { ma: "", ten: "TỔNG CỘNG", ...valCells(data.totals) }, bold: true, fill: "total" },
  ];
  for (const acc of data.accounts) {
    rows.push({
      cells: { ma: acc.ma, ten: acc.ten, ...valCells({ dauKy: acc.dauKy, phatSinh: acc.phatSinh, cuoiKy: acc.cuoiKy }) },
      bold: true,
      fill: "category",
    });
    for (const dt of acc.doiTuongs) {
      rows.push({
        cells: { ma: dt.ma, ten: dt.ten, ...valCells({ dauKy: dt.dauKy, phatSinh: dt.phatSinh, cuoiKy: dt.cuoiKy }) },
        indent: 1,
      });
    }
  }
  return [
    {
      name: "Tổng hợp công nợ",
      title: "BẢNG TỔNG HỢP CÔNG NỢ",
      meta: [`Từ ngày ${from} đến ngày ${to}`],
      columns: COLUMNS,
      rows,
    },
  ];
}
