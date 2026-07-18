// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SelectWithQuickAdd } from "../SelectWithQuickAdd";

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia = w.matchMedia || ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {},
    removeEventListener() {}, dispatchEvent() { return false; },
  }));
  w.ResizeObserver = w.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
});

const options = [{ value: "a", label: "A" }];

describe("SelectWithQuickAdd", () => {
  it("hiện nút '+ Thêm nhanh' trong dropdown và gọi onQuickAdd khi bấm", () => {
    const onQuickAdd = vi.fn();
    render(
      <SelectWithQuickAdd
        open
        options={options}
        quickAddLabel="đối tượng"
        onQuickAdd={onQuickAdd}
      />
    );
    const btn = screen.getByText(/Thêm nhanh đối tượng/i);
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onQuickAdd).toHaveBeenCalledTimes(1);
  });

  it("ẩn nút khi quickAddDisabled", () => {
    render(
      <SelectWithQuickAdd
        open
        options={options}
        quickAddLabel="đối tượng"
        onQuickAdd={() => {}}
        quickAddDisabled
      />
    );
    expect(screen.queryByText(/Thêm nhanh/i)).toBeNull();
  });
});
