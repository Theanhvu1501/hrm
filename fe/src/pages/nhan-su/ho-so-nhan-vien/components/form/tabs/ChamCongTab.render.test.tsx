// @vitest-environment jsdom
/**
 * Tab "Chấm công" của Hồ sơ NV — canh chú thích dưới ô "Ngày làm việc trong
 * tuần". Dòng cũ (trước P4.5) nói "bỏ trống = không coi ngày nào là ngày
 * nghỉ" — sai kể từ khi có lịch tuần mức công ty: bỏ trống nghĩa là ÁP DỤNG
 * lịch chung đọc từ `cauHinhChamCongService`. Test này canh rằng chú thích
 * nêu đúng, đọc lịch thật từ server (không hard-code "T2–T6"), và không vỡ
 * trang khi API cấu hình lỗi.
 */
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";

import { ChamCongTab } from "./ChamCongTab";
import type { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";
import { workShiftService } from "@/services/workShiftService";
import { nguoiDungService } from "@/services/nguoiDungService";
import { cauHinhChamCongService } from "@/services/cauHinhChamCongService";

afterEach(() => {
  vi.restoreAllMocks();
});

function Wrapper() {
  const methods = useForm<HoSoNhanVienFormValues>({
    defaultValues: {} as HoSoNhanVienFormValues,
  });
  return (
    <FormProvider {...methods}>
      <ChamCongTab />
    </FormProvider>
  );
}

function renderChamCongTab() {
  vi.spyOn(workShiftService, "getList").mockResolvedValue([]);
  vi.spyOn(nguoiDungService, "getAll").mockResolvedValue({
    data: [],
    total: 0,
    page: 1,
    limit: 500,
    totalPages: 0,
  });
  return render(<Wrapper />);
}

describe("Tab Chấm công — chú thích lịch tuần", () => {
  it("chú thích lịch tuần nêu đúng lịch chung công ty đọc từ server", async () => {
    vi.spyOn(cauHinhChamCongService, "get").mockResolvedValue({
      ngayLamViecTrongTuan: [1, 2, 3, 4, 5],
    });
    renderChamCongTab();

    expect(
      await screen.findByText(/theo lịch chung của công ty \(T2, T3, T4, T5, T6\)/)
    ).toBeTruthy();
  });

  it("xếp CN ở cuối câu, không theo thứ tự số 0", async () => {
    vi.spyOn(cauHinhChamCongService, "get").mockResolvedValue({
      ngayLamViecTrongTuan: [0, 1, 2, 3, 4, 5, 6],
    });
    renderChamCongTab();

    expect(
      await screen.findByText(/\(T2, T3, T4, T5, T6, T7, CN\)/)
    ).toBeTruthy();
  });

  it("API cấu hình lỗi → không ném lỗi, câu vẫn hiện mà không có phần trong ngoặc", async () => {
    vi.spyOn(cauHinhChamCongService, "get").mockRejectedValue(new Error("500"));
    renderChamCongTab();

    expect(
      await screen.findByText("Ngày làm việc trong tuần")
    ).toBeTruthy();

    await waitFor(() => {
      expect(
        screen.getByText(
          (_, node) =>
            node?.textContent === "Bỏ trống = theo lịch chung của công ty. Chỉ khai ở đây khi người này làm khác lịch chung."
        )
      ).toBeTruthy();
    });
  });
});
