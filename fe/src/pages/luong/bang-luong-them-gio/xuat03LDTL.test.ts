import { describe, it, expect } from "vitest";
import { dung03LDTL } from "./xuat03LDTL";
import { buildReportWorkbook, leafCols } from "@/utils/exportReportExcel";
import type { DongLuongThemGio } from "@/services/bangLuongThemGioService";

const DONG: DongLuongThemGio = {
  id: "x1",
  thang: "2026-06",
  employeeId: "nv1",
  employeeName: "Đào Thị Kiều Oanh",
  employeeCode: "NV0001",
  luongThang: 5_500_000,
  congChuan: 24,
  soGioMoiNgay: 8,
  donGiaNgay: 229_166.67,
  donGiaGio: 28_645.83,
  theoLoai: {
    ngay_thuong: { soGio: 35, heSo: 1.5, thanhTien: 1_503_906.25 },
    ngay_dem: { soGio: 0, heSo: 1.5, thanhTien: 0 },
  },
  tongTien: 1_503_906.25,
  gioNghiBu: 0,
  tienNghiBu: 0,
  thucNhan: 1_503_906.25,
  gioOtHetHan: 0,
  suaTay: false,
  trangThai: "nhap",
};

describe("dung03LDTL", () => {
  it("tiêu đề và số hiệu mẫu đúng biểu mẫu pháp định", () => {
    const s = dung03LDTL("2026-06", [DONG], "Công ty cổ phần Master CEO");

    expect(s.title).toMatch(/BẢNG THANH TOÁN TIỀN LÀM THÊM GIỜ/);
    expect(s.meta?.join(" ")).toMatch(/Mẫu số: 03 - LĐTL/);
    expect(s.meta?.join(" ")).toMatch(/Công ty cổ phần Master CEO/);
    expect(s.meta?.join(" ")).toMatch(/Tháng 06 năm 2026/);
  });

  it("mỗi loại ngày là một nhóm hai cột Số giờ / Thành tiền", () => {
    const s = dung03LDTL("2026-06", [DONG], "X");
    const nhom = s.columns.find((c) => c.header === "Ngày thường");

    expect(nhom?.children?.map((c) => c.header)).toEqual([
      "Số giờ",
      "Thành tiền",
    ]);
  });

  it("in ĐỦ cột kể cả loại có 0 giờ — khớp mẫu pháp định", () => {
    const s = dung03LDTL("2026-06", [DONG], "X");
    expect(s.columns.some((c) => c.header === "Buổi đêm")).toBe(true);
  });

  it("gộp loại từ MỌI dòng, không lấy từ dòng đầu", () => {
    const s = dung03LDTL(
      "2026-06",
      [
        { ...DONG, theoLoai: { ngay_thuong: DONG.theoLoai.ngay_thuong } },
        {
          ...DONG,
          id: "x2",
          theoLoai: { ngay_le: { soGio: 8, heSo: 3, thanhTien: 687_500 } },
        },
      ],
      "X",
    );

    expect(s.columns.some((c) => c.header === "Ngày lễ / Tết")).toBe(true);
  });

  it("dòng dữ liệu mang đúng con số kiểm chuẩn", () => {
    const s = dung03LDTL("2026-06", [DONG], "X");
    const r = s.rows.find((x) => x.cells?.hoTen === "Đào Thị Kiều Oanh");

    expect(r?.cells?.luongThang).toBe(5_500_000);
    expect(r?.cells?.donGiaGio).toBeCloseTo(28_645.83, 2);
    expect(r?.cells?.["ngay_thuong__soGio"]).toBe(35);
    expect(r?.cells?.["ngay_thuong__thanhTien"]).toBeCloseTo(1_503_906.25, 2);
    expect(r?.cells?.thucNhan).toBeCloseTo(1_503_906.25, 2);
  });

  it("có dòng TỔNG cộng đúng theo chiều dọc", () => {
    const s = dung03LDTL(
      "2026-06",
      [DONG, { ...DONG, id: "x2", employeeName: "Nguyễn Văn B" }],
      "X",
    );
    const tong = s.rows.find((r) => r.fill === "total");

    expect(tong?.cells?.thucNhan).toBeCloseTo(2 * 1_503_906.25, 2);
    expect(tong?.cells?.["ngay_thuong__soGio"]).toBe(70);
  });

  it("có khối chữ ký Người lập / Kế toán / Giám đốc", () => {
    const s = dung03LDTL("2026-06", [DONG], "X");
    const chuoi = JSON.stringify(s.rows);

    expect(chuoi).toMatch(/Người lập/);
    expect(chuoi).toMatch(/Kế toán/);
    expect(chuoi).toMatch(/Giám đốc/);
    expect(chuoi).toMatch(/ký và ghi rõ họ tên/);
  });

  it("dựng được workbook thật, không ném", () => {
    const s = dung03LDTL("2026-06", [DONG], "X");
    expect(() => buildReportWorkbook([s])).not.toThrow();
    expect(leafCols(s.columns).length).toBeGreaterThan(5);
  });

  it("không có dòng nào vẫn dựng được sheet (in mẫu trống để ký tay)", () => {
    const s = dung03LDTL("2026-06", [], "X");
    expect(() => buildReportWorkbook([s])).not.toThrow();
  });
});
