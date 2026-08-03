import { describe, it, expect } from "vitest";
import { dungSheetQuyetToan } from "./xuatQuyetToan";
import { buildReportWorkbook, leafCols } from "@/utils/exportReportExcel";
import type { KetQuaQuyetToan } from "@/services/quyetToanTncnService";

const ky = (over: Partial<Record<string, number>> = {}) => ({
  tongThuNhapChiuThue: 0, bhxh: 0, khoanMienThue: 0,
  giamTruBanThan: 0, giamTruNPT: 0, giamTruGiaCanh: 0,
  thuNhapTinhThue: 0, thue: 0, ...over,
});

const KQ: KetQuaQuyetToan = {
  nam: 2026,
  soKyDaChotTrongNam: 12,
  ds: [
    {
      employeeId: "nv1", hoTen: "Nguyễn Văn A", maNhanVien: "NV0001",
      soKyDaChot: 12,
      caNam: ky({ tongThuNhapChiuThue: 240_000_000, thue: 8_000_000 }),
      quy: [ky({ thue: 1_000_000 }), ky(), ky(), ky({ thue: 5_000_000 })],
      daKhauTru: 6_000_000,
      chenhLech: 2_000_000,
    },
  ],
  khongLuyTien: [{ employeeId: "nv2", hoTen: "Trần Thị B", lyDo: "thời vụ, khấu trừ 10%" }],
};

describe("dungSheetQuyetToan", () => {
  it("có đủ 5 nhóm cột đúng bố cục sheet QT TNCN", () => {
    const s = dungSheetQuyetToan(KQ);
    const nhom = s.columns.map((c) => c.header);

    expect(nhom).toContain("CẢ NĂM");
    expect(nhom).toContain("Quý 1");
    expect(nhom).toContain("Quý 4");
  });

  it("mỗi nhóm có đúng 8 cột con theo thứ tự sheet", () => {
    const s = dungSheetQuyetToan(KQ);
    const caNam = s.columns.find((c) => c.header === "CẢ NĂM");

    expect(caNam?.children?.map((c) => c.header)).toEqual([
      "Tổng thu nhập chịu thuế", "BHXH", "Ăn ca",
      "Giảm trừ bản thân", "Người phụ thuộc", "Giảm trừ gia cảnh",
      "Thu nhập tính thuế", "Thuế phải nộp",
    ]);
  });

  it("có hai cột sheet gốc KHÔNG có: Đã khấu trừ và Chênh lệch", () => {
    // Thiếu chúng thì bảng không trả lời được câu hỏi nó sinh ra để trả lời.
    const s = dungSheetQuyetToan(KQ);
    const nhan = s.columns.map((c) => c.header);

    expect(nhan).toContain("Đã khấu trừ");
    expect(nhan).toContain("Chênh lệch");
  });

  it("dòng dữ liệu mang đúng số của cả năm và quý", () => {
    const s = dungSheetQuyetToan(KQ);
    const r = s.rows.find((x) => x.cells?.hoTen === "Nguyễn Văn A");

    expect(r?.cells?.["caNam__thue"]).toBe(8_000_000);
    expect(r?.cells?.["q1__thue"]).toBe(1_000_000);
    expect(r?.cells?.["q4__thue"]).toBe(5_000_000);
    expect(r?.cells?.chenhLech).toBe(2_000_000);
  });

  it("in RIÊNG người không quyết toán theo lũy tiến, kèm lý do", () => {
    const s = dungSheetQuyetToan(KQ);
    const chuoi = JSON.stringify(s.rows);

    expect(chuoi).toMatch(/Không quyết toán theo lũy tiến/);
    expect(chuoi).toMatch(/thời vụ/);
    // KHÔNG được lẫn vào bảng lũy tiến — hai chế độ thuế khác hẳn.
    const dongDuLieu = s.rows.filter((r) => r.cells?.maNhanVien);
    expect(dongDuLieu.some((r) => r.cells?.hoTen === "Trần Thị B")).toBe(false);
  });

  it("meta nêu số kỳ đã chốt để biết bảng có thiếu tháng không", () => {
    const s = dungSheetQuyetToan(KQ);
    expect(s.meta?.join(" ")).toMatch(/Số kỳ lương đã chốt trong năm: 12/);
  });

  it("dựng được workbook thật, không ném", () => {
    const s = dungSheetQuyetToan(KQ);
    expect(() => buildReportWorkbook([s])).not.toThrow();
    expect(leafCols(s.columns).length).toBe(3 + 5 * 8 + 3);
  });

  it("bảng rỗng vẫn dựng được", () => {
    const s = dungSheetQuyetToan({ ...KQ, ds: [], khongLuyTien: [] });
    expect(() => buildReportWorkbook([s])).not.toThrow();
  });
});
