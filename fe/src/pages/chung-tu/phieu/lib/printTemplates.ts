import { LoaiChungTu } from "@/types";

/**
 * Mẫu in mặc định cho phiếu thu (01-TT) / phiếu chi (02-TT).
 * Dùng token {{...}} — xem PHIEU_PLACEHOLDERS. Khi người dùng upload mẫu
 * riêng (Part D) sẽ ưu tiên mẫu đó; rỗng thì dùng mẫu này.
 */

export interface PlaceholderDoc {
  token: string;
  moTa: string;
}

export const PHIEU_PLACEHOLDERS: PlaceholderDoc[] = [
  { token: "{{soPhieu}}", moTa: "Số phiếu" },
  { token: "{{ngay}}", moTa: "Ngày (dd)" },
  { token: "{{thang}}", moTa: "Tháng (mm)" },
  { token: "{{nam}}", moTa: "Năm (yyyy)" },
  { token: "{{nguoiGiaoDich}}", moTa: "Họ tên người nộp/nhận tiền" },
  { token: "{{diaChi}}", moTa: "Địa chỉ" },
  { token: "{{noiDung}}", moTa: "Lý do nộp/chi" },
  { token: "{{soTien}}", moTa: "Số tiền (định dạng)" },
  { token: "{{soTienBangChu}}", moTa: "Số tiền bằng chữ" },
  { token: "{{taiKhoanNo}}", moTa: "Tài khoản Nợ" },
  { token: "{{taiKhoanCo}}", moTa: "Tài khoản Có" },
  { token: "{{ghiChu}}", moTa: "Kèm theo / ghi chú" },
  { token: "{{tenCongTy}}", moTa: "Tên công ty" },
  { token: "{{diaChiCongTy}}", moTa: "Địa chỉ công ty" },
];

const BASE_STYLE = `
  <style>
    @page { size: A5 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    .phieu { font-family: "Times New Roman", serif; font-size: 13px; color: #000; line-height: 1.5; }
    .phieu .top { display: flex; justify-content: space-between; }
    .phieu .cty { font-weight: bold; text-transform: uppercase; }
    .phieu .mau { font-style: italic; }
    .phieu h1 { text-align: center; font-size: 20px; margin: 10px 0 2px; letter-spacing: 1px; }
    .phieu .sub { text-align: center; font-style: italic; margin-bottom: 8px; }
    .phieu .no-co { text-align: right; }
    .phieu .row { margin: 4px 0; }
    .phieu .label { }
    .phieu .val { font-weight: bold; }
    .phieu .signs { display: flex; justify-content: space-between; margin-top: 28px; text-align: center; }
    .phieu .signs > div { flex: 1; font-size: 12px; }
    .phieu .signs .role { font-weight: bold; }
    .phieu .signs .note { font-style: italic; }
  </style>
`;

const PHIEU_THU = `
<div class="phieu">
  ${BASE_STYLE}
  <div class="top">
    <div>
      <div class="cty">{{tenCongTy}}</div>
      <div>{{diaChiCongTy}}</div>
    </div>
    <div class="mau">Mẫu số 01 - TT</div>
  </div>
  <h1>PHIẾU THU</h1>
  <div class="sub">Ngày {{ngay}} tháng {{thang}} năm {{nam}}</div>
  <div class="no-co">Số: {{soPhieu}}</div>
  <div class="no-co">Nợ: {{taiKhoanNo}}</div>
  <div class="no-co">Có: {{taiKhoanCo}}</div>
  <div class="row"><span class="label">Họ và tên người nộp tiền: </span><span class="val">{{nguoiGiaoDich}}</span></div>
  <div class="row"><span class="label">Địa chỉ: </span>{{diaChi}}</div>
  <div class="row"><span class="label">Lý do nộp: </span>{{noiDung}}</div>
  <div class="row"><span class="label">Số tiền: </span><span class="val">{{soTien}}</span></div>
  <div class="row"><span class="label">Viết bằng chữ: </span><i>{{soTienBangChu}}</i></div>
  <div class="row"><span class="label">Kèm theo: </span>{{ghiChu}} chứng từ gốc.</div>
  <div class="signs">
    <div><div class="role">Giám đốc</div><div class="note">(Ký, họ tên, đóng dấu)</div></div>
    <div><div class="role">Kế toán trưởng</div><div class="note">(Ký, họ tên)</div></div>
    <div><div class="role">Người nộp tiền</div><div class="note">(Ký, họ tên)</div></div>
    <div><div class="role">Người lập phiếu</div><div class="note">(Ký, họ tên)</div></div>
    <div><div class="role">Thủ quỹ</div><div class="note">(Ký, họ tên)</div></div>
  </div>
</div>
`;

const PHIEU_CHI = `
<div class="phieu">
  ${BASE_STYLE}
  <div class="top">
    <div>
      <div class="cty">{{tenCongTy}}</div>
      <div>{{diaChiCongTy}}</div>
    </div>
    <div class="mau">Mẫu số 02 - TT</div>
  </div>
  <h1>PHIẾU CHI</h1>
  <div class="sub">Ngày {{ngay}} tháng {{thang}} năm {{nam}}</div>
  <div class="no-co">Số: {{soPhieu}}</div>
  <div class="no-co">Nợ: {{taiKhoanNo}}</div>
  <div class="no-co">Có: {{taiKhoanCo}}</div>
  <div class="row"><span class="label">Họ và tên người nhận tiền: </span><span class="val">{{nguoiGiaoDich}}</span></div>
  <div class="row"><span class="label">Địa chỉ: </span>{{diaChi}}</div>
  <div class="row"><span class="label">Lý do chi: </span>{{noiDung}}</div>
  <div class="row"><span class="label">Số tiền: </span><span class="val">{{soTien}}</span></div>
  <div class="row"><span class="label">Viết bằng chữ: </span><i>{{soTienBangChu}}</i></div>
  <div class="row"><span class="label">Kèm theo: </span>{{ghiChu}} chứng từ gốc.</div>
  <div class="signs">
    <div><div class="role">Giám đốc</div><div class="note">(Ký, họ tên, đóng dấu)</div></div>
    <div><div class="role">Kế toán trưởng</div><div class="note">(Ký, họ tên)</div></div>
    <div><div class="role">Thủ quỹ</div><div class="note">(Ký, họ tên)</div></div>
    <div><div class="role">Người lập phiếu</div><div class="note">(Ký, họ tên)</div></div>
    <div><div class="role">Người nhận tiền</div><div class="note">(Ký, họ tên)</div></div>
  </div>
</div>
`;

export const DEFAULT_PHIEU_THU_HTML = PHIEU_THU.trim();
export const DEFAULT_PHIEU_CHI_HTML = PHIEU_CHI.trim();

export function getDefaultTemplate(loai: LoaiChungTu): string {
  return loai === "PHIEU_CHI" ? DEFAULT_PHIEU_CHI_HTML : DEFAULT_PHIEU_THU_HTML;
}
