import type { PhieuKho, ChiTietPhieuKho, LoaiPhieuKho } from '@/types';
import { formatCurrency } from '@/pages/chung-tu/phieu/lib/format';

export interface CongTyInfo {
  tenCongTy?: string;
  diaChiCongTy?: string;
}

/** Key lưu mẫu in trong config-service (/config/phieu-template/:loai). */
export const KHO_TEMPLATE_KEY: Record<LoaiPhieuKho, string> = {
  NHAP: 'KHO_NHAP',
  XUAT: 'KHO_XUAT',
  CHUYEN: 'KHO_CHUYEN',
};

// ─── Placeholder hỗ trợ (hiển thị trong modal cấu hình) ─────────────────────

export interface KhoPlaceholderDoc {
  token: string;
  moTa: string;
}

export const KHO_PLACEHOLDERS: KhoPlaceholderDoc[] = [
  { token: '{{tenCongTy}}', moTa: 'Tên công ty' },
  { token: '{{diaChiCongTy}}', moTa: 'Địa chỉ công ty' },
  { token: '{{soPhieu}}', moTa: 'Số phiếu' },
  { token: '{{ngay}}', moTa: 'Ngày (dd)' },
  { token: '{{thang}}', moTa: 'Tháng (mm)' },
  { token: '{{nam}}', moTa: 'Năm (yyyy)' },
  { token: '{{tkNo}}', moTa: 'Tài khoản Nợ (dòng đầu)' },
  { token: '{{tkCo}}', moTa: 'Tài khoản Có (dòng đầu)' },
  { token: '{{nguoiGiaoNhan}}', moTa: 'Người giao / người nhận' },
  { token: '{{dienGiai}}', moTa: 'Diễn giải / lý do' },
  { token: '{{soChungTuGoc}}', moTa: 'Số chứng từ gốc kèm theo' },
  { token: '{{khoTen}}', moTa: 'Tên kho (nhập/xuất)' },
  { token: '{{khoXuatTen}}', moTa: 'Kho xuất (chuyển kho)' },
  { token: '{{khoNhapTen}}', moTa: 'Kho nhập (chuyển kho)' },
  { token: '{{lenhDieuDong}}', moTa: 'Lệnh điều động (chuyển kho)' },
  { token: '{{veViec}}', moTa: 'Về việc (chuyển kho)' },
  { token: '{{nguoiVanChuyen}}', moTa: 'Người vận chuyển (chuyển kho)' },
  { token: '{{hopDongVC}}', moTa: 'Hợp đồng vận chuyển (chuyển kho)' },
  { token: '{{phuongTienVC}}', moTa: 'Phương tiện vận chuyển (chuyển kho)' },
  { token: '{{tongTienBangChu}}', moTa: 'Tổng tiền bằng chữ' },
  { token: '{{chiTietTable}}', moTa: 'Bảng chi tiết hàng hóa (hệ thống tự dựng)' },
];

// ─── Common CSS ─────────────────────────────────────────────────────────────

const BASE_CSS = `
  @page { size: A4; margin: 15mm 15mm 15mm 20mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    color: #000;
    margin: 0; padding: 0;
  }
  .page { width: 100%; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
  .company-block { width: 55%; }
  .company-name { font-weight: bold; font-size: 13pt; text-transform: uppercase; }
  .company-address { font-size: 10pt; }
  .mau-so-block { width: 42%; text-align: center; font-size: 10pt; }
  .mau-so-block p { margin: 2px 0; }
  .title-block { text-align: center; margin: 12px 0 4px; }
  .title-block h2 { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 0; }
  .title-block .subtitle { font-size: 10pt; font-style: italic; }
  .ngay-line { text-align: center; font-size: 11pt; margin: 6px 0; }
  .so-phieu { text-align: center; font-weight: bold; margin: 2px 0 8px; }
  .no-co-line { margin: 2px 0; font-size: 11pt; }
  .info-line { margin: 3px 0; font-size: 11pt; }
  table.chi-tiet {
    width: 100%; border-collapse: collapse; margin: 10px 0;
  }
  table.chi-tiet th, table.chi-tiet td {
    border: 1px solid #000; padding: 3px 5px; font-size: 10.5pt;
  }
  table.chi-tiet th { text-align: center; font-weight: bold; background: #f5f5f5; }
  table.chi-tiet td.center { text-align: center; }
  table.chi-tiet td.right { text-align: right; }
  .tong-tien-chu { margin: 8px 0; font-size: 11pt; }
  .chung-tu-goc { margin: 3px 0; font-size: 11pt; }
  .sign-row { display: flex; justify-content: space-around; margin-top: 24px; text-align: center; }
  .sign-col { flex: 1; }
  .sign-col .sign-title { font-weight: bold; font-size: 11pt; margin-bottom: 2px; }
  .sign-col .sign-note { font-size: 10pt; font-style: italic; }
  .sign-col .sign-space { height: 48px; }
  .lien-info { font-style: italic; font-size: 10pt; margin: 2px 0; }
`;

