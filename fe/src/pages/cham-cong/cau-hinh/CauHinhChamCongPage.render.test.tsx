// @vitest-environment jsdom
/**
 * Màn Cấu hình chấm công — kiểm tra tối thiểu rằng lịch làm việc trong tuần
 * tải từ service hiện đúng lên 7 ô ngày, và cảnh báo khi bỏ trống hoàn toàn.
 */
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// usePagePermission đọc quyền qua useAuth — mock để màn hiện đủ control sửa,
// thay vì dựng cả AuthProvider + token giả cho một test về nội dung màn.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { hoTen: "Trần Thị HR" },
    hasPermission: () => true,
  }),
}));

import CauHinhChamCongPage from "./CauHinhChamCongPage";
import { cauHinhChamCongService, CauHinhChamCong } from "@/services/cauHinhChamCongService";

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

const seedCauHinhT2DenT6: CauHinhChamCong = {
  id: "1",
  ngayLamViecTrongTuan: [1, 2, 3, 4, 5],
};

describe("Màn Cấu hình chấm công", () => {
  it("hiện 7 ô ngày và tích sẵn T2–T6 từ server", async () => {
    vi.spyOn(cauHinhChamCongService, "get").mockResolvedValue(seedCauHinhT2DenT6);
    render(<CauHinhChamCongPage />);

    // Dự án này KHÔNG cài @testing-library/jest-dom (không có setup file nào
    // mở rộng matcher) nên `toBeInTheDocument()` không tồn tại — đọc thẳng
    // kết quả truy vấn / thuộc tính DOM, đúng cách các test khác trong repo
    // đang làm (vd. ChamCongCuaToiPage.render.test.tsx).
    expect(await screen.findByText("Thứ 2")).toBeTruthy();
    expect(screen.getByText("Chủ nhật")).toBeTruthy();
    expect((screen.getByLabelText("Thứ 2") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Chủ nhật") as HTMLInputElement).checked).toBe(false);
  });

  it("cảnh báo khi không tích ngày nào", async () => {
    vi.spyOn(cauHinhChamCongService, "get").mockResolvedValue({
      id: "1",
      ngayLamViecTrongTuan: [],
    });
    render(<CauHinhChamCongPage />);

    expect(await screen.findByText("Chưa tích ngày nào")).toBeTruthy();
  });
});
