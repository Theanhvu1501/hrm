import * as XLSX from "xlsx";

/**
 * Xuất một hợp đồng đã render ra file `.xlsx`.
 *
 * Hợp đồng là văn xuôi, nên Excel không phải định dạng tự nhiên của nó —
 * điều này không giấu được và cũng không nên giấu: mỗi đoạn văn thành một
 * dòng ở cột A, còn `<table>` trong mẫu giữ nguyên thành lưới ô. Mẫu nào
 * thực sự cần Excel thì soạn bằng `<table>` sẽ ra đúng bố cục; mẫu văn xuôi
 * xuất ra vẫn đọc được nhưng chỉ là các dòng chữ.
 *
 * Dùng `xlsx` — đã là dependency sẵn, cùng đường với các bản xuất bên bảng
 * lương (`utils/exportExcel.ts`). Không thêm thư viện thứ hai cho cùng việc.
 */

/** Số cột tối đa cân nhắc khi đặt bề rộng — bảng hợp đồng không rộng hơn thế. */
const SO_COT_TOI_DA = 12;

/** Bề rộng cột A khi văn bản là văn xuôi (đơn vị ký tự của Excel). */
const RONG_COT_VAN_XUOI = 100;

const RONG_COT_BANG = 28;

function docNoiDung(el: Element): string {
  // `textContent` gộp cả chữ trong thẻ con — đúng thứ cần, vì <b>/<i> bên
  // trong một đoạn không được tách thành ô riêng.
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * HTML đã render → lưới ô (mảng các dòng).
 *
 * Tách khỏi phần ghi file để test được bằng chuỗi, không cần tải thư viện
 * Excel hay chạm vào DOM download.
 */
export function hopDongSangLuoi(html: string): string[][] {
  const doc = new DOMParser().parseFromString(html ?? "", "text/html");

  // Nội dung <script>/<style> cũng nằm trong textContent — không gỡ ra thì
  // mã nguồn CSS đổ thẳng vào ô Excel.
  doc.querySelectorAll("script, style").forEach((el) => el.remove());

  const luoi: string[][] = [];

  // Duyệt theo thứ tự tài liệu để văn xuôi và bảng giữ đúng thứ tự xuất
  // hiện. Chỉ nhận khối lá: một <div> bọc cả trang mà cũng được tính thì
  // toàn bộ hợp đồng dồn vào một ô.
  const KHOI = "p, h1, h2, h3, h4, h5, h6, li, tr";
  doc.body.querySelectorAll(KHOI).forEach((el) => {
    if (el.tagName === "TR") {
      const o = Array.from(el.querySelectorAll("th, td")).map(docNoiDung);
      if (o.some((x) => x !== "")) luoi.push(o);
      return;
    }
    // Đoạn nằm TRONG bảng đã được dòng <tr> phía trên gom rồi — tính lại là
    // nhân đôi nội dung.
    if (el.closest("table")) return;

    const chu = docNoiDung(el);
    if (chu) luoi.push([chu]);
  });

  return luoi;
}

function beRongCot(luoi: string[][]): Array<{ wch: number }> {
  const soCot = Math.min(
    SO_COT_TOI_DA,
    luoi.reduce((max, dong) => Math.max(max, dong.length), 1),
  );
  if (soCot === 1) return [{ wch: RONG_COT_VAN_XUOI }];
  return Array.from({ length: soCot }, () => ({ wch: RONG_COT_BANG }));
}

export function xuatHopDongRaExcel(html: string, tenFile: string): void {
  const luoi = hopDongSangLuoi(html);
  const ws = XLSX.utils.aoa_to_sheet(luoi);

  ws["!cols"] = beRongCot(luoi);

  const wb = XLSX.utils.book_new();
  // Tên sheet Excel tối đa 31 ký tự và cấm : \ / ? * [ ] — dùng tên cố định
  // cho chắc, tên hợp đồng đã nằm ở tên file.
  XLSX.utils.book_append_sheet(wb, ws, "Hop dong");
  XLSX.writeFile(wb, tenFile.endsWith(".xlsx") ? tenFile : `${tenFile}.xlsx`);
}
