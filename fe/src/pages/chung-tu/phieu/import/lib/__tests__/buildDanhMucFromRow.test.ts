import { describe, it, expect } from "vitest";
import { buildDanhMucFromResolved } from "../buildDanhMucFromRow";
import type { HopDong } from "@/types";

describe("buildDanhMucFromResolved", () => {
  it("danhMuc rỗng khi không có chiều phân bổ", () => {
    const danhMuc = buildDanhMucFromResolved({});
    expect(danhMuc.taiKhoanNo).toBeUndefined();
    expect(danhMuc.taiKhoanCo).toBeUndefined();
    expect(danhMuc.loaiGiaoDich).toBeUndefined();
    expect(danhMuc.nghiepVu).toBeUndefined();
    expect(danhMuc.doiTuong).toBeUndefined();
    expect(danhMuc.duAn).toBeUndefined();
  });

  it("hopDong danhMuc có ma và ten từ soHopDong / tenCongTrinh", () => {
    const hopDong: HopDong = {
      id: "hd-1",
      soHopDong: "HD001",
      tenCongTrinh: "Công trình A",
    };
    const danhMuc = buildDanhMucFromResolved({ hopDong });
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
    const danhMuc = buildDanhMucFromResolved({ hopDong });
    expect(danhMuc.hopDong?.ma).toBe("HD002");
    expect(danhMuc.hopDong?.ten).toBe("HD002");
  });

  it("bỏ qua chiều phân bổ không truyền vào", () => {
    const danhMuc = buildDanhMucFromResolved({});
    expect(danhMuc.doiTuong).toBeUndefined();
    expect(danhMuc.duAn).toBeUndefined();
    expect(danhMuc.boPhan).toBeUndefined();
  });
});
