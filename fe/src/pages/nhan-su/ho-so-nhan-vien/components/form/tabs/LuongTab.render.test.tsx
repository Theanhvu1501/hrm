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
  mucKhaiBaoMacDinh: 5_500_000,
  congChuan: 24,
  thuViec: { tyLe: 0.85 },
  bhxh: { tyLe: 0.105, canCu: "MUC_KHAI_BAO" },
  bhCongTy: { tyLe: 0.215, tyLeHopDongThu2: 0.005 },
  quyTacThoiVu: { tyLe: 0.1, nguong: 2_000_000 },
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

describe("Tab Lương — bố cục 3 nhóm", () => {
  it("chia đúng 3 nhóm", async () => {
    moTab();

    expect(await screen.findByText("Thu nhập")).toBeTruthy();
    expect(screen.getByText("Hợp đồng & bảo hiểm")).toBeTruthy();
    expect(screen.getByText("Cấu hình riêng")).toBeTruthy();
  });

  it("hiện đủ 4 ô cấu hình riêng và cờ HĐLĐ thứ 2", async () => {
    moTab();

    expect(await screen.findByText("Công chuẩn (ngày/tháng)")).toBeTruthy();
    expect(screen.getByText("Tỷ lệ hưởng khi thử việc")).toBeTruthy();
    expect(screen.getByText("Tỷ lệ bảo hiểm nhân viên đóng")).toBeTruthy();
    expect(screen.getByText("Căn cứ đóng bảo hiểm")).toBeTruthy();
    expect(screen.getByText("Hợp đồng lao động thứ 2")).toBeTruthy();
  });

  it("placeholder nói rõ số chung đang áp dụng khi ô để trống", async () => {
    moTab();

    await waitFor(() => {
      expect(screen.getByPlaceholderText("24 — theo cấu hình lương")).toBeTruthy();
      expect(screen.getByPlaceholderText("85% — theo cấu hình lương")).toBeTruthy();
      expect(
        screen.getByPlaceholderText("10.5% — theo cấu hình lương")
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

    expect(await screen.findByText("Công chuẩn (ngày/tháng)")).toBeTruthy();
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

describe("Tab Lương — khối Kết quả áp dụng", () => {
  it("mặc định: lũy tiến có giảm trừ, không đóng bảo hiểm", async () => {
    moTab();

    expect(await screen.findByText("Kết quả áp dụng")).toBeTruthy();
    expect(
      screen.getByText(/Thuế lũy tiến, có giảm trừ bản thân/)
    ).toBeTruthy();
    expect(screen.getByText("Không đóng bảo hiểm ở công ty này.")).toBeTruthy();
  });

  it("tick HĐLĐ thứ 2 → câu chữ đổi ngay, nêu đúng tỷ lệ từ cấu hình", async () => {
    moTab();

    fireEvent.click(await screen.findByText("Hợp đồng lao động thứ 2"));

    await waitFor(() => {
      expect(
        screen.getByText(/không giảm trừ gia cảnh — đã đăng ký ở công ty thứ nhất/)
      ).toBeTruthy();
      expect(screen.getByText(/công ty đóng 0,5%/)).toBeTruthy();
    });
  });

  it("tick Đóng bảo hiểm → nêu cả phần nhân viên và phần công ty", async () => {
    moTab();

    fireEvent.click(await screen.findByText("Đóng bảo hiểm"));

    await waitFor(() => {
      expect(
        screen.getByText(/Trừ 10,5% lương nhân viên; công ty đóng thêm 21,5%/)
      ).toBeTruthy();
    });
  });
});
