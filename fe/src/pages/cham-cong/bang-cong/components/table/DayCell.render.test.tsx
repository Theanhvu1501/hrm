// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { DayCell } from "./DayCell";

/**
 * Finding B (review wave 2): BE coi ô có ký hiệu nhưng THIẾU `nguon` là
 * `hr_sua` (dữ liệu trước P3.9 — xem `nguonCuaO()` ở cham-cong-ky-hieu.ts).
 * Trước bản vá này, DayCell so `nguon === "hr_sua"` trần nên mọi ô như vậy
 * vẽ y hệt ô `tu_dong` — không viền xanh, không nút "Trả về tự động" — hai
 * tầng kể hai câu chuyện ngược nhau về CÙNG một ô. Test này khoá đúng ba
 * tình huống nêu trong review: thiếu `nguon` (có ký hiệu), `nguon: 'tu_dong'`,
 * và ô rỗng hẳn (không ký hiệu).
 */

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

const KY_HIEU_OPTIONS = [{ kyHieu: "X", nhan: "Làm đủ ngày", soCong: 1, nhom: "lam_viec" as const }];

function moCell(props: Partial<React.ComponentProps<typeof DayCell>> = {}) {
  return render(
    <DayCell
      day={3}
      kyHieuOptions={KY_HIEU_OPTIONS}
      disabled={false}
      isWeekend={false}
      onChange={() => {}}
      {...props}
    />,
  );
}

/** Div hiển thị ký hiệu/ô trống — con trực tiếp bên trong Popover trigger. */
function timODiv(container: HTMLElement, noiDung: string) {
  return within(container).getByText(noiDung).closest("div") as HTMLDivElement;
}

// jsdom chuẩn hoá "#1677ff" (mã màu cellStyle.border của DayCell) thành
// dạng rgb() khi đọc lại qua style — so bằng dạng đã chuẩn hoá thay vì chuỗi
// hex gốc.
const VIEN_XANH = "1px solid rgb(22, 119, 255)";

describe("DayCell — nguồn ô quyết định viền + nút Trả về tự động", () => {
  it("thiếu nguon nhưng CÓ ký hiệu → coi là hr_sua: viền xanh + nút Trả về tự động", () => {
    const { container } = moCell({ kyHieu: "X", nguon: undefined });

    const o = timODiv(container, "X");
    expect(o.style.border).toBe(VIEN_XANH);

    fireEvent.click(o);
    expect(screen.getByText("Trả về tự động")).toBeTruthy();
  });

  it("nguon: 'tu_dong' → không viền xanh, không nút Trả về tự động", () => {
    const { container } = moCell({ kyHieu: "X", nguon: "tu_dong" });

    const o = timODiv(container, "X");
    expect(o.style.border).not.toBe(VIEN_XANH);

    fireEvent.click(o);
    expect(screen.queryByText("Trả về tự động")).toBeNull();
  });

  it("ô rỗng hẳn (không ký hiệu, không nguon) → không viền xanh, không nút Trả về tự động", () => {
    const { container } = moCell({ kyHieu: undefined, nguon: undefined });

    // Ô rỗng hiện dấu "·" thay vì ký hiệu.
    const o = timODiv(container, "·");
    expect(o.style.border).not.toBe(VIEN_XANH);

    fireEvent.click(o);
    expect(screen.queryByText("Trả về tự động")).toBeNull();
  });
});
