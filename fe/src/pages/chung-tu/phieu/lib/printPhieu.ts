import dayjs from "dayjs";
import { ChungTu } from "@/types";
import { formatCurrency } from "./format";
import { docTienBangChu } from "./docTienBangChu";

export interface CongTyInfo {
  tenCongTy?: string;
  diaChiCongTy?: string;
}

/** Thay các token {{...}} trong template HTML bằng dữ liệu của phiếu. */
export function buildPhieuHtml(
  phieu: ChungTu,
  template: string,
  congTy?: CongTyInfo
): string {
  const ngay = phieu.ngay ? dayjs(phieu.ngay) : null;
  const values: Record<string, string> = {
    soPhieu: phieu.soPhieu ?? "",
    ngay: ngay ? ngay.format("DD") : "",
    thang: ngay ? ngay.format("MM") : "",
    nam: ngay ? ngay.format("YYYY") : "",
    nguoiGiaoDich: phieu.nguoiGiaoDich ?? "",
    diaChi: phieu.diaChi ?? "",
    noiDung: phieu.noiDung ?? "",
    soTien: formatCurrency(phieu.soTien),
    soTienBangChu: docTienBangChu(phieu.soTien),
    taiKhoanNo: phieu.danhMuc?.taiKhoanNo?.ma ?? "",
    taiKhoanCo: phieu.danhMuc?.taiKhoanCo?.ma ?? "",
    ghiChu: phieu.ghiChu ?? "",
    tenCongTy: congTy?.tenCongTy ?? "",
    diaChiCongTy: congTy?.diaChiCongTy ?? "",
  };

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
    key in values ? values[key] : ""
  );
}

/** Mở iframe ẩn, nạp HTML phiếu rồi gọi in (trình duyệt cho In hoặc Lưu PDF). */
export function printPhieu(
  phieu: ChungTu,
  template: string,
  congTy?: CongTyInfo
): void {
  const html = buildPhieuHtml(phieu, template, congTy);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  // Ép khổ A5 ngang cho phiếu thu/chi — đặt SAU nội dung để @page này thắng cascade,
  // áp dụng cả mẫu mặc định lẫn mẫu tuỳ chỉnh tenant đã lưu (vốn để A5 portrait).
  const forcePageStyle = `<style>@page { size: A5 landscape; margin: 12mm; }</style>`;
  doc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${phieu.soPhieu ?? "Phiếu"}</title></head><body>${html}${forcePageStyle}</body></html>`
  );
  doc.close();

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
    // Để trình duyệt vẽ xong hộp thoại in trước khi gỡ iframe.
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  };

  // Chờ tài nguyên (font) tải xong; fallback nếu onload không bắn.
  win.onload = trigger;
  setTimeout(trigger, 400);
}
