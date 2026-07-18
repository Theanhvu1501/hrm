import { describe, it, expect } from "vitest";
import { validateAndBuild, ImportMasterData } from "../validate";
import { RawImportRow } from "../columns";

const masterData: ImportMasterData = {
  taiKhoanList: [
    { ma: "111", ten: "Tiền mặt", loai: "TS", nhom: "A" },
    { ma: "511", ten: "Doanh thu", loai: "DT", nhom: "B" },
  ],
  loaiGiaoDichList: [{ id: "1", ma: "PHIEU_THU", ten: "Phiếu thu" }] as ImportMasterData["loaiGiaoDichList"],
  quyChuanList: [{ id: "q1", loaiGiaoDich: "PHIEU_THU", nghiepVu: "NV01", taiKhoanNo: "111", taiKhoanCo: "511" }] as ImportMasterData["quyChuanList"],
  doiTuongList: [{ id: "dt1", ma: "KH001", ten: "KH A", loai: ["KHACH_HANG"] }] as ImportMasterData["doiTuongList"],
  nganHangList: [{ id: "nh1", ma: "TK_VCB", ten: "Vietcombank", soTaiKhoan: "007123" }] as ImportMasterData["nganHangList"],
  duAnList: [],
  boPhanList: [],
  sanPhamList: [],
  dongTienList: [],
  khoanMucList: [],
  hopDongList: [],
  nhomKhuyenMaiList: [],
  nhomQuanLyList: [],
};

function row(over: Partial<RawImportRow> = {}): RawImportRow {
  return {
    rowNumber: 2,
    ngay: "01/06/2026",
    loaiGiaoDich: "PHIEU_THU",
    nghiepVu: "NV01",
    taiKhoanNo: "111",
    taiKhoanCo: "511",
    soTien: "1000",
    ...over,
  };
}

