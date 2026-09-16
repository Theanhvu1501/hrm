import { TRUSTED_PRINT_CSS } from '../../hop-dong/lib/hopDongRender';

/**
 * In PHỤ LỤC HỢP ĐỒNG LAO ĐỘNG từ một bản ghi Quá trình công tác
 * (yêu cầu d13: "Sau khi ghi nhận thay đổi: cần có file tại Phụ lục hợp đồng
 * với những nội dung thay đổi đó").
 *
 * Hàm THUẦN — không TypeORM, không NestJS — để test được mà không cần DB, và
 * để bảng "nội dung thay đổi" (phần dễ sai nhất) có bài test riêng.
 *
 * Chỉ in NHỮNG GÌ THỰC SỰ ĐỔI: phụ lục liệt kê cả những dòng không đổi thì
 * người ký phải tự dò xem điều khoản nào mới, và đó chính là chỗ người ta ký
 * nhầm.
 */

export interface PhuLucThayDoi {
  soQuyetDinh?: string;
  ngayHieuLuc?: string;
  loaiThayDoi?: string;
  lyDo?: string;
  phongBanCu?: string;
  phongBanMoi?: string;
  chucDanhCu?: string;
  chucDanhMoi?: string;
  mucLuongCu?: number;
  mucLuongMoi?: number;
  phuCapCu?: Record<string, number>;
  phuCapMoi?: Record<string, number>;
}

export interface PhuLucNhanVien {
  hoTen?: string;
  ngaySinh?: string;
  cccd?: string;
  ngayCapCccd?: string;
  noiCapCccd?: string;
  diaChi?: string;
}

export interface PhuLucCongTy {
  tenCongTy?: string | null;
  diaChiCongTy?: string | null;
  maSoThue?: string | null;
  nguoiDaiDien?: string | null;
  chucVuNguoiDaiDien?: string | null;
  thanhPhoKy?: string | null;
}

export interface PhuLucInput {
  thayDoi: PhuLucThayDoi;
  nhanVien: PhuLucNhanVien;
  congTy: PhuLucCongTy;
  /** Nhãn hiển thị của từng khoản lương, khoá theo `ma` — để in "Phụ cấp chức vụ" thay vì "PC_CHUC_VU". */
  tenKhoan?: Record<string, string>;
}

export interface DongThayDoi {
  chiTieu: string;
  cu: string;
  moi: string;
}

