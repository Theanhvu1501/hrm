// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuickAddSanPhamModal } from "../QuickAddSanPhamModal";

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia = w.matchMedia || ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {},
    removeEventListener() {}, dispatchEvent() { return false; },
  }));
  w.ResizeObserver = w.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

describe("QuickAddSanPhamModal", () => {
  it("không gọi onSubmit khi thiếu mã/tên", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<QuickAddSanPhamModal open onClose={() => {}} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Thêm/i }));
    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
  });

  it("gọi onSubmit với mã + tên khi hợp lệ", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<QuickAddSanPhamModal open onClose={() => {}} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText(/VD: SP001/i), { target: { value: "VT009" } });
    fireEvent.change(screen.getByPlaceholderText(/Xi măng/i), { target: { value: "Cát vàng" } });
    fireEvent.click(screen.getByRole("button", { name: /Thêm/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ ma: "VT009", ten: "Cát vàng" }))
    );
  });
});
