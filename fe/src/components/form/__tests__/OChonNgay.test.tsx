// @vitest-environment jsdom
/**
 * Khoá hợp đồng dữ liệu của OChonNgay: nhận/trả đúng chuỗi `YYYY-MM-DD` như ô
 * `<input type="date">` cũ (xoá trắng trả `''`), chỉ đổi cách HIỂN THỊ sang
 * DD/MM/YYYY. Các hàm convert sang DTO của form dựa vào đúng hợp đồng này nên
 * không phải sửa khi đổi ô — lệch một chút (vd trả `null` hay Dayjs) là hỏng
 * lặng lẽ ở payload gửi BE.
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { OChonNgay } from "../OChonNgay";

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
  // rc-picker đo vị trí popup bằng ResizeObserver — jsdom không có.
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

const oNhap = (container: HTMLElement) =>
  container.querySelector(".ant-picker input") as HTMLInputElement;

describe("OChonNgay", () => {
  it("value '2026-09-10' hiện thành 10/09/2026", () => {
    const { container } = render(<OChonNgay value="2026-09-10" />);
    expect(oNhap(container).value).toBe("10/09/2026");
  });

  it("value '' hiện trống", () => {
    const { container } = render(<OChonNgay value="" />);
    expect(oNhap(container).value).toBe("");
  });

  it("gõ DD/MM/YYYY rồi Enter trả chuỗi YYYY-MM-DD", () => {
    const onChange = vi.fn();
    const { container } = render(<OChonNgay value="" onChange={onChange} />);
    const input = oNhap(container);
    fireEvent.mouseDown(input);
    fireEvent.change(input, { target: { value: "05/01/2027" } });
    fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
    expect(onChange).toHaveBeenLastCalledWith("2027-01-05");
  });

  it("xoá trắng gọi onChange('')", () => {
    const onChange = vi.fn();
    const { container } = render(
      <OChonNgay value="2026-09-10" onChange={onChange} />
    );
    const nutXoa = container.querySelector(".ant-picker-clear") as HTMLElement;
    expect(nutXoa).toBeTruthy();
    fireEvent.mouseDown(nutXoa);
    fireEvent.mouseUp(nutXoa);
    fireEvent.click(nutXoa);
    expect(onChange).toHaveBeenCalledWith("");
  });
});
