// @vitest-environment jsdom
/**
 * Tab "Làm thêm & quỹ giờ" của màn Cấu hình lương (review nhánh, IMPORTANT 6).
 *
 * Trước bản vá, `grep -rn "lamThem\|soGioMoiNgay" fe/src` không ra gì: runbook
 * `ops/README.md` bước 3 bảo vận hành "vào màn Cấu hình lương điền và lưu tay"
 * một thứ màn hình chưa hề có. Hệ quả: mọi tenant đã dùng bảng lương trước
 * P4.2a không có đường nào bật quỹ giờ.
 */
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { hoTen: "Trần Thị HR" },
    hasPermission: () => true,
  }),
}));

import CauHinhLuongPage from "./CauHinhLuongPage";
import {
  cauHinhLuongService,
  CauHinhLuong,
} from "@/services/cauHinhLuongService";

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

/** Bản ghi của tenant tạo TRƯỚC P4.2a: không có `lamThem`/`soGioMoiNgay`. */
const cauHinhCu: CauHinhLuong = {
  id: "1",
  mucKhaiBaoMacDinh: 5_000_000,
  congChuan: 26,
  khoanLuong: [],
  giamTruBanThan: 11_000_000,
  giamTruNPT: 4_400_000,
  bhxh: { tyLe: 0.105, canCu: "MUC_KHAI_BAO" },
  bacThue: [{ den: null, suat: 0.35 }],
  thuViec: { tyLe: 0.85 },
  quyTacThoiVu: { tyLe: 0.1, nguong: 3_000_000 },
  quyTacCamKet: { mienThue: false },
  bhCongTy: { tyLe: 0.215, tyLeHopDongThu2: 0.005 },
  lamTron: 1_000,
};

async function moTabLamThem(cauHinh: CauHinhLuong) {
  vi.spyOn(cauHinhLuongService, "get").mockResolvedValue(cauHinh);
  const kq = render(<CauHinhLuongPage />);
  await screen.findByText("Làm thêm & quỹ giờ");
  fireEvent.click(screen.getByText("Làm thêm & quỹ giờ"));
  return kq;
}

describe("Tab Làm thêm & quỹ giờ", () => {
  it("tenant CHƯA bật: nói rõ chưa bật + cảnh báo phải báo HR trước", async () => {
    await moTabLamThem(cauHinhCu);

    expect(
      await screen.findByText(/Công ty chưa bật quỹ giờ làm thêm/),
    ).toBeTruthy();
    // Cảnh báo này là bắt buộc chứ không phải lời khuyên: bật = chặn nộp
    // nghỉ bù toàn công ty cho tới đơn OT đầu tiên được duyệt.
    expect(screen.getByText(/Báo HR TRƯỚC khi bật/)).toBeTruthy();
    expect(screen.getByText("Bật quỹ giờ làm thêm")).toBeTruthy();
  });

  it("bấm Bật thì điền sẵn sàng BLLĐ và hiện đủ ô để sửa trước khi Lưu", async () => {
    await moTabLamThem(cauHinhCu);

    fireEvent.click(await screen.findByText("Bật quỹ giờ làm thêm"));

    await waitFor(() => {
      expect(screen.getByText(/Quỹ giờ làm thêm đang bật/)).toBeTruthy();
    });
    // Hệ số mặc định = đúng sàn BLLĐ 2019 Đ98.1. `step={0.5}` nên antd
    // InputNumber hiện một chữ số thập phân ("2.0", không phải "2").
    expect(screen.getByDisplayValue("1.5")).toBeTruthy();
    expect(screen.getByDisplayValue("2.0")).toBeTruthy();
    expect(screen.getByDisplayValue("3.0")).toBeTruthy();
    // soGioMoiNgay mặc định 8 — con số quy đổi ngày↔giờ cho nghỉ bù.
    expect(screen.getByDisplayValue("8.0")).toBeTruthy();
  });

  it("tenant ĐÃ bật: hiện đúng giá trị đã lưu, không phải mặc định", async () => {
    await moTabLamThem({
      ...cauHinhCu,
      soGioMoiNgay: 7.5,
      lamThem: {
        cheDoBu: "chi_nghi_bu",
        heSoTichQuy: { ngay_thuong: 2, ngay_nghi: 2.5, ngay_le: 3.5 },
        soThangHanDung: 6,
        khiHetHan: "huy_bo",
      },
    });

    expect(await screen.findByDisplayValue("7.5")).toBeTruthy();
    expect(screen.getByDisplayValue("2.5")).toBeTruthy();
    expect(screen.getByDisplayValue("3.5")).toBeTruthy();
    // soThangHanDung khác null ⇒ ô số tháng phải hiện ra.
    expect(screen.getByDisplayValue("6")).toBeTruthy();
  });

  it("soThangHanDung = null (không hết hạn) thì KHÔNG hiện ô số tháng", async () => {
    await moTabLamThem({
      ...cauHinhCu,
      soGioMoiNgay: 8,
      lamThem: {
        cheDoBu: "chi_nghi_bu",
        heSoTichQuy: { ngay_thuong: 1.5, ngay_nghi: 2, ngay_le: 3 },
        soThangHanDung: null,
        khiHetHan: "quy_ra_tien",
      },
    });

    await screen.findByText(/Quỹ giờ làm thêm đang bật/);
    expect(screen.queryByText("Số tháng còn hiệu lực")).toBeNull();
  });
});
