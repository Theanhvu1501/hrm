// @vitest-environment jsdom
/**
 * Màn Cấu hình lương — kiểm tra tối thiểu rằng cấu hình tải từ service hiện
 * đúng lên cả 2 tab đầu: khoản lương ("Ăn ca") và bậc thuế.
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

import CauHinhLuongPage from "./CauHinhLuongPage";
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

const seedCauHinh: CauHinhLuong = {
  id: "1",
  mucKhaiBaoMacDinh: 5_000_000,
  congChuan: 26,
  khoanLuong: [
    {
      ma: "LUONG_CONG",
      ten: "Lương theo công",
      loaiCongThuc: "LUONG_THEO_CONG",
      thamSo: {},
      chiuThue: true,
      tranMienThue: null,
      vaoTongThuNhap: true,
      vaoBHXH: true,
      thuTu: 1,
    },
    {
      ma: "AN_CA",
      ten: "Ăn ca",
      loaiCongThuc: "DINH_MUC_x_CONG",
      thamSo: { dinhMuc: 50_000 },
      chiuThue: true,
      tranMienThue: 1_200_000,
      vaoTongThuNhap: true,
      vaoBHXH: false,
      thuTu: 2,
    },
  ],
  giamTruBanThan: 11_000_000,
  giamTruNPT: 4_400_000,
  bhxh: { tyLe: 0.105, canCu: "MUC_KHAI_BAO" },
  bacThue: [
    { den: 5_000_000, suat: 0.05 },
    { den: null, suat: 0.35 },
  ],
  thuViec: { tyLe: 0.85 },
  quyTacThoiVu: { tyLe: 0.1, nguong: 3_000_000 },
  quyTacCamKet: { mienThue: false },
  lamTron: 1_000,
};

function moMan() {
  vi.spyOn(cauHinhLuongService, "get").mockResolvedValue(seedCauHinh);
  return render(<CauHinhLuongPage />);
}

describe("Màn Cấu hình lương", () => {
  it("tải cấu hình và hiện đúng tên khoản lương 'Ăn ca'", async () => {
    moMan();

    expect(await screen.findByDisplayValue("Ăn ca")).toBeTruthy();
    expect(screen.getByDisplayValue("Lương theo công")).toBeTruthy();
  });

  it("chuyển tab Bậc thuế thì hiện đúng bậc thuế đã tải", async () => {
    moMan();

    await screen.findByDisplayValue("Ăn ca");
    fireEvent.click(screen.getByText("Bậc thuế"));

    await waitFor(() => {
      // den = 5_000_000, không formatter -> hiện nguyên số.
      expect(screen.getByDisplayValue("5000000")).toBeTruthy();
      // suat 0.05 -> hiện 5 (%).
      expect(screen.getByDisplayValue("5")).toBeTruthy();
    });
  });
});
