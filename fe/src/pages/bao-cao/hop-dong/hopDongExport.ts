// fe/src/pages/bao-cao/hop-dong/hopDongExport.ts
import { NUM_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { BaoCaoHopDongRow } from "@/types";

const num = (k: string, header: string): ReportCol => ({ key: k, header, numFmt: NUM_FMT, width: 15 });

const COLUMNS: ReportCol[] = [
  { key: "nam", header: "Năm", width: 10, align: "center" },
  { key: "gt", header: "Giá trị Hợp đồng + phụ lục", children: [num("soLuong", "Số lượng"), num("giaTri", "Số tiền")] },
  num("quyetToan", "Quyết toán"),
  num("thuTien", "Thu tiền"),
  {
    key: "tt", header: "Tình trạng Hợp đồng",
    children: [num("chuaCoHD", "Chưa có HĐ"), num("hdChuaKy", "HĐ chưa ký"), num("hdPhotoScan", "HĐ photo/scan"), num("hdGoc", "HĐ gốc")],
  },
  num("giaTriBinhQuan", "Giá trị HĐ bình quân"),
];

const rowCells = (r: BaoCaoHopDongRow) => ({
  soLuong: r.soLuong, giaTri: r.giaTri, quyetToan: r.quyetToan, thuTien: r.thuTien,
  chuaCoHD: r.chuaCoHD, hdChuaKy: r.hdChuaKy, hdPhotoScan: r.hdPhotoScan, hdGoc: r.hdGoc,
  giaTriBinhQuan: r.giaTriBinhQuan,
});

export function buildHopDongSheets(
  rows: BaoCaoHopDongRow[],
  tong: BaoCaoHopDongRow | null,
): ReportSheet[] {
  if (!rows.length) return [];
  const out: ReportRow[] = rows.map((r) => ({
    cells: { nam: r.nam ?? "Chưa rõ", ...rowCells(r) },
  }));
  if (tong) out.push({ cells: { nam: "Tổng", ...rowCells(tong) }, bold: true, fill: "total" });
  return [
    { name: "Báo cáo hợp đồng", title: "BÁO CÁO NHANH HỢP ĐỒNG (THEO NĂM)", columns: COLUMNS, rows: out },
  ];
}
