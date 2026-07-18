// fe/src/pages/chung-tu/nhat-ky-chung/doiTuongConfig.test.ts
import { describe, it, expect } from "vitest";
import {
  getDoiTuongSelectConfig,
  getSelectedDoiTuongLoai,
} from "./doiTuongConfig";
import { DoiTuong, TaiKhoanNganHang } from "@/types";

const doiTuongList: DoiTuong[] = [
  { id: "kh1", loai: ["KHACH_HANG"], ma: "KH001", ten: "Cty A" },
  { id: "ncc1", loai: ["NHA_CUNG_CAP"], ma: "NCC001", ten: "Cty B" },
  { id: "nv1", loai: ["NHAN_VIEN"], ma: "NV001", ten: "Nguyễn Văn C" },
  // Đối tượng đa loại: vừa Khách hàng vừa Nhà cung cấp
  { id: "both1", loai: ["KHACH_HANG", "NHA_CUNG_CAP"], ma: "DT001", ten: "Cty AB" },
];

const nganHangList: TaiKhoanNganHang[] = [
  { id: "nh1", ma: "VCB01", ten: "Vietcombank CN1", loai: "NGAN_HANG", soDu: 0 },
  { id: "tm1", ma: "TM01", ten: "Quỹ tiền mặt", loai: "TIEN_MAT", soDu: 0 },
];

describe("getDoiTuongSelectConfig", () => {
  it("TK không khai chiTietTheo → disabled, không có options", () => {
    const cfg = getDoiTuongSelectConfig(undefined, doiTuongList, nganHangList);
    expect(cfg.disabled).toBe(true);
    expect(cfg.options).toEqual([]);
  });

  it("chiTietTheo=KHACH_HANG → đối tượng có loại KHACH_HANG (gồm cả đa loại)", () => {
    const cfg = getDoiTuongSelectConfig("KHACH_HANG", doiTuongList, nganHangList);
    expect(cfg.disabled).toBe(false);
    expect(cfg.options).toEqual([
      { value: "kh1", label: "KH001 - Cty A" },
      { value: "both1", label: "DT001 - Cty AB" },
    ]);
  });

  it("đối tượng đa loại xuất hiện ở cả dropdown NHA_CUNG_CAP", () => {
    const cfg = getDoiTuongSelectConfig("NHA_CUNG_CAP", doiTuongList, nganHangList);
    expect(cfg.options).toEqual([
      { value: "ncc1", label: "NCC001 - Cty B" },
      { value: "both1", label: "DT001 - Cty AB" },
    ]);
  });

  it("chiTietTheo=NGAN_HANG_QUY → danh sách ngân hàng & quỹ", () => {
    const cfg = getDoiTuongSelectConfig("NGAN_HANG_QUY", doiTuongList, nganHangList);
    expect(cfg.disabled).toBe(false);
    expect(cfg.options).toEqual([
      { value: "nh1", label: "VCB01 - Vietcombank CN1" },
      { value: "tm1", label: "TM01 - Quỹ tiền mặt" },
    ]);
  });

  it("chiTietTheo=NHAN_VIEN → chỉ nhân viên", () => {
    const cfg = getDoiTuongSelectConfig("NHAN_VIEN", doiTuongList, nganHangList);
    expect(cfg.options).toEqual([{ value: "nv1", label: "NV001 - Nguyễn Văn C" }]);
  });
});

describe("getSelectedDoiTuongLoai", () => {
  it("id thuộc doiTuongList → trả về mảng loai của đối tượng", () => {
    expect(getSelectedDoiTuongLoai("ncc1", doiTuongList, nganHangList)).toEqual(["NHA_CUNG_CAP"]);
  });

  it("đối tượng đa loại → trả về đủ các loại", () => {
    expect(getSelectedDoiTuongLoai("both1", doiTuongList, nganHangList)).toEqual([
      "KHACH_HANG",
      "NHA_CUNG_CAP",
    ]);
  });

  it("id thuộc nganHangList → trả về [NGAN_HANG_QUY]", () => {
    expect(getSelectedDoiTuongLoai("nh1", doiTuongList, nganHangList)).toEqual(["NGAN_HANG_QUY"]);
  });

  it("id không tồn tại → undefined", () => {
    expect(getSelectedDoiTuongLoai("xxx", doiTuongList, nganHangList)).toBeUndefined();
  });
});
