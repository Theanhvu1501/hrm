// @vitest-environment jsdom
/**
 * Tab "Lương" của Hồ sơ NV — canh rằng 4 ô cấu hình riêng + cờ HĐLĐ thứ 2 thực
 * sự hiện ra và nhập được. Trước P4.1 tab này không có test render nào; các ô
 * mới lại nằm dưới một Divider ở cuối form nên rất dễ hỏng mà không ai thấy.
 */
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

import { LuongTab } from "./LuongTab";
import type { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";
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

afterEach(() => {
  vi.restoreAllMocks();
});

const CAU_HINH_CHUNG = {
  congChuan: 24,
  thuViec: { tyLe: 0.85 },
  bhxh: { tyLe: 0.105, canCu: "MUC_KHAI_BAO" },
  khoanLuong: [],
} as unknown as CauHinhLuong;

function Wrapper({ over }: { over?: Partial<HoSoNhanVienFormValues> }) {
  const methods = useForm<HoSoNhanVienFormValues>({
    defaultValues: {
      luongThoaThuan: 0,
      phuCapCoDinh: 0,
      soNguoiPhuThuoc: 0,
      dongBH: false,
      thoiVu: false,
      camKet: false,
      hopDongThu2: false,
      ...over,
    } as HoSoNhanVienFormValues,
  });
  return (
    <FormProvider {...methods}>
      <LuongTab />
    </FormProvider>
  );
}

function moTab(over?: Partial<HoSoNhanVienFormValues>) {
  vi.spyOn(cauHinhLuongService, "get").mockResolvedValue(CAU_HINH_CHUNG);
  return render(<Wrapper over={over} />);
}

describe("Tab Lương — cấu hình riêng theo NV", () => {
  it("hiện đủ 4 ô cấu hình riêng và cờ HĐLĐ thứ 2", async () => {
    moTab();

    expect(await screen.findByText("Công chuẩn / tháng")).toBeTruthy();
    expect(screen.getByText("Tỷ lệ thử việc")).toBeTruthy();
    expect(screen.getByText("Tỷ lệ BHXH (NLĐ đóng)")).toBeTruthy();
    expect(screen.getByText("Căn cứ đóng BH")).toBeTruthy();
    expect(
      screen.getByText(/HĐLĐ thứ 2 \(công ty chỉ đóng 0,5% BHTNLĐ-BNN/)
    ).toBeTruthy();
  });

  it("placeholder nói rõ số chung đang áp dụng khi ô để trống", async () => {
    moTab();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("24 — theo cấu hình lương")).toBeTruthy();
      expect(screen.getByPlaceholderText("85 — theo cấu hình lương")).toBeTruthy();
      expect(
        screen.getByPlaceholderText("10.5 — theo cấu hình lương")
      ).toBeTruthy();
    });
  });

  it("gõ được số vào ô công chuẩn riêng", async () => {
    moTab();

    const o = await screen.findByPlaceholderText("24 — theo cấu hình lương");
    fireEvent.change(o, { target: { value: "26" } });

    expect((o as HTMLInputElement).value).toBe("26");
  });

  it("tải cấu hình lỗi → vẫn hiện đủ ô, placeholder lùi về nhãn chung", async () => {
    vi.spyOn(cauHinhLuongService, "get").mockRejectedValue(new Error("403"));
    render(<Wrapper />);

    expect(await screen.findByText("Công chuẩn / tháng")).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.getAllByPlaceholderText("Theo cấu hình lương").length
      ).toBeGreaterThan(0);
    });
  });

  it("nạp giá trị có sẵn của hồ sơ vào các ô", async () => {
    moTab({ orCongChuan: 26, orThuViecPhanTram: 90, hopDongThu2: true });

    expect(await screen.findByDisplayValue("26")).toBeTruthy();
    expect(screen.getByDisplayValue("90")).toBeTruthy();
  });
});
