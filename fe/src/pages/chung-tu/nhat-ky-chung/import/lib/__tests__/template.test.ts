import { describe, it, expect } from "vitest";
import { buildTemplateWorkbook } from "../template";
import { ImportMasterData } from "../validate";
import { IMPORT_COLUMNS } from "../columns";

const md: ImportMasterData = {
  taiKhoanList: [{ ma: "111", ten: "Tiền mặt", loai: "TS", nhom: "A" }],
  loaiGiaoDichList: [{ id: "1", ma: "PHIEU_THU", ten: "Phiếu thu" }] as ImportMasterData["loaiGiaoDichList"],
  quyChuanList: [{ id: "q1", loaiGiaoDich: "PHIEU_THU", nghiepVu: "NV01", taiKhoanNo: "111", taiKhoanCo: "511", moTa: "Bán hàng" }] as ImportMasterData["quyChuanList"],
  doiTuongList: [{ id: "d1", ma: "KH001", ten: "KH A", loai: ["KHACH_HANG"] }] as ImportMasterData["doiTuongList"],
  nganHangList: [{ id: "nh1", ma: "TK_VCB", ten: "Vietcombank" }] as ImportMasterData["nganHangList"],
  duAnList: [],
  boPhanList: [],
  sanPhamList: [],
  dongTienList: [],
  khoanMucList: [],
  hopDongList: [],
  nhomKhuyenMaiList: [],
  nhomQuanLyList: [],
};

describe("buildTemplateWorkbook", () => {
  it("có sheet chính NhatKyChung + đủ 12 sheet danh mục", () => {
    const wb = buildTemplateWorkbook(md);
    const names = wb.worksheets.map((w) => w.name);
    expect(names[0]).toBe("NhatKyChung");
    [
      "DM_LoaiGiaoDich", "DM_NghiepVu", "DM_TaiKhoan", "DM_DoiTuong",
      "DM_DuAn", "DM_BoPhan", "DM_SanPham", "DM_DongTien",
      "DM_KhoanMuc", "DM_HopDong", "DM_NhomKhuyenMai", "DM_NhomQuanLy",
    ].forEach((n) => expect(names).toContain(n));
    expect(names.length).toBe(13);
  });

  it("hàng 1 sheet chính là header đúng cột đầu", () => {
    const wb = buildTemplateWorkbook(md);
    const main = wb.getWorksheet("NhatKyChung")!;
    expect(main.getCell(1, 1).value).toBe("Ngày chứng từ");
    expect(main.getCell(1, 2).value).toBe("Loại giao dịch");
  });

  it("sheet danh mục chứa chuỗi 'Mã - Tên'", () => {
    const wb = buildTemplateWorkbook(md);
    expect(wb.getWorksheet("DM_TaiKhoan")!.getCell("A1").value).toBe("111 - Tiền mặt");
    expect(wb.getWorksheet("DM_NghiepVu")!.getCell("A1").value).toBe("NV01 - Bán hàng (PHIEU_THU)");
  });

  it("sheet DM_DoiTuong gồm cả đối tượng thường và ngân hàng & quỹ", () => {
    const wb = buildTemplateWorkbook(md);
    const ws = wb.getWorksheet("DM_DoiTuong")!;
    const values = ws.getColumn(1).values.filter(Boolean).map(String);
    expect(values).toContain("KH001 - KH A");
    expect(values).toContain("TK_VCB - Vietcombank");
  });

  it("header có cột Ngày ghi sổ và Nhóm chứng từ", () => {
    const wb = buildTemplateWorkbook(md);
    const header = wb.getWorksheet("NhatKyChung")!.getRow(1).values as string[];
    expect(header).toContain("Ngày ghi sổ");
    expect(header).toContain("Nhóm chứng từ");
  });

  it("có 2 dòng ví dụ cùng nhóm HD001", () => {
    const wb = buildTemplateWorkbook(md);
    const ws = wb.getWorksheet("NhatKyChung")!;
    expect(ws.getRow(2).getCell(IMPORT_COLUMNS.findIndex((c) => c.key === "nhomGop") + 1).value).toBe("HD001");
    expect(ws.getRow(3).getCell(IMPORT_COLUMNS.findIndex((c) => c.key === "nhomGop") + 1).value).toBe("HD001");
  });

  it("cột danh mục ở sheet chính có data validation list; cột Ngày thì không", () => {
    const wb = buildTemplateWorkbook(md);
    const main = wb.getWorksheet("NhatKyChung")!;
    const lgdCell = main.getCell(2, 2); // cột 2 = Loại giao dịch
    expect(lgdCell.dataValidation?.type).toBe("list");
    expect(lgdCell.dataValidation?.formulae?.[0]).toContain("DM_LoaiGiaoDich");
    expect(main.getCell(2, 1).dataValidation).toBeUndefined(); // cột 1 = Ngày
  });
});