// ─── Bảng chi tiết: dựng động theo loại phiếu (KHÔNG sửa qua template) ──────

function buildChiTietRows(
  chiTiet: ChiTietPhieuKho[],
  slCol1Label: string,
  slCol2Label: string,
  getSlCol1: (ct: ChiTietPhieuKho) => number,
  getSlCol2: (ct: ChiTietPhieuKho) => number,
): string {
  const rows = (chiTiet || []).map((ct, idx) => {
    const tenHang = ct.hangHoaTen + (ct.quyCach ? ` - ${ct.quyCach}` : '');
    const sl1 = getSlCol1(ct);
    const sl2 = getSlCol2(ct);
    return `<tr>
      <td class="center">${idx + 1}</td>
      <td>${tenHang}</td>
      <td class="center">${ct.hangHoaMa || ''}</td>
      <td class="center">${ct.donViTinh || ''}</td>
      <td class="right">${sl1 ? formatCurrency(sl1).replace('₫', '').trim() : ''}</td>
      <td class="right">${sl2 ? formatCurrency(sl2).replace('₫', '').trim() : ''}</td>
      <td class="right">${ct.donGia ? formatCurrency(ct.donGia) : ''}</td>
      <td class="right">${ct.thanhTien ? formatCurrency(ct.thanhTien) : ''}</td>
    </tr>`;
  });

  const tongTien = (chiTiet || []).reduce((s, ct) => s + (ct.thanhTien || 0), 0);
  rows.push(`<tr>
    <td colspan="7" style="text-align:right; font-weight:bold;">Cộng</td>
    <td class="right" style="font-weight:bold;">${formatCurrency(tongTien)}</td>
  </tr>`);

  const headerRow = `<tr>
    <th rowspan="2" style="width:35px">STT</th>
    <th rowspan="2">Tên, nhãn hiệu, quy cách, phẩm chất vật tư, hàng hóa</th>
    <th rowspan="2" style="width:70px">Mã số</th>
    <th rowspan="2" style="width:70px">Đơn vị tính</th>
    <th colspan="2" style="width:140px">Số lượng</th>
    <th rowspan="2" style="width:100px">Đơn giá</th>
    <th rowspan="2" style="width:110px">Thành tiền</th>
  </tr>
  <tr>
    <th>${slCol1Label}</th>
    <th>${slCol2Label}</th>
  </tr>`;

  return headerRow + rows.join('');
}

/** Dựng toàn bộ thẻ <table> chi tiết theo loại phiếu. */
export function buildChiTietTable(phieu: PhieuKho): string {
  let rows: string;
  switch (phieu.loaiPhieu) {
    case 'XUAT':
      rows = buildChiTietRows(
        phieu.chiTiet,
        'Yêu cầu',
        'Thực xuất',
        (ct) => ct.soLuongChungTu ?? ct.soLuong,
        (ct) => ct.soLuongThucTe ?? ct.soLuong,
      );
      break;
    case 'CHUYEN':
      rows = buildChiTietRows(
        phieu.chiTiet,
        'Thực xuất',
        'Thực nhập',
        (ct) => ct.soLuongThucTe ?? ct.soLuong,
        (ct) => ct.soLuongThucTe ?? ct.soLuong,
      );
      break;
    case 'NHAP':
    default:
      rows = buildChiTietRows(
        phieu.chiTiet,
        'Theo chứng từ',
        'Thực nhập',
        (ct) => ct.soLuongChungTu ?? ct.soLuong,
        (ct) => ct.soLuongThucTe ?? ct.soLuong,
      );
  }
  return `<table class="chi-tiet">${rows}</table>`;
}

