import {
  NUM_FMT,
  type ReportCol,
  type ReportRow,
  type ReportSheet,
} from "@/utils/exportReportExcel";
import type {
  KetQuaQuyetToan,
  KyQuyetToan,
  QuyetToanNguoi,
} from "@/services/quyetToanTncnService";

/** Tám cột con của một nhóm — đúng thứ tự sheet `QT TNCN` của chủ sản phẩm. */
const CON: Array<[keyof KyQuyetToan, string]> = [
  ["tongThuNhapChiuThue", "Tổng thu nhập chịu thuế"],
  ["bhxh", "BHXH"],
  ["khoanMienThue", "Ăn ca"],
  ["giamTruBanThan", "Giảm trừ bản thân"],
  ["giamTruNPT", "Người phụ thuộc"],
  ["giamTruGiaCanh", "Giảm trừ gia cảnh"],
  ["thuNhapTinhThue", "Thu nhập tính thuế"],
  ["thue", "Thuế phải nộp"],
];

const NHOM = [
  ["caNam", "CẢ NĂM"],
  ["q1", "Quý 1"],
  ["q2", "Quý 2"],
  ["q3", "Quý 3"],
  ["q4", "Quý 4"],
] as const;

function nhomCua(n: QuyetToanNguoi, khoa: string): KyQuyetToan | undefined {
  if (khoa === "caNam") return n.caNam;
  return n.quy?.[Number(khoa.slice(1)) - 1];
}

/**
 * Dựng sheet `QT TNCN` — 5 nhóm × 8 cột đúng bố cục chủ sản phẩm đang dùng,
 * cộng hai cột mà sheet gốc KHÔNG có: "Đã khấu trừ" và "Chênh lệch".
 *
 * Thiếu hai cột đó thì bảng không trả lời được câu hỏi nó sinh ra để trả lời:
 * người này phải nộp thêm hay được hoàn bao nhiêu.
 */
export function dungSheetQuyetToan(kq: KetQuaQuyetToan): ReportSheet {
  const columns: ReportCol[] = [
    { key: "maNhanVien", header: "Mã NV", width: 12 },
    { key: "hoTen", header: "Họ tên", width: 24 },
    { key: "soKyDaChot", header: "Số kỳ", width: 8, align: "right" },
    ...NHOM.map(([khoa, nhan]) => ({
      key: khoa,
      header: nhan,
      children: CON.map(([c, tenCot]) => ({
        key: `${khoa}__${c}`,
        header: tenCot,
        align: "right" as const,
        numFmt: NUM_FMT,
        width: 16,
      })),
    })),
    { key: "daKhauTru", header: "Đã khấu trừ", align: "right", numFmt: NUM_FMT, width: 16 },
    { key: "chenhLech", header: "Chênh lệch", align: "right", numFmt: NUM_FMT, width: 16 },
    { key: "ghiChu", header: "Ghi chú", width: 30 },
  ];

  const rows: ReportRow[] = kq.ds.map((n) => {
    const cells: Record<string, string | number | null> = {
      maNhanVien: n.maNhanVien,
      hoTen: n.hoTen,
      soKyDaChot: n.soKyDaChot,
      daKhauTru: n.daKhauTru,
      chenhLech: n.chenhLech,
      ghiChu: n.ghiChu ?? "",
    };
    for (const [khoa] of NHOM) {
      const k = nhomCua(n, khoa);
      for (const [c] of CON) cells[`${khoa}__${c}`] = k?.[c] ?? 0;
    }
    return { cells };
  });

  const cong = (lay: (n: QuyetToanNguoi) => number) =>
    kq.ds.reduce((s, n) => s + lay(n), 0);

  rows.push({
    cells: {
      hoTen: "Tổng cộng",
      daKhauTru: cong((n) => n.daKhauTru),
      chenhLech: cong((n) => n.chenhLech),
      caNam__thue: cong((n) => n.caNam.thue),
      caNam__tongThuNhapChiuThue: cong((n) => n.caNam.tongThuNhapChiuThue),
    },
    bold: true,
    fill: "total",
  });

  // Người không quyết toán theo lũy tiến in RIÊNG ở cuối, không lẫn vào bảng —
  // hai chế độ thuế khác hẳn nhau.
  if (kq.khongLuyTien.length) {
    rows.push({ spacer: true });
    rows.push({
      cells: { hoTen: "Không quyết toán theo lũy tiến" },
      bold: true,
    });
    for (const n of kq.khongLuyTien) {
      rows.push({ cells: { hoTen: n.hoTen, ghiChu: n.lyDo } });
    }
  }

  return {
    name: "QT TNCN",
    title: "BẢNG QUYẾT TOÁN THUẾ TNCN",
    meta: [
      `Năm ${kq.nam}`,
      `Số kỳ lương đã chốt trong năm: ${kq.soKyDaChotTrongNam}`,
    ],
    columns,
    rows,
  };
}
