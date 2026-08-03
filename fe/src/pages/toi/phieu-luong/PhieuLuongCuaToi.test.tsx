// @vitest-environment jsdom
/**
 * Phiếu lương của tôi — dữ liệu nhạy cảm nhất hệ thống.
 *
 * Bài quan trọng nhất ở đây không phải "hiện đúng số" mà là "KHÔNG hiện mức
 * khai báo": lộ nó ra là phơi bày chiến lược khai báo BHXH của công ty cho
 * toàn bộ nhân viên.
 */
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { hoTen: "Đào Thị Kiều Oanh" }, hasPermission: () => true }),
}));

import PhieuLuongCuaToi from "./PhieuLuongCuaToi";
import { phieuLuongService, type PhieuLuong } from "@/services/phieuLuongService";

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia =
    w.matchMedia ||
    ((q: string) => ({
      matches: false, media: q, onchange: null,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {},
      dispatchEvent: () => false,
    }));
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

afterEach(() => vi.restoreAllMocks());

const PHIEU: PhieuLuong = {
  thang: "2026-07",
  hoTen: "Đào Thị Kiều Oanh",
  maNhanVien: "NV0001",
  congThuong: 24, congThuViec: 0, congKhac: 0,
  khoan: [
    { ma: "LUONG_CONG", ten: "Lương theo công", soTien: 12_000_000 },
    { ma: "TIEN_OT", ten: "Tiền làm thêm giờ", soTien: 1_504_000 },
  ],
  tongThuNhap: 13_504_000,
  bhxh: 577_500,
  thue: 45_000,
  phiCongDoan: 110_000,
  tamUng: 0,
  khauTruKhac: 0,
  thucLinh: 12_771_500,
  thuNhapMienThue: 15_500_000,
  giamTru: 15_500_000,
  thuNhapTinhThue: 0,
};

describe("Phiếu lương của tôi", () => {
  it("hiện từng khoản kèm nhãn tiếng Việt và thực lĩnh", async () => {
    vi.spyOn(phieuLuongService, "cacKy").mockResolvedValue(["2026-07"]);
    vi.spyOn(phieuLuongService, "phieu").mockResolvedValue(PHIEU);
    render(<PhieuLuongCuaToi />);

    expect(await screen.findByText("Lương theo công")).toBeTruthy();
    expect(screen.getByText("Tiền làm thêm giờ")).toBeTruthy();
    expect(screen.getAllByText(/12\.771\.500/).length).toBeGreaterThan(0);
  });

  it("KHÔNG hiện chữ nào về mức khai báo", async () => {
    vi.spyOn(phieuLuongService, "cacKy").mockResolvedValue(["2026-07"]);
    vi.spyOn(phieuLuongService, "phieu").mockResolvedValue(PHIEU);
    const { container } = render(<PhieuLuongCuaToi />);

    await screen.findByText("Lương theo công");
    expect(container.textContent).not.toMatch(/khai báo/i);
  });

  it("chưa có kỳ nào thì báo rõ, không vỡ", async () => {
    vi.spyOn(phieuLuongService, "cacKy").mockResolvedValue([]);
    render(<PhieuLuongCuaToi />);

    expect(await screen.findByText(/Chưa có phiếu lương nào/)).toBeTruthy();
  });

  it("kỳ chưa chốt (API trả null) báo rõ, không hiện bảng trống", async () => {
    vi.spyOn(phieuLuongService, "cacKy").mockResolvedValue(["2026-08"]);
    vi.spyOn(phieuLuongService, "phieu").mockResolvedValue(null);
    render(<PhieuLuongCuaToi />);

    expect(await screen.findByText(/Chưa có phiếu lương tháng này/)).toBeTruthy();
  });

  it("tài khoản chưa gắn hồ sơ nhân viên báo rõ, không màn trắng", async () => {
    vi.spyOn(phieuLuongService, "cacKy").mockRejectedValue({
      response: { status: 404 },
    });
    render(<PhieuLuongCuaToi />);

    expect(await screen.findByText(/chưa gắn hồ sơ nhân viên/i)).toBeTruthy();
  });
});
