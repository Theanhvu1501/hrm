import { describe, it, expect } from "vitest";
import { buildTemplateWorkbook } from "../template";
import { ImportMasterData } from "../validate";

const md: ImportMasterData = {
  doiTuongList: [{ id: "d1", ma: "KH001", ten: "KH A", loai: ["KHACH_HANG"] }] as ImportMasterData["doiTuongList"],
  duAnList: [],
  boPhanList: [],
  sanPhamList: [],
  dongTienList: [],
  khoanMucList: [],
  hopDongList: [],
  nhomKhuyenMaiList: [],
  nhomQuanLyList: [],
};

describe("buildTemplateWorkbook (phiếu thu/chi)", () => {
  it("có sheet chính PhieuThuChi + đủ 9 sheet danh mục", () => {
    const wb = buildTemplateWorkbook(md);
    const names = wb.worksheets.map((w) => w.name);
    expect(names[0]).toBe("PhieuThuChi");
    [
      "DM_DoiTuong", "DM_DuAn", "DM_BoPhan", "DM_SanPham",
      "DM_DongTien", "DM_KhoanMuc", "DM_HopDong", "DM_NhomKhuyenMai", "DM_NhomQuanLy",
    ].forEach((n) => expect(names).toContain(n));
    expect(names.length).toBe(10); // 1 main + 9 danh mục
  });

  it("hàng 1 sheet chính là header đúng: Ngày chứng từ, Số tiền (không có Loại giao dịch)", () => {
    const wb = buildTemplateWorkbook(md);
    const main = wb.getWorksheet("PhieuThuChi")!;
    expect(main.getCell(1, 1).value).toBe("Ngày chứng từ");
    expect(main.getCell(1, 2).value).toBe("Số tiền");
    expect(main.getCell(1, 3).value).toBe("Nội dung");
    // Không có cột Loại giao dịch, Nghiệp vụ, TK Nợ, TK Có
  });

  it("không có sheet DM_LoaiGiaoDich, DM_TaiKhoan, DM_NghiepVu", () => {
    const wb = buildTemplateWorkbook(md);
    const names = wb.worksheets.map((w) => w.name);
    expect(names).not.toContain("DM_LoaiGiaoDich");
    expect(names).not.toContain("DM_TaiKhoan");
    expect(names).not.toContain("DM_NghiepVu");
  });

  it("sheet danh mục chứa chuỗi 'Mã - Tên'", () => {
    const wb = buildTemplateWorkbook(md);
    expect(wb.getWorksheet("DM_DoiTuong")!.getCell("A1").value).toBe("KH001 - KH A");
  });

  it("cột danh mục ở sheet chính có data validation list; cột Ngày thì không", () => {
    const wb = buildTemplateWorkbook(md);
    const main = wb.getWorksheet("PhieuThuChi")!;
    // cột 7 = doiTuong (index 6)
    const doiTuongCell = main.getCell(2, 7);
    expect(doiTuongCell.dataValidation?.type).toBe("list");
    expect(doiTuongCell.dataValidation?.formulae?.[0]).toContain("DM_DoiTuong");
    // cột 1 = Ngày - không có dropdown
    expect(main.getCell(2, 1).dataValidation).toBeUndefined();
    // cột 2 = Số tiền - không có dropdown
    expect(main.getCell(2, 2).dataValidation).toBeUndefined();
  });
});
