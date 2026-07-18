import { describe, it, expect } from "vitest";
import { buildDanhMucFromResolved } from "../buildDanhMucFromRow";
import type { HopDong } from "@/types";

describe("buildDanhMucFromResolved", () => {
  it("dựng danhMuc với TK Nợ/Có, loại GD, nghiệp vụ", () => {
    const danhMuc = buildDanhMucFromResolved({
      taiKhoanNo: { ma: "111", ten: "Tiền mặt", loai: "TS", nhom: "A" },
      taiKhoanCo: { ma: "511", ten: "Doanh thu", loai: "DT", nhom: "B" },
      loaiGiaoDich: { ma: "PHIEU_THU", ten: "Phiếu thu" },
      nghiepVu: "NV01",
    });

    expect(danhMuc.taiKhoanNo).toEqual({ ma: "111", ten: "Tiền mặt", loai: "TS", nhom: "A" });
    expect(danhMuc.taiKhoanCo?.ma).toBe("511");
    expect(danhMuc.loaiGiaoDich).toEqual({ ma: "PHIEU_THU", ten: "Phiếu thu" });
    expect(danhMuc.nghiepVu).toEqual({ ma: "NV01", ten: "NV01" });
  });

  it("hopDong danhMuc có ma và ten từ soHopDong / tenCongTrinh", () => {
    const hopDong: HopDong = {
      id: "hd-1",
      soHopDong: "HD001",
      tenCongTrinh: "Công trình A",
    };
    const danhMuc = buildDanhMucFromResolved({
      taiKhoanNo: { ma: "111", ten: "", loai: "", nhom: "" },
      taiKhoanCo: { ma: "511", ten: "", loai: "", nhom: "" },
      loaiGiaoDich: { ma: "PHIEU_THU", ten: "Phiếu thu" },
      nghiepVu: "NV01",
      hopDong,
    });
    expect(danhMuc.hopDong?.ma).toBe("HD001");
    expect(danhMuc.hopDong?.ten).toBe("Công trình A");
    expect(danhMuc.hopDong?.soHopDong).toBe("HD001");
  });

  it("hopDong danhMuc dùng soHopDong làm ten khi tenCongTrinh rỗng", () => {
    const hopDong: HopDong = {
      id: "hd-2",
      soHopDong: "HD002",
      tenCongTrinh: "",
    };
    const danhMuc = buildDanhMucFromResolved({
      taiKhoanNo: { ma: "111", ten: "", loai: "", nhom: "" },
      taiKhoanCo: { ma: "511", ten: "", loai: "", nhom: "" },
      loaiGiaoDich: { ma: "PHIEU_THU", ten: "Phiếu thu" },
      nghiepVu: "NV01",
      hopDong,
    });
    expect(danhMuc.hopDong?.ma).toBe("HD002");
    expect(danhMuc.hopDong?.ten).toBe("HD002");
  });

  it("bỏ qua chiều phân bổ không truyền vào", () => {
    const danhMuc = buildDanhMucFromResolved({
      taiKhoanNo: { ma: "111", ten: "", loai: "", nhom: "" },
      taiKhoanCo: { ma: "511", ten: "", loai: "", nhom: "" },
      loaiGiaoDich: { ma: "PHIEU_THU", ten: "Phiếu thu" },
      nghiepVu: "NV01",
    });
    expect(danhMuc.doiTuong).toBeUndefined();
    expect(danhMuc.duAn).toBeUndefined();
  });
});
