import { describe, it, expect } from "vitest";
import { hienBuoi, truongCuaDon } from "./truongTheoLoaiDon";

describe("truongCuaDon — nghỉ bù", () => {
  it("theo_ngay hiện đến ngày và buổi, không hiện giờ", () => {
    const t = truongCuaDon({ loaiDon: "nghi_bu", kieuNghi: "theo_ngay", ngay: "2026-02-10" });
    expect(t).toContain("denNgay");
    expect(t).toContain("buoi");
    expect(t).not.toContain("gioTu");
  });

  it("theo_gio hiện giờ từ/đến, không hiện đến ngày và buổi", () => {
    const t = truongCuaDon({ loaiDon: "nghi_bu", kieuNghi: "theo_gio", ngay: "2026-02-10" });
    expect(t).toContain("gioTu");
    expect(t).toContain("gioDen");
    expect(t).not.toContain("denNgay");
    expect(t).not.toContain("buoi");
  });

  // Mặc định phải là theo_ngay: đó là hành vi cũ, và đơn cũ nạp vào form sửa
  // không có kieuNghi.
  it("thiếu kieuNghi mặc định theo ngày", () => {
    const t = truongCuaDon({ loaiDon: "nghi_bu", ngay: "2026-02-10" });
    expect(t).toContain("denNgay");
    expect(t).not.toContain("gioTu");
  });

  it("nghỉ phép không đổi", () => {
    const t = truongCuaDon({ loaiDon: "nghi_phep", ngay: "2026-02-10" });
    expect(t).toEqual(["ngay", "denNgay", "buoi", "loaiNghi", "lyDo"]);
  });
});

describe("truongCuaDon — làm online", () => {
  it("hiện khoảng ngày, buổi và lý do; không hiện giờ hay loại nghỉ", () => {
    const t = truongCuaDon({ loaiDon: "lam_online", ngay: "2026-08-10" });
    expect(t).toContain("ngay");
    expect(t).toContain("denNgay");
    expect(t).toContain("buoi");
    expect(t).toContain("lyDo");
    expect(t).not.toContain("gioTu");
    // Đơn online là ngày LÀM, không phải ngày nghỉ — không có loại nghỉ nào
    // để chọn, và cho chọn là mở đường trừ nhầm quỹ phép.
    expect(t).not.toContain("loaiNghi");
  });

  it("hiện chọn buổi khi đơn đúng một ngày, ẩn khi nhiều ngày", () => {
    expect(
      hienBuoi({ loaiDon: "lam_online", ngay: "2026-08-10", denNgay: "2026-08-10" }),
    ).toBe(true);
    expect(
      hienBuoi({ loaiDon: "lam_online", ngay: "2026-08-10", denNgay: "2026-08-12" }),
    ).toBe(false);
  });
});
