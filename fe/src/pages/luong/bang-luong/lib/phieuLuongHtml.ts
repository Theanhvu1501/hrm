import type { DongLuong } from "@/services/bangLuongService";
import type { KhoanLuong } from "@/services/cauHinhLuongService";

/**
 * Dựng HTML phiếu lương để kế toán IN (khổ A5).
 *
 * Đọc `DongLuong` đã có sẵn trên màn Bảng lương, KHÔNG gọi route tự phục vụ —
 * route đó khoá phạm vi theo token của chính người đang đăng nhập, nên kế toán
 * gọi nó chỉ ra phiếu của chính mình.
 *
 * Chỉ đọc `thucTe`. `khaiBao`/`mucKhaiBao`/`luongThoaThuan` không bao giờ được
 * in ra: phiếu này đưa tận tay người lao động (spec P4.3 §2.1).
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

  return `<style>${CSS}</style>
<div class="cty">${escapeHtml(tenCongTy)}</div>
<h1>PHIẾU LƯƠNG</h1>
<div class="cty">${escapeHtml(`${thangSo}/${nam}`)}</div>
<div class="meta">
  Họ và tên: <strong>${escapeHtml(dong.employeeName ?? "")}</strong>
  &nbsp;·&nbsp; Mã NV: ${escapeHtml(dong.employeeCode ?? "")}
  &nbsp;·&nbsp; Công: ${dong.congThuong ?? 0}
</div>
<table>
  ${dongKhoan}
  <tr class="nhom"><td>Tổng thu nhập</td><td class="so">${tien(t.tongThuNhap)}</td></tr>
  ${dongTru}
  <tr class="nhom"><td>THỰC LĨNH</td><td class="so">${tien(t.thucLinh)}</td></tr>
</table>
<div class="ky">
  <div>Người lập<br/><em>(ký, ghi rõ họ tên)</em></div>
  <div>Người nhận<br/><em>(ký, ghi rõ họ tên)</em></div>
</div>`;
}
