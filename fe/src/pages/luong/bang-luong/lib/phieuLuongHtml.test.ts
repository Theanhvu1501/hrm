import { describe, it, expect } from "vitest";
import { dungPhieuLuongHtml } from "./phieuLuongHtml";
import type { DongLuong } from "@/services/bangLuongService";
import type { KhoanLuong } from "@/services/cauHinhLuongService";

const KHOAN = [
  { ma: "LUONG_CONG", ten: "Lương theo công", vaoTongThuNhap: true },
  { ma: "TIEN_OT", ten: "Tiền làm thêm giờ", vaoTongThuNhap: true },
  { ma: "CP_NOI_BO", ten: "Chi phí nội bộ", vaoTongThuNhap: false },
] as unknown as KhoanLuong[];

const DONG = {
  id: "d1",
  thang: "2026-07",
  employeeId: "nv1",
  employeeName: "Đào Thị Kiều Oanh",
  employeeCode: "NV0001",
  congThuong: 24, congThuViec: 0, congKhac: 0,
  luongThoaThuan: 15_000_000,
  mucKhaiBao: 7_654_321,
  tamUng: 0, khauTruKhac: 0,
  nhapTheoKy: {},
  khaiBao: { thucLinh: 6_543_210 },
  thucTe: {
    giaTriTungKhoan: {
      LUONG_CONG: 12_000_000,
      TIEN_OT: 1_504_000,
      CP_NOI_BO: 999_000,
    },
    tongThuNhap: 13_504_000,
    thuNhapMienThue: 15_500_000,
    bhxh: 577_500,
    giamTru: 15_500_000,
    thuNhapTinhThue: 0,
    thue: 45_000,
    phiCongDoan: 110_000,
    thucLinh: 12_771_500,
  },
  trangThai: "chot",
} as unknown as DongLuong;

describe("dungPhieuLuongHtml", () => {
  it("có tên công ty, tháng, tên nhân viên và thực lĩnh", () => {
    const html = dungPhieuLuongHtml(DONG, KHOAN, "Công ty cổ phần Master CEO");

    expect(html).toContain("Công ty cổ phần Master CEO");
    expect(html).toContain("07/2026");
    expect(html).toContain("Đào Thị Kiều Oanh");
    expect(html).toContain("12.771.500");
  });

  it("KHÔNG in mức khai báo", () => {
    const html = dungPhieuLuongHtml(DONG, KHOAN, "X");

    expect(html).not.toContain("7.654.321");
    expect(html).not.toContain("6.543.210");
  });

  it("BỎ khoản không vào tổng thu nhập", () => {
    const html = dungPhieuLuongHtml(DONG, KHOAN, "X");
    expect(html).not.toContain("Chi phí nội bộ");
  });

  it("escape tên nhân viên — không nội suy chuỗi chưa escape vào HTML", () => {
    const html = dungPhieuLuongHtml(
      { ...DONG, employeeName: "<img src=x onerror=alert(1)>" } as DongLuong,
      KHOAN,
      "X",
    );

    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("có chỗ ký Người lập / Người nhận", () => {
    const html = dungPhieuLuongHtml(DONG, KHOAN, "X");

    expect(html).toMatch(/Người lập/);
    expect(html).toMatch(/Người nhận/);
  });
});
