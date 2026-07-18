// fe/src/pages/bao-cao/kqkd/kqkdExport.ts
import { NUM_FMT, PCT_FMT, type ReportCol, type ReportRow, type ReportSheet } from "@/utils/exportReportExcel";
import type { KqkdChiTieu } from "@/services/kqkdService";

const numC = (k: string, h: string): ReportCol => ({ key: k, header: h, numFmt: NUM_FMT, width: 16 });
const pctC = (k: string, h: string): ReportCol => ({ key: k, header: h, numFmt: PCT_FMT, width: 12 });

const COLUMNS: ReportCol[] = [
  { key: "stt", header: "STT", width: 6, align: "center" },
  { key: "ten", header: "Chỉ tiêu", width: 40 },
  { key: "ma", header: "Mã số", width: 8, align: "center" },
  { key: "kht", header: "Kỳ hiện tại", children: [numC("kyHienTai", "Số tiền"), pctC("phanTramDTThuan", "% DT thuần"), pctC("tyTrongChiPhi", "Tỷ trọng CP")] },
  { key: "kt", header: "Kỳ trước", children: [numC("kyTruoc", "Số tiền"), pctC("phanTramDTThuanKyTruoc", "% DT thuần"), pctC("tyTrongChiPhiKyTruoc", "Tỷ trọng CP")] },
  { key: "bd", header: "Biến động", children: [numC("bienDong", "Số tiền"), pctC("phanTramBienDong", "%")] },
];

export function buildKqkdSheet(
  data: KqkdChiTieu[],
  title: string,
  meta?: string[],
  name = "KQKD",
): ReportSheet {
  const rows: ReportRow[] = data.map((c, i) => ({
    cells: {
      stt: i + 1,
      ten: c.ten,
      ma: c.ma,
      kyHienTai: c.kyHienTai,
      phanTramDTThuan: c.phanTramDTThuan,
      tyTrongChiPhi: c.tyTrongChiPhi,
      kyTruoc: c.kyTruoc,
      phanTramDTThuanKyTruoc: c.phanTramDTThuanKyTruoc,
      tyTrongChiPhiKyTruoc: c.tyTrongChiPhiKyTruoc,
      bienDong: c.bienDong,
      phanTramBienDong: c.phanTramBienDong,
    },
    bold: Boolean(c.isBold || c.isCalculated),
    indent: c.isCalculated ? 1 : 2,
  }));
  return { name, title, meta, columns: COLUMNS, rows };
}

export function buildKqkdSheets(data: KqkdChiTieu[], title: string, meta?: string[]): ReportSheet[] {
  if (!data.length) return [];
  return [buildKqkdSheet(data, title, meta)];
}
