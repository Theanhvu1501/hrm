import type { DongLuong } from "@/services/bangLuongService";
import type { KhoanLuong } from "@/services/cauHinhLuongService";

/**
 * Dựng HTML phiếu lương để kế toán IN (khổ A5).
 *
 * Đọc `DongLuong` đã có sẵn trên màn Bảng lương, KHÔNG gọi route tự phục vụ —
 * route đó khoá phạm vi theo token của chính người đang đăng nhập, nên kế toán
 * gọi nó chỉ ra phiếu của chính mình.
 *
 * Chỉ đọc `thucTe`. `khaiBao`/`mucKhaiBao` không bao giờ được in ra: phiếu
 * này đưa tận tay người lao động và mức khai báo là chiến lược khai BHXH của
 * công ty (spec P4.3 §2.1).
 *
 * Bố cục theo MẪU PHIẾU LƯƠNG của chủ sản phẩm (sheet "PHIẾU LƯƠNG", yêu cầu
 * d36): khối định danh + ba phần I/II/III.
 *
 * `luongThoaThuan` CÓ in ở khối đầu (nhãn "Lương cơ bản") — khác với route tự
 * phục vụ. Lý do: đây là lương của CHÍNH người cầm tờ phiếu, họ đã ký trong
 * hợp đồng; thứ phải giấu là mức khai báo, không phải lương thật của họ.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function tien(v?: number): string {
  return (v ?? 0).toLocaleString("vi-VN");
}

const CSS = `
  body { font-family: "Times New Roman", serif; font-size: 13px; margin: 16px; }
  h1 { font-size: 16px; text-align: center; margin: 4px 0 2px; }
  .cty { text-align: center; font-size: 12px; }
  .meta { margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  td { padding: 3px 0; }
  td.so { text-align: right; font-variant-numeric: tabular-nums; }
  tr.nhom td { border-top: 1px solid #000; font-weight: bold; }
  tr.phan td { padding-top: 8px; font-weight: bold; text-transform: none; }
  table.dinh-danh { margin-top: 8px; }
  table.dinh-danh td:first-child { width: 45%; }
  .luu-y { margin-top: 8px; font-style: italic; font-size: 11px; }
  .ky { margin-top: 28px; display: flex; justify-content: space-around; text-align: center; }
`;

export function dungPhieuLuongHtml(
  dong: DongLuong,
  khoanLuong: KhoanLuong[],
  tenCongTy: string,
): string {
  const t: any = dong.thucTe ?? {};
  const theoMa = new Map((khoanLuong ?? []).map((k) => [k.ma, k]));

  const khoan = Object.entries(
    (t.giaTriTungKhoan ?? {}) as Record<string, number>,
  )
    .filter(([ma, soTien]) => {
      if (!soTien) return false;
      const k = theoMa.get(ma);
      // Khoản đã xoá khỏi danh mục vẫn in (nhãn = mã): xoá khỏi cấu hình không
      // được làm biến mất một dòng tiền đã trả, nếu không các khoản cộng lại
      // không ra tổng thu nhập trên tờ giấy người ta cầm.
      return k ? k.vaoTongThuNhap : true;
    })
    .map(([ma, soTien]) => ({ ten: theoMa.get(ma)?.ten ?? ma, soTien }));

  const [nam, thangSo] = (dong.thang ?? "").split("-");

  const dongKhoan = khoan
    .map(
      (k) =>
        `<tr><td>${escapeHtml(k.ten)}</td><td class="so">${tien(k.soTien)}</td></tr>`,
    )
    .join("");

  const dongTru = (
    [
      ["BHXH", t.bhxh],
      ["Thuế TNCN", t.thue],
      ["Phí công đoàn", t.phiCongDoan],
      ["Tạm ứng", dong.tamUng],
      ["Khấu trừ khác", dong.khauTruKhac],
    ] as Array<[string, number | undefined]>
  )
    .map(
      ([nhan, v]) =>
        `<tr><td>${escapeHtml(nhan)}</td><td class="so">${v ? "-" : ""}${tien(v)}</td></tr>`,
    )
    .join("");

  const congChuan = dong.cauHinhApDung?.congChuan ?? 0;

  return `<style>${CSS}</style>
<div class="cty">${escapeHtml(tenCongTy)}</div>
<h1>PHIẾU LƯƠNG</h1>
<div class="cty">${escapeHtml(`${thangSo}/${nam}`)}</div>
<table class="dinh-danh">
  <tr><td>Đối tượng</td><td><strong>${escapeHtml(dong.employeeName ?? "")}</strong> (${escapeHtml(dong.employeeCode ?? "")})</td></tr>
  <tr><td>Lương cơ bản</td><td class="so">${tien(dong.luongThoaThuan)}</td></tr>
  <tr><td>Ngày công chuẩn</td><td class="so">${congChuan}</td></tr>
</table>
<table>
  <tr class="phan"><td>I. Thông tin tiền lương</td><td class="so">${tien(t.tongThuNhap)}</td></tr>
  <tr><td>Công thực tế</td><td class="so">${dong.congThuong ?? 0}</td></tr>
  <tr><td>Công thử việc</td><td class="so">${dong.congThuViec ?? 0}</td></tr>
  <tr><td>Công khác (phép, lễ, nghỉ bù)</td><td class="so">${dong.congKhac ?? 0}</td></tr>
  ${dongKhoan}
  <tr class="nhom"><td>Tổng thu nhập</td><td class="so">${tien(t.tongThuNhap)}</td></tr>
  <tr class="phan"><td>II. Các khoản khấu trừ</td><td class="so"></td></tr>
  ${dongTru}
  <tr class="nhom"><td>III. TỔNG TIỀN LƯƠNG THỰC NHẬN</td><td class="so">${tien(t.thucLinh)}</td></tr>
</table>
<div class="luu-y">Lưu ý: Thử việc hưởng theo tỷ lệ quy định trên lương cơ bản và phụ cấp theo tiêu chuẩn.</div>
<div class="ky">
  <div>Người lập<br/><em>(ký, ghi rõ họ tên)</em></div>
  <div>Người nhận<br/><em>(ký, ghi rõ họ tên)</em></div>
</div>`;
}
