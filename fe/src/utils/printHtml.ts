/**
 * In một đoạn HTML — HTML đã được BE ghép đủ dữ liệu (xem
 * `hopDongTemplateService.render`), FE chỉ còn việc bọc thành 1 document đầy
 * đủ rồi đẩy vào iframe ẩn để gọi lệnh in trình duyệt (In hoặc Lưu PDF).
 *
 * Khác với mẫu phiếu thu/chi bên kế toán (FE tự ghép token bằng
 * `buildPhieuHtml`), hợp đồng lao động ghép ở BE (`renderHopDong` trong
 * `hop-dong.service.ts`) vì cần dữ liệu từ nhiều nguồn (hợp đồng + nhân viên
 * + thông tin công ty) — FE ở đây chỉ còn khâu hiển thị/in, không lặp lại
 * logic ghép token.
 *
 * `html` đã qua `sanitizeHopDongHtml` (parser HTML thật) ở BE trước khi tới
 * đây — NHƯNG iframe này vẫn được sandbox (review Critical 1: "add sandbox
 * to the preview iframe"), không tin tưởng mù quáng 1 lớp sanitize duy nhất.
 * `sandbox="allow-same-origin allow-modals"` (KHÔNG có `allow-scripts`) chặn
 * TUYỆT ĐỐI mọi script, thuộc tính on-nào-đó, và scheme javascript: chạy
 * được bên trong iframe này ở tầng trình duyệt — kể cả nếu có payload nào
 * đó lọt qua sanitize-html trong tương lai — trong khi vẫn giữ được:
 *  - `allow-same-origin`: để parent (trang này) còn gọi được
 *    `iframeDoc.write()`/`win.print()` (thiếu token này thì iframe có origin
 *    "null" đối lập, parent bị chặn truy cập contentDocument).
 *  - `allow-modals`: BẮT BUỘC để `window.print()` thật sự mở hộp thoại in.
 *    Review vòng 2 (High) phát hiện: HTML Standard xếp `window.print()` cùng
 *    nhóm với `alert`/`confirm`/`prompt`, gác bằng "sandboxed modals flag" —
 *    có `sandbox` mà THIẾU `allow-modals` thì Chrome ÂM THẦM bỏ qua lệnh in
 *    ("Ignored call to 'print()'..."), không báo lỗi gì lên JS, người dùng
 *    bấm "In" mà không có gì xảy ra. Bản trước bản vá này chỉ có
 *    `allow-same-origin` — tính năng in KHÔNG HOẠT ĐỘNG. `allow-modals`
 *    KHÔNG mở thêm lỗ hổng script nào (không phải allow-scripts).
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Bọc đoạn HTML (đã ghép dữ liệu) thành 1 document HTML hoàn chỉnh, có tiêu đề. */
export function buildPrintableDocument(html: string, title = "In"): string {
  // `title` hiện tại luôn do BE sinh ra (contractNo) nên rủi ro thấp, nhưng
  // escape vẫn rẻ và đúng nguyên tắc "không nội suy chuỗi chưa escape vào HTML".
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${html}</body></html>`;
}

/** Mở iframe ẩn (đã sandbox), nạp HTML rồi gọi in (trình duyệt cho In hoặc Lưu PDF). */
export function printHtml(html: string, title?: string): void {
  const doc = buildPrintableDocument(html, title);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("sandbox", "allow-same-origin allow-modals");
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(doc);
  iframeDoc.close();

  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return;
  }

  let done = false;
  const trigger = () => {
    if (done) return;
    done = true;
    win.focus();
    win.print();
    // Chờ trình duyệt vẽ xong hộp thoại in rồi mới gỡ iframe.
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  };

  win.onload = trigger;
  setTimeout(trigger, 400);
}
