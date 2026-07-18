// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuickAddDoiTuongModal } from "../QuickAddDoiTuongModal";

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia = w.matchMedia || ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {},
    removeEventListener() {}, dispatchEvent() { return false; },
  }));
  w.ResizeObserver = w.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

describe("QuickAddDoiTuongModal", () => {
  it("không gọi onSubmit khi thiếu mã/tên", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<QuickAddDoiTuongModal open onClose={() => {}} defaultLoai={["KHACH_HANG"]} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Thêm/i }));
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });

  it("không gọi onSubmit khi loại trống (không có defaultLoai)", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<QuickAddDoiTuongModal open onClose={() => {}} defaultLoai={[]} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText(/VD: KH001/i), { target: { value: "KH009" } });
    fireEvent.change(screen.getByPlaceholderText(/Tên đối tượng/i), { target: { value: "Cty Z" } });
    fireEvent.click(screen.getByRole("button", { name: /Thêm/i }));
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });

  it("gọi onSubmit với loai pre-fill + ma + ten", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<QuickAddDoiTuongModal open onClose={() => {}} defaultLoai={["KHACH_HANG"]} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText(/VD: KH001/i), { target: { value: "KH009" } });
    fireEvent.change(screen.getByPlaceholderText(/Tên đối tượng/i), { target: { value: "Cty Z" } });
    fireEvent.click(screen.getByRole("button", { name: /Thêm/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ loai: ["KHACH_HANG"], ma: "KH009", ten: "Cty Z" })
    );
  });
});