// ─── Mẫu mặc định (dạng token {{...}}) ─────────────────────────────────────

const TEMPLATE_NHAP = `<html><head>
    <meta charset="utf-8">
    <title>Phiếu nhập kho {{soPhieu}}</title>
    <style>${BASE_CSS}</style>
  </head><body><div class="page">
    <div class="header-row">
      <div class="company-block">
        <div class="company-name">{{tenCongTy}}</div>
        <div class="company-address">{{diaChiCongTy}}</div>
      </div>
      <div class="mau-so-block">
        <p><b>Mẫu số: 01-VT</b></p>
        <p>(Ban hành theo Thông tư số 133/2016/TT-BTC</p>
        <p>ngày 26/8/2016 của Bộ Tài chính)</p>
      </div>
    </div>

    <div class="title-block">
      <h2>Phiếu nhập kho</h2>
      <div class="ngay-line">Ngày <u>{{ngay}}</u> tháng <u>{{thang}}</u> năm <u>{{nam}}</u></div>
    </div>

    <div class="so-phieu">Số: {{soPhieu}}</div>

    <div class="no-co-line">Nợ: <u>{{tkNo}}</u></div>
    <div class="no-co-line">Có: <u>{{tkCo}}</u></div>

    <div class="info-line">- Họ và tên người giao: <u>{{nguoiGiaoNhan}}</u></div>
    <div class="info-line">- Theo .......... số .......... ngày ..........</div>
    <div class="info-line">- Nhập tại kho: <u>{{khoTen}}</u>&nbsp;&nbsp;&nbsp;Địa điểm: .........................................................................</div>

    {{chiTietTable}}

    <div class="tong-tien-chu">- Tổng số tiền (viết bằng chữ): <u>{{tongTienBangChu}}</u></div>
    <div class="chung-tu-goc">- Số chứng từ gốc kèm theo: <u>{{soChungTuGoc}}</u></div>

    <div class="sign-row">
      <div class="sign-col"><div class="sign-title">Người lập phiếu</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div></div>
      <div class="sign-col"><div class="sign-title">Người giao hàng</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div></div>
      <div class="sign-col"><div class="sign-title">Thủ kho</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div></div>
      <div class="sign-col"><div class="sign-title">Kế toán trưởng</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div></div>
    </div>
  </div></body></html>`;

