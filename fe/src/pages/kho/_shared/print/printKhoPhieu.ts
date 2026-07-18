import dayjs from 'dayjs';
import type { PhieuKho } from '@/types';
import { docTienBangChu } from '@/pages/chung-tu/phieu/lib/docTienBangChu';
import { buildChiTietTable, type CongTyInfo } from './khoPrintTemplates';

/** Thay token {{...}} trong template HTML bằng dữ liệu phiếu kho. */
export function buildKhoPhieuHtml(
  phieu: PhieuKho,
  template: string,
  congTy?: CongTyInfo,
): string {
  const d = phieu.ngayHachToan || phieu.ngayChungTu;
  const dj = d ? dayjs(d) : dayjs();
  const tongTien =
    phieu.tongTien ?? (phieu.chiTiet || []).reduce((s, ct) => s + (ct.thanhTien || 0), 0);

  const values: Record<string, string> = {
    tenCongTy: congTy?.tenCongTy ?? '',
    diaChiCongTy: congTy?.diaChiCongTy ?? '',
    soPhieu: phieu.soPhieu ?? '',
    ngay: dj.format('DD'),
    thang: dj.format('MM'),
    nam: dj.format('YYYY'),
    tkNo: phieu.chiTiet?.[0]?.tkNo ?? '',
    tkCo: phieu.chiTiet?.[0]?.tkCo ?? '',
    nguoiGiaoNhan: phieu.nguoiGiaoNhan || phieu.doiTuongTen || '',
    dienGiai: phieu.dienGiai ?? '',
    soChungTuGoc: phieu.soChungTuGoc ?? '',
    khoTen: phieu.khoTen || phieu.khoMa || '',
    khoXuatTen: phieu.khoXuatTen || phieu.khoXuatMa || '',
    khoNhapTen: phieu.khoNhapTen || phieu.khoNhapMa || '',
    lenhDieuDong: phieu.lenhDieuDong ?? '',
    veViec: phieu.veViec ?? '',
    nguoiVanChuyen: phieu.nguoiVanChuyen ?? '',
    hopDongVC: phieu.hopDongVC ?? '',
    phuongTienVC: phieu.phuongTienVC ?? '',
    tongTienBangChu: docTienBangChu(tongTien),
    // Bảng chi tiết là HTML do hệ thống dựng — không escape.
    chiTietTable: buildChiTietTable(phieu),
  };

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
    key in values ? values[key] : '',
  );
}

/** Dựng HTML từ template (đã lưu hoặc mặc định) rồi in qua iframe ẩn.
 *  Sao chép cơ chế iframe từ printPhieu.ts (onload + setTimeout fallback + cleanup).
 */
export function printKhoPhieu(phieu: PhieuKho, template: string, congTy?: CongTyInfo): void {
  const html = buildKhoPhieuHtml(phieu, template, congTy);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
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
