/**
 * In hợp đồng lao động — HTML đã được BE ghép đủ dữ liệu (xem
 * `hopDongTemplateService.render`), FE chỉ còn việc bọc thành 1 document đầy
 * đủ rồi đẩy vào iframe ẩn để gọi lệnh in trình duyệt (In hoặc Lưu PDF).
 *
 * Khác với mẫu phiếu thu/chi bên kế toán (FE tự ghép token bằng
 * `buildPhieuHtml`), hợp đồng lao động ghép ở BE (`renderHopDong` trong
 * `hop-dong.service.ts`) vì cần dữ liệu từ nhiều nguồn (hợp đồng + nhân viên
 * + thông tin công ty) — FE ở đây chỉ còn khâu hiển thị/in, không lặp lại
 * logic ghép token.
 */

/** Bọc đoạn HTML (đã ghép dữ liệu) thành 1 document HTML hoàn chỉnh, có tiêu đề. */
export function buildPrintableDocument(html: string, title = "Hợp đồng lao động"): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${html}</body></html>`;
}

/** Mở iframe ẩn, nạp HTML hợp đồng rồi gọi in (trình duyệt cho In hoặc Lưu PDF). */
export function printHopDong(html: string, title?: string): void {
  const doc = buildPrintableDocument(html, title);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
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