describe("validateAndBuild", () => {
  it("dòng hợp lệ → item dựng đủ, không lỗi", () => {
    const res = validateAndBuild([row()], masterData);
    expect(res.hasErrors).toBe(false);
    expect(res.validItems).toHaveLength(1);
    const item = res.validItems[0];
    expect(item.loai).toBe("PHIEU_THU");
    expect(item.ngay).toBe("2026-06-01");
    expect(item.soTien).toBe(1000);
    expect(item.danhMuc?.taiKhoanNo?.ma).toBe("111");
    expect(item.danhMuc?.nghiepVu?.ma).toBe("NV01");
  });

  it("thiếu trường bắt buộc → lỗi, không tạo item", () => {
    const res = validateAndBuild([row({ taiKhoanNo: "" })], masterData);
    expect(res.hasErrors).toBe(true);
    expect(res.results[0].errors.some((e) => e.field === "taiKhoanNo")).toBe(true);
    expect(res.results[0].item).toBeNull();
    expect(res.validItems).toHaveLength(0);
  });

  it("ngày sai định dạng → lỗi", () => {
    const res = validateAndBuild([row({ ngay: "2026-06-01" })], masterData);
    expect(res.results[0].errors.some((e) => e.field === "ngay")).toBe(true);
  });

  it("số tiền <= 0 → lỗi", () => {
    const res = validateAndBuild([row({ soTien: "0" })], masterData);
    expect(res.results[0].errors.some((e) => e.field === "soTien")).toBe(true);
  });

  it("mã tài khoản không tồn tại → lỗi", () => {
    const res = validateAndBuild([row({ taiKhoanNo: "999" })], masterData);
    expect(res.results[0].errors.some((e) => e.field === "taiKhoanNo")).toBe(true);
  });

  it("loại giao dịch không tồn tại → lỗi", () => {
    const res = validateAndBuild([row({ loaiGiaoDich: "XXX" })], masterData);
    expect(res.results[0].errors.some((e) => e.field === "loaiGiaoDich")).toBe(true);
  });

  it("nghiệp vụ không thuộc loại giao dịch → lỗi", () => {
    const md2 = { ...masterData, loaiGiaoDichList: [...masterData.loaiGiaoDichList, { id: "2", ma: "PHIEU_CHI", ten: "Phiếu chi" }] as ImportMasterData["loaiGiaoDichList"] };
    const res = validateAndBuild([row({ loaiGiaoDich: "PHIEU_CHI" })], md2);
    expect(res.results[0].errors.some((e) => e.field === "nghiepVu")).toBe(true);
  });

  it("TK Nợ = TK Có → cảnh báo, vẫn tạo item", () => {
    const res = validateAndBuild([row({ taiKhoanCo: "111" })], masterData);
    expect(res.results[0].warnings.some((w) => w.field === "taiKhoanCo")).toBe(true);
    expect(res.results[0].errors).toHaveLength(0);
    expect(res.validItems).toHaveLength(1);
  });

  it("chiều phân bổ có mã nhưng không tồn tại → lỗi", () => {
    const res = validateAndBuild([row({ doiTuong: "KHONG_CO" })], masterData);
    expect(res.results[0].errors.some((e) => e.field === "doiTuong")).toBe(true);
  });

  it("chiều phân bổ khớp mã → vào danhMuc", () => {
    const res = validateAndBuild([row({ doiTuong: "KH001" })], masterData);
    expect(res.hasErrors).toBe(false);
    expect(res.validItems[0].danhMuc?.doiTuong?.ma).toBe("KH001");
  });

  it("đối tượng là ngân hàng & quỹ → khớp danh mục NH, snapshot loai NGAN_HANG_QUY", () => {
    const res = validateAndBuild([row({ doiTuong: "TK_VCB" })], masterData);
    expect(res.hasErrors).toBe(false);
    const dt = res.validItems[0].danhMuc?.doiTuong;
    expect(dt?.ma).toBe("TK_VCB");
    expect(dt?.loai).toBe("NGAN_HANG_QUY");
  });

  it("đối tượng ngân hàng nhận dạng dropdown 'Mã - Tên'", () => {
    const res = validateAndBuild([row({ doiTuong: "TK_VCB - Vietcombank" })], masterData);
    expect(res.hasErrors).toBe(false);
    expect(res.validItems[0].danhMuc?.doiTuong?.ma).toBe("TK_VCB");
  });

  it("gắn ngayGhiSo và nhomGop vào item", () => {
    const rows: RawImportRow[] = [
      {
        rowNumber: 2, ngay: "01/06/2026", ngayGhiSo: "05/06/2026", nhomGop: "HD1",
        loaiGiaoDich: "PHIEU_THU", nghiepVu: "NV01", taiKhoanNo: "111", taiKhoanCo: "511",
        soTien: "1000000", dienGiai: "dong 1",
      },
    ];
    const { validItems, hasErrors } = validateAndBuild(rows, masterData);
    expect(hasErrors).toBe(false);
    expect(validItems[0].ngayGhiSo).toBe("2026-06-05");
    expect(validItems[0].nhomGop).toBe("HD1");
  });

  it("ngayGhiSo sai định dạng → lỗi", () => {
    const rows: RawImportRow[] = [
      {
        rowNumber: 2, ngay: "01/06/2026", ngayGhiSo: "linh tinh",
        loaiGiaoDich: "PHIEU_THU", nghiepVu: "NV01", taiKhoanNo: "111", taiKhoanCo: "511",
        soTien: "1000000",
      },
    ];
    const { results } = validateAndBuild(rows, masterData);
    expect(results[0].errors.some((e) => e.field === "ngayGhiSo")).toBe(true);
  });

  it("batch hỗn hợp: 1 hợp lệ + 1 lỗi → hasErrors true, validItems 1 phần tử, results 2 phần tử", () => {
    const validRow = row({ rowNumber: 2 });
    const errorRow = row({ rowNumber: 3, taiKhoanNo: "999" }); // TK Nợ không tồn tại
    const res = validateAndBuild([validRow, errorRow], masterData);
    expect(res.hasErrors).toBe(true);
    expect(res.validItems).toHaveLength(1);
    expect(res.results).toHaveLength(2);
  });

  it("nhận giá trị dropdown dạng 'Mã - Tên' và map đúng về mã", () => {
    const res = validateAndBuild(
      [
        row({
          loaiGiaoDich: "PHIEU_THU - Phiếu thu",
          nghiepVu: "NV01 - Bán hàng (PHIEU_THU)",
          taiKhoanNo: "111 - Tiền mặt",
          taiKhoanCo: "511 - Doanh thu",
          doiTuong: "KH001 - KH A",
        }),
      ],
      masterData,
    );
    expect(res.hasErrors).toBe(false);
    expect(res.validItems).toHaveLength(1);
    const item = res.validItems[0];
    expect(item.loai).toBe("PHIEU_THU");
    expect(item.danhMuc?.taiKhoanNo?.ma).toBe("111");
    expect(item.danhMuc?.taiKhoanCo?.ma).toBe("511");
    expect(item.danhMuc?.nghiepVu?.ma).toBe("NV01");
    expect(item.danhMuc?.doiTuong?.ma).toBe("KH001");
  });
});