const LOAI_THAY_DOI_LABEL: Record<string, string> = {
  dieu_chuyen: 'Điều chuyển công tác',
  tang_luong: 'Điều chỉnh lương',
  bo_nhiem: 'Bổ nhiệm',
  thoi_viec: 'Chấm dứt hợp đồng',
  khac: 'Thay đổi khác',
  doi_trang_thai: 'Đổi trạng thái',
  danh_gia: 'Đánh giá',
};

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ngay(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function tien(v?: number): string {
  return typeof v === 'number' ? `${v.toLocaleString('vi-VN')} đồng` : '';
}

/**
 * Các dòng "chỉ tiêu — trước — sau". Xuất riêng để test: đây là phần dễ sai
 * nhất của phụ lục (in nhầm một dòng không đổi, hoặc bỏ sót một khoản phụ cấp
 * vừa đổi, đều dẫn tới một văn bản đem đi ký sai).
 */
export function dungDongThayDoi(input: PhuLucInput): DongThayDoi[] {
  const { thayDoi: td, tenKhoan = {} } = input;
  const dong: DongThayDoi[] = [];

  if (td.phongBanMoi && td.phongBanMoi !== td.phongBanCu) {
    dong.push({
      chiTieu: 'Bộ phận công tác',
      cu: td.phongBanCu ?? '',
      moi: td.phongBanMoi,
    });
  }
  if (td.chucDanhMoi && td.chucDanhMoi !== td.chucDanhCu) {
    dong.push({
      chiTieu: 'Chức danh',
      cu: td.chucDanhCu ?? '',
      moi: td.chucDanhMoi,
    });
  }
  if (
    typeof td.mucLuongMoi === 'number' &&
    td.mucLuongMoi !== td.mucLuongCu
  ) {
    dong.push({
      chiTieu: 'Mức lương',
      cu: tien(td.mucLuongCu),
      moi: tien(td.mucLuongMoi),
    });
  }

  for (const [ma, moi] of Object.entries(td.phuCapMoi ?? {})) {
    const cu = td.phuCapCu?.[ma];
    // `cu === undefined` nghĩa là trước đây ăn mức chung công ty, KHÁC với
    // "bằng 0" — nên vẫn là một thay đổi phải in ra.
    if (cu === moi) continue;
    dong.push({
      chiTieu: tenKhoan[ma] ?? ma,
      cu: cu === undefined ? 'Theo quy định công ty' : tien(cu),
      moi: tien(moi),
    });
  }

  return dong;
}

/**
 * Bản in hoàn chỉnh: CSS in dùng chung với hợp đồng (`TRUSTED_PRINT_CSS`) nên
 * phụ lục và hợp đồng in ra cùng một khổ, cùng một font — hai văn bản đính
 * kèm nhau mà trình bày khác nhau thì trông như hai nơi phát hành.
 *
 * Nội dung do CHÍNH hệ thống dựng (không phải mẫu tenant tự soạn) và mọi giá
 * trị đều đi qua `esc()`, nên không cần lớp sanitize như đường mẫu in.
 */
export function renderPhuLucDeIn(input: PhuLucInput): string {
  return `<style>${TRUSTED_PRINT_CSS}</style>${renderPhuLucHtml(input)}`;
}

export function renderPhuLucHtml(input: PhuLucInput): string {
  const { thayDoi: td, nhanVien: nv, congTy: ct } = input;
  const dong = dungDongThayDoi(input);

  const hangBang = dong.length
    ? dong
        .map(
          (d) =>
            `<tr><td>${esc(d.chiTieu)}</td><td>${esc(d.cu)}</td><td>${esc(d.moi)}</td></tr>`,
        )
        .join('\n')
    : `<tr><td colspan="3"><i>Không có chỉ tiêu nào thay đổi.</i></td></tr>`;

  return `
<div class="hd">
<div class="top">
  <div class="cty">${esc(ct.tenCongTy)}</div>
  <div class="quochieu">
    <div class="ten">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="tieungu">Độc lập – Tự do – Hạnh phúc</div>
  </div>
</div>
<div class="ngaylap">${esc(ct.thanhPhoKy)}${ct.thanhPhoKy ? ', ' : ''}ngày ${esc(ngay(td.ngayHieuLuc))}</div>

<h1>PHỤ LỤC HỢP ĐỒNG LAO ĐỘNG</h1>
<div class="so">${td.soQuyetDinh ? `Số: ${esc(td.soQuyetDinh)}` : ''}</div>

<p>- Căn cứ Bộ luật Lao động số 45/2019/QH14 ngày 20 tháng 11 năm 2019;</p>
<p>- Căn cứ Hợp đồng lao động đã ký giữa hai Bên;</p>
<p>- Căn cứ ${esc(LOAI_THAY_DOI_LABEL[td.loaiThayDoi ?? ''] ?? 'quyết định của Công ty')}${td.soQuyetDinh ? ` số ${esc(td.soQuyetDinh)}` : ''}.</p>

<p class="bold">NGƯỜI SỬ DỤNG LAO ĐỘNG: ${esc(ct.tenCongTy)}</p>
<p>Đại diện: ${esc(ct.nguoiDaiDien)}${ct.chucVuNguoiDaiDien ? ` — Chức vụ: ${esc(ct.chucVuNguoiDaiDien)}` : ''}</p>
<p>Địa chỉ: ${esc(ct.diaChiCongTy)}</p>
<p>Mã số thuế: ${esc(ct.maSoThue)}</p>

<p class="bold">NGƯỜI LAO ĐỘNG: ${esc(nv.hoTen)}</p>
<p>Sinh ngày: ${esc(ngay(nv.ngaySinh))}</p>
<p>Số CCCD: ${esc(nv.cccd)}${nv.ngayCapCccd ? ` — Ngày cấp: ${esc(ngay(nv.ngayCapCccd))}` : ''}${nv.noiCapCccd ? ` — Nơi cấp: ${esc(nv.noiCapCccd)}` : ''}</p>
<p>Địa chỉ: ${esc(nv.diaChi)}</p>

<h2>Điều 1. Nội dung thay đổi</h2>
<p>Hai Bên thống nhất sửa đổi các nội dung sau của Hợp đồng lao động, hiệu lực
kể từ ngày ${esc(ngay(td.ngayHieuLuc))}:</p>
<table border="1" cellpadding="6" cellspacing="0">
  <thead><tr><th>Nội dung</th><th>Trước thay đổi</th><th>Sau thay đổi</th></tr></thead>
  <tbody>
${hangBang}
  </tbody>
</table>
${td.lyDo ? `<p>Lý do: ${esc(td.lyDo)}</p>` : ''}

<h2>Điều 2. Điều khoản thi hành</h2>
<p>Các nội dung khác của Hợp đồng lao động không thay đổi và vẫn giữ nguyên
hiệu lực. Phụ lục này là bộ phận không tách rời của Hợp đồng lao động, được
lập thành 02 bản có giá trị như nhau, mỗi Bên giữ 01 bản./.</p>

<div class="signs">
  <div><p class="bold">NGƯỜI SỬ DỤNG LAO ĐỘNG</p><p class="note">(Ký, ghi rõ họ tên, đóng dấu)</p></div>
  <div><p class="bold">NGƯỜI LAO ĐỘNG</p><p class="note">(Ký, ghi rõ họ tên)</p></div>
</div>
</div>`.trim();
}
