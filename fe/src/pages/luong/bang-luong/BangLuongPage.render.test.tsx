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
import { cauHinhLuongService, CauHinhLuong } from "@/services/cauHinhLuongService";

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
  hopDongThu2: false,
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
    chiPhiBHCongTy: 1_183_000,
    tongChiPhiCongTy: 9_683_000,
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
    chiPhiBHCongTy: 1_183_000,
    tongChiPhiCongTy: 11_683_000,
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

  it("hiện cột chi phí BH công ty với số của dòng", async () => {
    moMan();

    // `findAllBy*`: antd render tiêu đề cột 2 lần (thêm một hàng đo ẩn).
    expect((await screen.findAllByText("CP BH công ty")).length).toBeGreaterThan(0);
    // Xuất hiện ở cả ô của dòng và dòng "Tổng cộng" (chỉ có 1 dòng dữ liệu).
    expect(screen.getAllByText("1.183.000").length).toBeGreaterThan(0);
  });

  it("dòng chốt trước P4.1 thiếu chiPhiBHCongTy → hiện 0, không vỡ màn", async () => {
    vi.spyOn(bangLuongService, "danhSach").mockResolvedValue([
      {
        ...seedDong,
        khaiBao: { ...seedDong.khaiBao, chiPhiBHCongTy: undefined },
      },
    ]);
    render(<BangLuongPage />);

    expect((await screen.findAllByText("CP BH công ty")).length).toBeGreaterThan(0);
    expect(screen.getByText("8.500.000")).toBeTruthy();
  });

  it("gắn nhãn HĐ2 cho dòng hopDongThu2", async () => {
    vi.spyOn(bangLuongService, "danhSach").mockResolvedValue([
      { ...seedDong, hopDongThu2: true },
    ]);
    render(<BangLuongPage />);

    expect(await screen.findByText("HĐ2")).toBeTruthy();
  });

  it("gắn nhãn 'riêng' khi cauHinhApDung lệch cấu hình chung", async () => {
    vi.spyOn(bangLuongService, "danhSach").mockResolvedValue([
      {
        ...seedDong,
        cauHinhApDung: {
          congChuan: 26, // cấu hình chung là 24
          thuViecTyLe: 0.85,
          bhxhTyLe: 0.105,
          bhxhCanCu: "MUC_KHAI_BAO",
        },
      },
    ]);
    vi.spyOn(cauHinhLuongService, "get").mockResolvedValue({
      congChuan: 24,
      thuViec: { tyLe: 0.85 },
      bhxh: { tyLe: 0.105, canCu: "MUC_KHAI_BAO" },
      khoanLuong: [],
    } as unknown as CauHinhLuong);
    render(<BangLuongPage />);

    expect(await screen.findByText("riêng")).toBeTruthy();
  });

  it("KHÔNG gắn nhãn 'riêng' khi cauHinhApDung trùng cấu hình chung", async () => {
    vi.spyOn(bangLuongService, "danhSach").mockResolvedValue([
      {
        ...seedDong,
        cauHinhApDung: {
          congChuan: 24,
          thuViecTyLe: 0.85,
          bhxhTyLe: 0.105,
          bhxhCanCu: "MUC_KHAI_BAO",
        },
      },
    ]);
    vi.spyOn(cauHinhLuongService, "get").mockResolvedValue({
      congChuan: 24,
      thuViec: { tyLe: 0.85 },
      bhxh: { tyLe: 0.105, canCu: "MUC_KHAI_BAO" },
      khoanLuong: [],
    } as unknown as CauHinhLuong);
    render(<BangLuongPage />);

    await screen.findByText("8.500.000");
    expect(screen.queryByText("riêng")).toBeNull();
  });
});
