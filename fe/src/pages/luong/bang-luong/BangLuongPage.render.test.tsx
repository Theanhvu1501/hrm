// @vitest-environment jsdom
/**
 * Màn Bảng lương — kiểm tra tối thiểu rằng danh sách tải từ service hiện
 * đúng tổng thu nhập ở tab Khai báo, và đổi sang tab Thực tế thì hiện đúng
 * số khác (khaiBao và thucTe có giá trị khác nhau trong dữ liệu mẫu).
 * Dùng cột "Tổng thu nhập" thay vì "Thực lĩnh" vì dòng tổng cuối bảng cũng
 * cộng thực lĩnh — với 1 dòng dữ liệu, tổng sẽ trùng giá trị dòng và khiến
 * `findByText` báo "multiple elements" (không phải lỗi màn hình).
 */
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// usePagePermission đọc quyền qua useAuth — mock để màn hiện đủ control sửa,
// thay vì dựng cả AuthProvider + token giả cho một test về nội dung màn.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { hoTen: "Trần Thị HR" },
    hasPermission: () => true,
  }),
}));

import BangLuongPage from "./BangLuongPage";
import { bangLuongService, DongLuong } from "@/services/bangLuongService";

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

afterEach(() => {
  vi.restoreAllMocks();
});

const seedDong: DongLuong = {
  id: "1",
  thang: "2026-07",
  employeeId: "nv1",
  employeeName: "Nguyễn Văn A",
  employeeCode: "NV001",
  congThuong: 22,
  congThuViec: 0,
  congKhac: 0,
  luongThoaThuan: 10_000_000,
  mucKhaiBao: 8_000_000,
  phuCapCoDinh: 0,
  soNguoiPhuThuoc: 0,
  dongBH: true,
  thoiVu: false,
  camKet: false,
  tamUng: 0,
  khauTruKhac: 0,
  nhapTheoKy: { HIEU_SUAT: 500_000 },
  khaiBao: {
    giaTriTungKhoan: { LUONG_CONG: 8_000_000, HIEU_SUAT: 500_000 },
    tongThuNhap: 8_500_000,
    thuNhapMienThue: 0,
    bhxh: 840_000,
    giamTru: 11_000_000,
    thuNhapTinhThue: 0,
    thue: 0,
    thucLinh: 7_660_000,
  },
  thucTe: {
    giaTriTungKhoan: { LUONG_CONG: 10_000_000, HIEU_SUAT: 500_000 },
    tongThuNhap: 10_500_000,
    thuNhapMienThue: 0,
    bhxh: 1_050_000,
    giamTru: 11_000_000,
    thuNhapTinhThue: 0,
    thue: 0,
    thucLinh: 9_450_000,
  },
  trangThai: "nhap",
};

function moMan() {
  vi.spyOn(bangLuongService, "danhSach").mockResolvedValue([seedDong]);
  return render(<BangLuongPage />);
}

describe("Màn Bảng lương", () => {
  it("tải danh sách và hiện đúng tổng thu nhập khai báo ở tab mặc định", async () => {
    moMan();

    expect(await screen.findByText("8.500.000")).toBeTruthy();
  });

  it("chuyển tab Thực tế thì hiện đúng tổng thu nhập thực tế (khác khai báo)", async () => {
    moMan();

    await screen.findByText("8.500.000");
    fireEvent.click(screen.getByText("Thực tế"));

    await waitFor(() => {
      expect(screen.getByText("10.500.000")).toBeTruthy();
    });
    expect(screen.queryByText("8.500.000")).toBeNull();
  });
});
