import { describe, it, expect } from "vitest";
import { buildPhieuHtml } from "../printPhieu";
import { ChungTu } from "@/types";

const phieu = {
  id: "1",
  soPhieu: "PT001",
  loai: "PHIEU_THU",
  ngay: "2026-06-20T00:00:00.000Z",
  soTien: 1234567,
  noiDung: "Thu tiền dịch vụ",
  nguoiGiaoDich: "Nguyễn Văn A",
  diaChi: "Hà Nội",
  ghiChu: "02",
  danhMuc: {
    taiKhoanNo: { ma: "111", ten: "Tiền mặt", loai: "", nhom: "" },
    taiKhoanCo: { ma: "511", ten: "Doanh thu", loai: "", nhom: "" },
  },
} as unknown as ChungTu;

describe("buildPhieuHtml", () => {
  it("thay placeholder bằng dữ liệu phiếu", () => {
    const out = buildPhieuHtml(phieu, "{{soPhieu}}|{{nguoiGiaoDich}}|{{taiKhoanNo}}|{{taiKhoanCo}}");
    expect(out).toBe("PT001|Nguyễn Văn A|111|511");
  });

  it("đọc số tiền bằng chữ và định dạng số tiền", () => {
    const out = buildPhieuHtml(phieu, "{{soTienBangChu}}");
    expect(out).toBe(
      "Một triệu hai trăm ba mươi tư nghìn năm trăm sáu mươi bảy đồng"
    );
  });

  it("tách ngày/tháng/năm", () => {
    const out = buildPhieuHtml(phieu, "{{ngay}}-{{thang}}-{{nam}}");
    expect(out).toBe("20-06-2026");
  });

  it("placeholder thiếu dữ liệu → chuỗi rỗng, không sót {{...}}", () => {
    const minimal = { soPhieu: "PC9", loai: "PHIEU_CHI", ngay: "2026-01-02", soTien: 0 } as unknown as ChungTu;
    const out = buildPhieuHtml(minimal, "[{{nguoiGiaoDich}}][{{diaChi}}][{{taiKhoanNo}}]");
    expect(out).toBe("[][][]");
    expect(out).not.toContain("{{");
  });

  it("dùng thông tin công ty truyền vào", () => {
    const out = buildPhieuHtml(phieu, "{{tenCongTy}}", { tenCongTy: "CTY ABC" });
    expect(out).toBe("CTY ABC");
  });
});
