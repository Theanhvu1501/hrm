/**
 * In hợp đồng lao động.
 *
 * Cơ chế in (iframe ẩn + sandbox) nằm ở `@/utils/printHtml` — dùng chung với
 * phiếu lương. KHÔNG chép lại: hiểu biết tinh tế nhất của nó nằm ở
 * `sandbox="allow-same-origin allow-modals"`, mà thiếu `allow-modals` thì
 * Chrome ÂM THẦM nuốt `window.print()` (không lỗi gì lên JS, người dùng bấm In
 * mà không có gì xảy ra). Kiến thức đó tồn tại hai bản là chuyện sớm muộn một
 * bản bị sửa sai.
 *
 * `html` đã qua `sanitizeHopDongHtml` (parser HTML thật) ở BE trước khi tới
 * đây, và iframe vẫn được sandbox không `allow-scripts` — không tin tưởng mù
 * quáng một lớp sanitize duy nhất.
 */
import {
  buildPrintableDocument as bocDocument,
  printHtml,
} from "@/utils/printHtml";

/**
 * Giữ NGUYÊN tiêu đề mặc định "Hợp đồng lao động" — util dùng chung mặc định
 * "In" vì nó không biết đang in gì. Re-export thẳng util sẽ âm thầm đổi tiêu
 * đề tab in của hợp đồng.
 */
export function buildPrintableDocument(
  html: string,
  title = "Hợp đồng lao động",
): string {
  return bocDocument(html, title);
}

export function printHopDong(html: string, title = "Hợp đồng lao động"): void {
  printHtml(html, title);
}
