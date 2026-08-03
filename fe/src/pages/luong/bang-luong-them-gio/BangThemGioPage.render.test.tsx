// @vitest-environment jsdom
/**
 * Màn "Bảng lương thêm giờ" (mẫu 03-LĐTL) — P4.2c-1.
 *
 * Điểm quan trọng nhất được khoá ở đây: nhóm cột SINH ĐỘNG theo tập loại ngày
 * có trong dữ liệu, gộp từ MỌI dòng. Lấy khoá từ dòng đầu là bẫy thật — nhân
 * viên đầu tiên có thể không làm ca đêm, và cột "Buổi đêm" vẫn phải in ra đúng
 * biểu mẫu pháp định.
 */
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { hoTen: "Trần Thị HR" },
    hasPermission: () => true,
  }),
}));

import BangThemGioPage from "./BangThemGioPage";
import {
  bangLuongThemGioService,
  type DongLuongThemGio,
} from "@/services/bangLuongThemGioService";

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia =
    w.matchMedia ||
    ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
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

const DONG: DongLuongThemGio = {
  id: "x1",
  thang: "2026-06",
  employeeId: "nv1",
  employeeName: "Đào Thị Kiều Oanh",
  employeeCode: "NV0001",
  luongThang: 5_500_000,
  congChuan: 24,
  soGioMoiNgay: 8,
  donGiaNgay: 229_166.67,
  donGiaGio: 28_645.83,
  theoLoai: {
    ngay_thuong: { soGio: 35, heSo: 1.5, thanhTien: 1_503_906.25 },
  },
  tongTien: 1_503_906.25,
  gioNghiBu: 0,
  tienNghiBu: 0,
  thucNhan: 1_503_906.25,
  gioOtHetHan: 0,
  suaTay: false,
  trangThai: "nhap",
};

async function moMan(ds: DongLuongThemGio[]) {
  vi.spyOn(bangLuongThemGioService, "danhSach").mockResolvedValue(ds);
  return render(<BangThemGioPage />);
}

describe("Màn Bảng lương thêm giờ", () => {
  it("hiện đúng con số kiểm chuẩn của mẫu 03-LĐTL", async () => {
    await moMan([DONG]);

    expect(await screen.findByText("Đào Thị Kiều Oanh")).toBeTruthy();
    expect(screen.getAllByText(/1\.503\.906/).length).toBeGreaterThan(0);
  });

  it("nhóm cột sinh động: gộp loại từ MỌI dòng, không lấy từ dòng đầu", async () => {
    await moMan([
      DONG,
      {
        ...DONG,
        id: "x2",
        employeeName: "Nguyễn Văn B",
        theoLoai: {
          ngay_dem: { soGio: 4, heSo: 1.5, thanhTien: 171_875 },
        },
      },
    ]);

    await screen.findByText("Đào Thị Kiều Oanh");
    // Dòng ĐẦU không có ca đêm — cột vẫn phải hiện vì dòng sau có.
    expect(screen.getByText("Ngày thường")).toBeTruthy();
    expect(screen.getByText("Buổi đêm")).toBeTruthy();
  });

  it("loại công ty tự thêm hiện bằng chính khoá, không bị nuốt mất", async () => {
    await moMan([
      {
        ...DONG,
        theoLoai: { ngay_bao: { soGio: 5, heSo: 2.5, thanhTien: 358_073 } },
      },
    ]);

    await screen.findByText("Đào Thị Kiều Oanh");
    expect(screen.getByText("ngay_bao")).toBeTruthy();
  });

  it("kỳ đã chốt thì hiện nhãn Đã chốt và khoá ô sửa giờ", async () => {
    await moMan([{ ...DONG, trangThai: "chot" }]);

    await screen.findByText("Đào Thị Kiều Oanh");
    expect(screen.getByText("Đã chốt")).toBeTruthy();
    expect(
      screen.queryByLabelText(/Số giờ ngay_thuong của Đào Thị Kiều Oanh/),
    ).toBeNull();
  });

  it("kỳ nháp thì sửa được số giờ", async () => {
    await moMan([DONG]);

    await screen.findByText("Đào Thị Kiều Oanh");
    expect(
      screen.getByLabelText(/Số giờ ngay_thuong của Đào Thị Kiều Oanh/),
    ).toBeTruthy();
  });

  it("chưa có dữ liệu thì mời tổng hợp, không vỡ", async () => {
    await moMan([]);

    expect(
      await screen.findByText(/Chưa có dữ liệu bảng lương thêm giờ tháng này/),
    ).toBeTruthy();
  });
});
