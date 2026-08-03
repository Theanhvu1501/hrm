// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { buildPrintableDocument, printHopDong } from "../printHopDong";

describe("buildPrintableDocument", () => {
  it("bọc HTML đã ghép dữ liệu thành 1 document hoàn chỉnh có tiêu đề mặc định", () => {
    const out = buildPrintableDocument("<p>Nội dung</p>");
    expect(out).toContain("<!DOCTYPE html>");
    expect(out).toContain("<title>Hợp đồng lao động</title>");
    expect(out).toContain("<p>Nội dung</p>");
  });

  it("cho phép truyền tiêu đề riêng (vd theo số hợp đồng)", () => {
    const out = buildPrintableDocument("<p>x</p>", "HD0001");
    expect(out).toContain("<title>HD0001</title>");
  });

  it("escape tiêu đề trước khi chèn vào <title> (review Minor: title nội suy chưa escape)", () => {
    const out = buildPrintableDocument("<p>x</p>", "</title><script>alert(1)</script>");
    expect(out).not.toContain("<script>alert(1)</script>");
    expect(out).toContain("&lt;script&gt;");
  });
});

describe("printHopDong — iframe in phải được sandbox (review Critical 1 + High)", () => {
  afterEach(() => {
    // Dọn iframe test tạo ra + trả lại timer thật — KHÔNG advance timer giả
    // (setTimeout(trigger, 400) gọi win.focus()/win.print(), jsdom không cài
    // đặt 2 API đó nên sẽ ném "Not implemented"; test này chỉ cần xác nhận
    // thuộc tính sandbox lúc TẠO iframe, không cần chạy tới bước in thật).
    document.querySelectorAll("iframe").forEach((el) => el.remove());
    vi.useRealTimers();
  });

  /**
   * QUAN TRỌNG — giới hạn của test này (review High đã chỉ đúng chỗ hổng):
   * jsdom KHÔNG triển khai enforcement thật của thuộc tính `sandbox` (không
   * chặn script, không áp "sandboxed modals flag" chi phối `window.print()`)
   * — nên test dưới đây CHỈ xác nhận CHUỖI thuộc tính được set đúng trên
   * iframe, KHÔNG chứng minh hành vi trình duyệt thật (script có bị chặn
   * không, print() có bị nuốt âm thầm không). Bằng chứng hành vi trình
   * duyệt THẬT nằm ở Playwright + Chromium thật, chạy tay, không phải Vitest
   * — xem báo cáo: "Ignored call to 'print()'" biến mất sau khi thêm
   * `allow-modals`; ngược lại thiếu `allow-modals` thì cảnh báo đó xuất
   * hiện, xác nhận đúng bug review nêu.
   */
  it("iframe tạo ra có thuộc tính sandbox=allow-same-origin allow-modals (KHÔNG allow-scripts)", () => {
    vi.useFakeTimers();
    printHopDong("<p>test</p>", "HD0001");

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("sandbox")).toBe("allow-same-origin allow-modals");
    // allow-modals BẮT BUỘC để window.print() thật sự chạy (review High) —
    // thiếu token này Chrome âm thầm bỏ qua lệnh in, không báo lỗi JS nào.
    expect(iframe?.getAttribute("sandbox")).toContain("allow-modals");
    // Cụ thể: KHÔNG được chứa allow-scripts — đó là điều làm sandbox có tác dụng.
    expect(iframe?.getAttribute("sandbox")).not.toContain("allow-scripts");
  });
});