const TEMPLATE_XUAT = `<html><head>
    <meta charset="utf-8">
    <title>Phiếu xuất kho {{soPhieu}}</title>
    <style>${BASE_CSS}</style>
  </head><body><div class="page">
    <div class="header-row">
      <div class="company-block">
        <div class="company-name">{{tenCongTy}}</div>
        <div class="company-address">{{diaChiCongTy}}</div>
      </div>
      <div class="mau-so-block">
        <p><b>Mẫu số: 02-VT</b></p>
        <p>(Ban hành theo Thông tư số 133/2016/TT-BTC</p>
        <p>ngày 26/8/2016 của Bộ Tài chính)</p>
      </div>
    </div>

    <div class="title-block">
      <h2>Phiếu xuất kho</h2>
      <div class="ngay-line">Ngày <u>{{ngay}}</u> tháng <u>{{thang}}</u> năm <u>{{nam}}</u></div>
    </div>

    <div class="so-phieu">Số: {{soPhieu}}</div>

    <div class="no-co-line">Nợ: <u>{{tkNo}}</u></div>
    <div class="no-co-line">Có: <u>{{tkCo}}</u></div>

    <div class="info-line">- Họ và tên người nhận: <u>{{nguoiGiaoNhan}}</u></div>
    <div class="info-line">- Lý do xuất kho: <u>{{dienGiai}}</u></div>
    <div class="info-line">- Xuất tại kho: <u>{{khoTen}}</u>&nbsp;&nbsp;&nbsp;Địa điểm: .........................................................................</div>

    {{chiTietTable}}

    <div class="tong-tien-chu">- Tổng số tiền (viết bằng chữ): <u>{{tongTienBangChu}}</u></div>
    <div class="chung-tu-goc">- Số chứng từ gốc kèm theo: <u>{{soChungTuGoc}}</u></div>

    <div class="sign-row">
      <div class="sign-col"><div class="sign-title">Người lập phiếu</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div></div>
      <div class="sign-col"><div class="sign-title">Người nhận</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div></div>
      <div class="sign-col"><div class="sign-title">Thủ kho</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div></div>
      <div class="sign-col"><div class="sign-title">Kế toán trưởng</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div></div>
    </div>
  </div></body></html>`;

const TEMPLATE_CHUYEN = `<html><head>
    <meta charset="utf-8">
    <title>Phiếu xuất kho kiêm vận chuyển nội bộ {{soPhieu}}</title>
    <style>${BASE_CSS}</style>
  </head><body><div class="page">
    <div class="header-row">
      <div class="company-block">
        <div class="company-name">{{tenCongTy}}</div>
        <div class="company-address">{{diaChiCongTy}}</div>
      </div>
      <div class="mau-so-block">
        <p><b>Mẫu số: 03XKNB3/001</b></p>
        <p>Ký hiệu: ...................</p>
        <p>Số: <b>{{soPhieu}}</b></p>
      </div>
    </div>

    <div class="title-block">
      <h2>Phiếu xuất kho kiêm vận chuyển nội bộ</h2>
    </div>

    <div class="lien-info">Liên 01: Lưu</div>
    <div class="info-line">Ngày <u>{{ngay}}</u> tháng <u>{{thang}}</u> năm <u>{{nam}}</u></div>
    <div class="info-line">Căn cứ lệnh điều động số <u>{{lenhDieuDong}}</u> ngày .......... của ..........</div>
    <div class="info-line">về việc: <u>{{veViec}}</u></div>
    <div class="info-line">Họ tên người vận chuyển: <u>{{nguoiVanChuyen}}</u>&nbsp;&nbsp;&nbsp;Hợp đồng số: <u>{{hopDongVC}}</u></div>
    <div class="info-line">Phương tiện vận chuyển: <u>{{phuongTienVC}}</u></div>
    <div class="info-line">Xuất tại kho: <u>{{khoXuatTen}}</u></div>
    <div class="info-line">Nhập tại kho: <u>{{khoNhapTen}}</u></div>

    {{chiTietTable}}

    <div class="tong-tien-chu">Tổng số tiền (viết bằng chữ): <u>{{tongTienBangChu}}</u></div>
    <div class="chung-tu-goc">Số chứng từ gốc kèm theo: <u>{{soChungTuGoc}}</u></div>

    <div class="sign-row">
      <div class="sign-col"><div class="sign-title">Người lập phiếu</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div></div>
      <div class="sign-col"><div class="sign-title">Thủ kho xuất</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div></div>
      <div class="sign-col"><div class="sign-title">Người vận chuyển</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div></div>
      <div class="sign-col"><div class="sign-title">Thủ kho nhập</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div></div>
    </div>
  </div></body></html>`;

/** Mẫu in mặc định theo loại phiếu (dạng token {{...}}). */
export function getDefaultKhoTemplate(loaiPhieu: LoaiPhieuKho): string {
  switch (loaiPhieu) {
    case 'XUAT':
      return TEMPLATE_XUAT;
    case 'CHUYEN':
      return TEMPLATE_CHUYEN;
    case 'NHAP':
    default:
      return TEMPLATE_NHAP;
  }
}
