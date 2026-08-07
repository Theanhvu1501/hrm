import sanitizeHtmlLib from 'sanitize-html';

/**
 * In hợp đồng lao động — thay token {{...}} trong mẫu (mặc định hoặc tenant
 * tự soạn) bằng dữ liệu thật của 1 hợp đồng. Hàm THUẦN (không phụ thuộc
 * TypeORM/NestJS) để dễ unit test và tái dùng ở cả BE render endpoint lẫn,
 * nếu sau này cần, ở FE.
 *
 * Nguồn văn bản gốc: hợp đồng ký thật của Công ty Cổ phần MASTER CEO theo
 * BLLĐ 45/2019/QH14. Giữ nguyên toàn bộ 9 Điều, đúng thứ tự, đúng câu chữ —
 * chỉ thay các vị trí "……" (chỗ trống điền tay) bằng token dữ liệu thật.
 * KHÔNG được tự sửa nội dung điều khoản: đây là văn bản người ta ký.
 */

// ─────────────────────────────────────────────────────────────────────────
// Input shapes — subset tối thiểu cần cho việc in, KHÔNG import trực tiếp
// entity TypeORM (giữ module này thuần, dễ test không cần DB).
// ─────────────────────────────────────────────────────────────────────────

export interface HopDongRenderContract {
  contractNo: string;
  loaiHopDong: string; // thu_viec|xac_dinh_thoi_han|khong_xac_dinh_thoi_han|dich_vu
  ngayBatDau?: string;
  ngayKetThuc?: string;
  mucLuong?: number;
  phuCap?: number;
  /** Hợp đồng chưa có cột "ngày ký" riêng — dùng làm điểm neo cho ngày lập ở đầu văn bản khi ngayBatDau trống. */
  createdAt?: string;
  /** Snapshot chức danh TẠI THỜI ĐIỂM KÝ — ưu tiên hơn employee.chucDanh khi render (xem buildHopDongPlaceholders). */
  chucDanh?: string;
}

export interface HopDongRenderEmployee {
  hoTen?: string;
  ngaySinh?: string;
  gioiTinh?: string; // nam|nu|khac
  cccd?: string;
  /** Ngày cấp CCCD, dạng "YYYY-MM-DD" — in ra "DD/MM/YYYY". */
  ngayCapCccd?: string;
  noiCapCccd?: string;
  diaChi?: string;
  soDienThoai?: string;
  /** Chức danh HIỆN TẠI của nhân viên — chỉ dùng làm fallback khi hợp đồng chưa có contract.chucDanh (hợp đồng tạo trước khi có cột này). */
  chucDanh?: string;
}

export interface HopDongRenderCongTy {
  tenCongTy?: string | null;
  diaChiCongTy?: string | null;
  maSoThue?: string | null;
  nguoiDaiDien?: string | null;
  chucVuNguoiDaiDien?: string | null;
  /** Thành phố ký hợp đồng (dòng quốc hiệu) — xem chú thích tại entity. */
  thanhPhoKy?: string | null;
  /** Hậu tố số hợp đồng mẫu (vd "/HĐLĐ-MC.1") — xem chú thích tại entity. */
  maHopDongMau?: string | null;
}

export interface HopDongRenderInput {
  contract: HopDongRenderContract;
  employee: HopDongRenderEmployee;
  congTy: HopDongRenderCongTy;
}

// ─────────────────────────────────────────────────────────────────────────
// Sanitize HTML hợp đồng — dùng `sanitize-html` (parser HTML thật qua
// htmlparser2, KHÔNG phải regex) vì regex không thể phân tích đúng cú pháp
// HTML: review vòng 1 (Critical 1) chạy tay 9 payload qua bản regex cũ và
// TẤT CẢ sống sót — `</script >` (khoảng trắng cuối end tag), `</script/>`
// (solidus), `<script>` không đóng thẻ, `<img src=x/onerror=...>` ("/" là
// dấu tách thuộc tính hợp lệ, không phải khoảng trắng), `<svg/onload=...>`,
// `<iframe srcdoc="...">`, `href=javascript:...` không dấu nháy, entity-encode
// (`javas&#99;ript:`), và `<base href="...">` đổi gốc tương đối cả trang.
//
// Chiến lược: KHÔNG cố lọc từng thuộc tính nguy hiểm trên từng thẻ (đó là
// cách tiếp cận blocklist, luôn thiếu) — allowlist THẲNG các thẻ được phép,
// và KHÔNG thẻ nào trong allowlist có thể mang href/src/srcdoc/onXxx (a,
// img, iframe, svg, object, embed, form, input, base, link, meta, script đều
// bị loại khỏi allowedTags). Không có "chỗ bám" thì mọi biến thể encode/
// malformed ở trên đều vô hại — không cần liệt kê từng dạng.
//
// review VÒNG 2: 'style' TỪNG nằm trong allowedTags (kèm allowVulnerableTags)
// — SAI, vì 'style' (giống 'script') là thẻ "raw text": nội dung bên trong
// được trả ra NGUYÊN VĂN, không escape (bắt buộc, để CSS hợp lệ). htmlparser2
// (bộ máy phân tích của sanitize-html) và trình duyệt thật KHÔNG đồng thuận
// về việc `</style/>` (có "/" thừa trước ">") có đóng thẻ style hay không —
// browser thật ĐÓNG (parse error nhưng vẫn đóng), htmlparser2 thì KHÔNG,
// tiếp tục đọc mọi thứ sau đó — kể cả 1 chuỗi `<script>alert(1)</script>`
// hợp lệ — như thể còn là text bên trong style, rồi in NGUYÊN VĂN ra output
// (vì đó là raw text, không escape). Kết quả: input
// `<style>a{}</style/><script>alert(1)</script>` ra output
// `<style>a{}</style/><script>alert(1)</script></style>` — chuỗi
// `<script>alert(1)</script>` nằm NGUYÊN trong output, và khi trình duyệt
// THẬT (đóng style tại `</style/>`) parse lại output này, nó thấy `<script>`
// là 1 thẻ SỐNG, không phải text — chạy được. Đây là lỗi "parser confusion"
// (2 bộ máy phân tích bất đồng về ranh giới 1 thẻ raw-text), CÙNG LỚP lỗi
// với `</script/>` ở vòng 1, chỉ chuyển sang thẻ khác.
//
// Fix: KHÔNG allowlist 'style' (hay bất kỳ thẻ raw-text nào khác) — loại
// hẳn khỏi allowedTags, bỏ allowVulnerableTags. CSS in (@page, font, layout)
// giờ nằm ở hằng số TRUSTED_PRINT_CSS bên dưới, KHÔNG BAO GIỜ đi qua
// sanitizer hay lẫn với nội dung tenant có thể chỉnh — `renderHopDongHtml`
// ghép nó vào SAU KHI sanitize xong, ở khâu build document cuối cùng.
//
// Dùng CHUNG cho cả 2 điểm:
//  1. `hop-dong.service.ts: upsertMauIn` — sanitize lúc LƯU mẫu tenant tự soạn.
//  2. `renderHopDongHtml` bên dưới — sanitize lại HTML ĐÃ GHÉP xong ngay
//     trước khi trả ra, để dù 1 dòng cũ trong DB (lưu trước khi có sanitizer
//     này, hoặc trước một bản sanitizer bị bypass sau này) vẫn không bao giờ
//     phục vụ HTML sống cho trình duyệt. Không coi "sanitize lúc lưu" là đủ.
// ─────────────────────────────────────────────────────────────────────────
const ALLOWED_TAGS = [
  'div', 'p', 'span', 'br', 'hr',
  'b', 'strong', 'i', 'em', 'u', 'small', 'sup', 'sub',
  'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'caption',
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  '*': ['style', 'class'],
  table: ['border', 'cellpadding', 'cellspacing'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
};

export function sanitizeHopDongHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    // Không allowlist thẻ nào có href/src (xem giải thích ở trên) nên không
    // có scheme URL nào có "chỗ bám" — chặn tuyệt đối cho chắc.
    allowedSchemes: [],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
  });
}

/**
 * CSS in ấn (khổ A4, font, layout) — hằng số TRUSTED, KHÔNG BAO GIỜ đi qua
 * sanitizer và KHÔNG thể bị tenant ghi đè qua mẫu in (mẫu không còn được
 * phép chứa thẻ `<style>` — xem giải thích ở trên). `renderHopDongHtml` ghép
 * hằng số này vào output SAU bước sanitize.
 */
export const TRUSTED_PRINT_CSS = `
  @page { size: A4; margin: 20mm 22mm; }
  .hd { font-family: "Times New Roman", Times, serif; font-size: 14px; line-height: 1.5; color: #000; }
  .hd .top { display: flex; justify-content: space-between; }
  .hd .top .cty { font-weight: bold; text-transform: uppercase; text-align: center; width: 45%; }
  .hd .top .quochieu { text-align: center; width: 50%; }
  .hd .top .quochieu .ten { font-weight: bold; }
  .hd .top .quochieu .tieungu { font-style: italic; border-top: 1px solid #000; display: inline-block; margin-top: 2px; }
  .hd .ngaylap { text-align: right; font-style: italic; margin: 6px 0 14px; }
  .hd h1 { text-align: center; font-size: 22px; letter-spacing: 1px; margin: 0 0 2px; }
  .hd .so { text-align: center; margin-bottom: 12px; }
  .hd p { margin: 4px 0; text-align: justify; }
  .hd .bold { font-weight: bold; }
  .hd h2 { font-size: 15px; margin: 14px 0 4px; }
  .hd .signs { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
  .hd .signs > div { width: 45%; }
  .hd .note { font-style: italic; font-size: 12px; }
`.trim();

// ─────────────────────────────────────────────────────────────────────────
// Escape giá trị nội suy (dữ liệu nhân viên/công ty) — khác với mẫu (HTML
// hợp lệ do admin soạn), các giá trị này là DỮ LIỆU tự do (họ tên, địa chỉ,
// ...) nên PHẢI escape để không ai chèn được HTML/script qua hồ sơ nhân viên.
// ─────────────────────────────────────────────────────────────────────────
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtDateParts(iso?: string): { ngay: string; thang: string; nam: string } {
  if (!iso) return { ngay: '', thang: '', nam: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { ngay: '', thang: '', nam: '' };
  return {
    ngay: String(d.getUTCDate()).padStart(2, '0'),
    thang: String(d.getUTCMonth() + 1).padStart(2, '0'),
    nam: String(d.getUTCFullYear()),
  };
}

function fmtTien(value?: number): string {
  if (!value) return '';
  return `${value.toLocaleString('vi-VN')} đồng/tháng`;
}

const GIOI_TINH_LABEL: Record<string, string> = {
  nam: 'Nam',
  nu: 'Nữ',
  khac: 'Khác',
};

const LOAI_HOP_DONG_LABEL: Record<string, string> = {
  thu_viec: 'Thử việc',
  xac_dinh_thoi_han: 'Xác định thời hạn',
  khong_xac_dinh_thoi_han: 'Không xác định thời hạn',
  dich_vu: 'Dịch vụ',
};

/** Câu 1.2 (thời hạn hợp đồng) — nội dung PHỤ THUỘC loại hợp đồng, không được bịa ngày kết thúc cho loại không xác định thời hạn. */
function buildDieu1_2(contract: HopDongRenderContract): string {
  const batDau = fmtDate(contract.ngayBatDau);
  const ketThuc = fmtDate(contract.ngayKetThuc);
  const batDauText = batDau || '……/……/20……';

  switch (contract.loaiHopDong) {
    case 'khong_xac_dinh_thoi_han':
      return `Hợp đồng không xác định thời hạn, kể từ ngày ${batDauText}.`;
    case 'thu_viec':
      return ketThuc
        ? `Thời gian thử việc, kể từ ngày ${batDauText} đến ngày ${ketThuc}.`
        : `Thời gian thử việc, kể từ ngày ${batDauText}.`;
    default:
      return ketThuc
        ? `Hợp đồng có thời hạn, kể từ ngày ${batDauText} đến ngày ${ketThuc}.`
        : `Hợp đồng có thời hạn, kể từ ngày ${batDauText}.`;
  }
}

/** Escape 1 giá trị rồi trả về chuỗi rỗng nếu undefined/null — token nào cũng đi qua đây. */
function v(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  return escapeHtml(String(value));
}

/**
 * Dựng bảng token {{...}} → giá trị đã escape. Đây là điểm DUY NHẤT ánh xạ
 * dữ liệu hồ sơ (contract/employee/congTy) sang nội dung hiển thị trên hợp
 * đồng — mọi suy diễn (giới tính, loại HĐ, câu 1.2, phụ cấp...) đứng ở đây.
 */
export function buildHopDongPlaceholders(input: HopDongRenderInput): Record<string, string> {
  const { contract, employee, congTy } = input;
  const ngayLap = fmtDateParts(contract.ngayBatDau || contract.createdAt);
  const phuCapText = contract.phuCap ? fmtTien(contract.phuCap) : 'Theo quy định của công ty';
  // Ưu tiên snapshot tại thời điểm ký; hợp đồng cũ (chưa có contract.chucDanh)
  // fallback về chức danh HIỆN TẠI của nhân viên — buildCanhBao cảnh báo khi
  // rơi vào nhánh fallback này.
  const chucDanh = contract.chucDanh || employee.chucDanh || '';

  return {
    soHopDong: v(contract.contractNo),
    ngayLapNgay: v(ngayLap.ngay),
    ngayLapThang: v(ngayLap.thang),
    ngayLapNam: v(ngayLap.nam),

    tenCongTy: v(congTy.tenCongTy),
    diaChiCongTy: v(congTy.diaChiCongTy),
    maSoThueCongTy: v(congTy.maSoThue),
    nguoiDaiDien: v(congTy.nguoiDaiDien),
    chucVuNguoiDaiDien: v(congTy.chucVuNguoiDaiDien),
    thanhPhoKy: v(congTy.thanhPhoKy),
    maHopDongMau: v(congTy.maHopDongMau),

    hoTenNLD: v(employee.hoTen),
    ngaySinh: v(fmtDate(employee.ngaySinh)),
    gioiTinh: v(employee.gioiTinh ? GIOI_TINH_LABEL[employee.gioiTinh] ?? employee.gioiTinh : ''),
    soCCCD: v(employee.cccd),
    ngayCapCccd: v(fmtDate(employee.ngayCapCccd)),
    noiCapCccd: v(employee.noiCapCccd),
    diaChiNLD: v(employee.diaChi),
    soDienThoaiNLD: v(employee.soDienThoai),
    chucDanh: v(chucDanh),

    dieu1_1: v(LOAI_HOP_DONG_LABEL[contract.loaiHopDong] ?? contract.loaiHopDong),
    dieu1_2: v(buildDieu1_2(contract)),
    mucLuong: v(fmtTien(contract.mucLuong)),
    phuCapText: v(phuCapText),
  };
}

/**
 * Danh sách token HỢP LỆ — nguồn sự thật duy nhất cho cả (a) validate lúc
 * LƯU mẫu (`timTokenLaCuaMauIn`, review Important #7: từ chối token lạ thay
 * vì âm thầm để trống) và (b) khoá `values` mà `buildHopDongPlaceholders`
 * trả ra. Thêm token mới PHẢI thêm vào đây, nếu không `upsertMauIn` sẽ từ
 * chối lưu mẫu dùng token đó.
 */
export const HOP_DONG_TOKENS = [
  'soHopDong', 'ngayLapNgay', 'ngayLapThang', 'ngayLapNam',
  'tenCongTy', 'diaChiCongTy', 'maSoThueCongTy', 'nguoiDaiDien', 'chucVuNguoiDaiDien',
  'thanhPhoKy', 'maHopDongMau',
  'hoTenNLD', 'ngaySinh', 'gioiTinh', 'soCCCD', 'ngayCapCccd', 'noiCapCccd',
  'diaChiNLD', 'soDienThoaiNLD', 'chucDanh',
  'dieu1_1', 'dieu1_2', 'mucLuong', 'phuCapText',
] as const;

/** Tìm các token {{...}} trong mẫu KHÔNG nằm trong HOP_DONG_TOKENS — vd lỗi gõ như {{mucLuongg}}. */
export function timTokenLaCuaMauIn(template: string): string[] {
  const found = new Set<string>();
  const re = /\{\{\s*(\w+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) {
    if (!(HOP_DONG_TOKENS as readonly string[]).includes(m[1])) found.add(m[1]);
  }
  return [...found];
}

/**
 * Những khoảng trống KHÔNG do người dùng cố ý bỏ trống mà do hồ sơ chưa có
 * trường tương ứng (CCCD ngày cấp/nơi cấp), do tenant chưa cấu hình (thông
 * tin công ty), hoặc do dữ liệu hợp đồng thiếu thứ PHÁP LUẬT đòi phải có
 * (mức lương, ngày kết thúc hợp đồng xác định thời hạn) — liệt kê để FE hiện
 * cảnh báo, KHÔNG âm thầm in thiếu/in sai.
 *
 * `template` được truyền vào để cảnh báo CCCD chỉ bắn khi mẫu ĐANG DÙNG thật
 * sự còn nhắc tới CCCD — tenant tự soạn mẫu bỏ hẳn đoạn đó thì không còn gì
 * để cảnh báo (review Minor: cảnh báo luôn bắn kể cả khi mẫu không còn nhắc).
 */
function buildCanhBao(input: HopDongRenderInput, template: string): string[] {
  const canhBao: string[] = [];
  const { contract, employee, congTy } = input;

  // Hồ sơ nay CÓ hai cột này, nên chỉ cảnh báo khi chúng thật sự trống — và
  // chỉ khi mẫu đang dùng còn in đoạn CCCD (tenant tự soạn mẫu bỏ hẳn đoạn
  // đó thì không còn gì để cảnh báo).
  //
  // Thiếu MỘT trong hai cũng cảnh báo: bản in vẫn hở một chỗ, mà một chỗ
  // trống trên hợp đồng đem đi ký thì cũng phải sửa tay như hở cả hai.
  if (template.includes('CCCD') && (!employee.ngayCapCccd || !employee.noiCapCccd)) {
    canhBao.push('Hồ sơ nhân viên chưa có Ngày cấp / Nơi cấp CCCD — điền vào hồ sơ, hoặc điền tay trên bản in.');
  }

  if (
    !congTy.tenCongTy ||
    !congTy.diaChiCongTy ||
    !congTy.maSoThue ||
    !congTy.nguoiDaiDien
  ) {
    canhBao.push(
      'Chưa cấu hình đủ thông tin công ty (tên/địa chỉ/MST/người đại diện) — vào "Mẫu in hợp đồng" để điền. In khi thiếu có thể in NHẦM công ty khác nếu tenant khác đã cấu hình.',
    );
  }
  if (!employee.hoTen) canhBao.push('Nhân viên chưa có họ tên.');
  if (!employee.diaChi) canhBao.push('Nhân viên chưa có địa chỉ thường trú.');
  if (!employee.ngaySinh) canhBao.push('Nhân viên chưa có ngày sinh.');

  if (!contract.chucDanh && employee.chucDanh) {
    canhBao.push(
      'Hợp đồng này chưa lưu snapshot chức danh lúc ký — bản in đang dùng chức danh HIỆN TẠI của nhân viên, có thể khác chức danh tại thời điểm ký.',
    );
  }

  if (!contract.mucLuong) {
    canhBao.push('Hợp đồng chưa có mức lương — Điều 3.1 sẽ in trống.');
  }

  if (contract.loaiHopDong === 'xac_dinh_thoi_han' && !contract.ngayKetThuc) {
    canhBao.push(
      'Hợp đồng xác định thời hạn nhưng chưa có ngày kết thúc — BLLĐ Điều 20 yêu cầu hợp đồng xác định thời hạn phải ghi rõ thời hạn.',
    );
  }

  return canhBao;
}

/** Thay {{token}} bằng giá trị đã escape; token lạ → GIỮ NGUYÊN {{token}} (báo lỗi hiện rõ trên bản in, không âm thầm để trống). */
function substitute(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match,
  );
}

export function renderHopDongHtml(
  template: string,
  input: HopDongRenderInput,
): { html: string; canhBao: string[] } {
  const values = buildHopDongPlaceholders(input);
  const html = substitute(template, values);
  // Sanitize lại HTML ĐÃ GHÉP xong — không coi sanitize lúc lưu là chốt chặn
  // duy nhất (review Critical 1): dòng dữ liệu cũ lưu trước khi có sanitizer
  // này, hoặc trước một bản sanitizer sau này lỡ bị bypass, vẫn không bao
  // giờ phục vụ HTML sống ra khỏi hàm này.
  const sanitized = sanitizeHopDongHtml(html);
  return {
    // TRUSTED_PRINT_CSS ghép vào SAU sanitize, KHÔNG đi qua sanitizer —
    // hằng số cố định trong code, tenant không chỉnh được (review vòng 2:
    // 'style' bị loại khỏi allowedTags chính vì lý do này).
    html: `<style>${TRUSTED_PRINT_CSS}</style>${sanitized}`,
    canhBao: buildCanhBao(input, template),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Mẫu mặc định — dùng khi tenant chưa tự soạn mẫu riêng. Transcribe nguyên
// văn hợp đồng gốc (BLLĐ 45/2019/QH14), giữ đủ 9 Điều đúng thứ tự.
// ─────────────────────────────────────────────────────────────────────────
export const DEFAULT_HOP_DONG_HTML = `
<div class="hd">
<div class="top">
  <div class="cty">{{tenCongTy}}</div>
  <div class="quochieu">
    <div class="ten">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="tieungu">Độc lập – Tự do – Hạnh phúc</div>
  </div>
</div>
<div class="ngaylap">{{thanhPhoKy}}, ngày {{ngayLapNgay}} tháng {{ngayLapThang}} năm {{ngayLapNam}}</div>

<h1>HỢP ĐỒNG LAO ĐỘNG</h1>
<div class="so">Số: {{soHopDong}}{{maHopDongMau}}</div>

<p>- Căn cứ Bộ luật Lao động số 45/2019/QH14 ngày 20 tháng 11 năm 2019 và các văn bản hướng dẫn thi hành;</p>
<p>- Căn cứ nhu cầu và năng lực của hai Bên;</p>
<p>Chúng tôi gồm:</p>

<p class="bold">NGƯỜI SỬ DỤNG LAO ĐỘNG:</p>
<p class="bold">{{tenCongTy}}</p>
<p>Đại diện: {{nguoiDaiDien}} &nbsp;&nbsp;&nbsp; Chức vụ: {{chucVuNguoiDaiDien}}</p>
<p>Địa chỉ: {{diaChiCongTy}}</p>
<p>Mã số thuế: {{maSoThueCongTy}}</p>
<p>Điện thoại: ………………………….&nbsp;&nbsp;&nbsp; Email: ……………………………………….</p>

<p class="bold">NGƯỜI LAO ĐỘNG:</p>
<p>Họ và tên: {{hoTenNLD}}</p>
<p>Ngày sinh: {{ngaySinh}} &nbsp;&nbsp;&nbsp; Giới tính: {{gioiTinh}}</p>
<p>Số CCCD: {{soCCCD}} &nbsp;&nbsp;&nbsp; Ngày cấp: {{ngayCapCccd}} &nbsp;&nbsp;&nbsp; Nơi cấp: {{noiCapCccd}}</p>
<p>Địa chỉ thường trú: {{diaChiNLD}}</p>
<p>Điện thoại: {{soDienThoaiNLD}}</p>

<p>Sau khi thỏa thuận, Người sử dụng lao động và Người lao động (sau đây gọi tắt là "hai Bên") thống nhất ký Hợp đồng lao động với các điều khoản sau đây:</p>

<h2>Điều 1. Thời hạn và công việc hợp đồng</h2>
<p>1.1. Loại hợp đồng lao động: {{dieu1_1}}</p>
<p>1.2. {{dieu1_2}}</p>
<p>1.3. Địa điểm làm việc: Tại trụ sở {{tenCongTy}}</p>
<p>1.4. Chức danh chuyên môn/ chức vụ: {{chucDanh}}</p>
<p>1.5. Nhiệm vụ công việc như sau:</p>
<p>- Chịu sự điều hành, phân công của Công ty.</p>
<p>- Thực hiện công việc theo đúng chức danh chuyên môn của mình dưới sự quản lý, điều hành của người có thẩm quyền.</p>
<p>- Phối hợp cùng với các bộ phận, phòng ban khác trong Công ty để phát huy tối đa hiệu quả công việc.</p>
<p>- Hoàn thành những công việc khác theo yêu cầu của Công ty và theo quyết định của Ban Giám đốc.</p>

<h2>Điều 2. Chế độ làm việc</h2>
<p>2.1. Thời gian làm việc: Buổi sáng: 8h00-12h00, Buổi chiều:13h30-17h00;</p>
<p>Ngày làm việc: Từ thứ 2 đến thứ 7 (trong đó, nghỉ 2 ngày thứ 7 trong tháng).</p>
<p>2.2. Do tính chất công việc, yêu cầu của công ty hoặc yêu cầu của khách hàng, Công ty có thể cho áp dụng thời gian làm việc linh hoạt. Người lao động được áp dụng thời gian làm việc linh hoạt có thể không tuân thủ lịch làm việc cố định bình thường mà làm theo thời gian cụ thể của công việc, nhưng vẫn phải đảm bảo đủ thời giờ làm việc theo quy định.</p>
<p>2.3. Thiết bị và công cụ làm việc cần thiết sẽ được Công ty cấp phát, trang bị tùy theo nhu cầu của công việc.</p>
<p>2.4. Điều kiện an toàn và vệ sinh lao động, trang bị bảo hộ lao động (nếu có) tại nơi làm việc theo quy định của pháp luật hiện hành.</p>

<h2>Điều 3. Quyền và nghĩa vụ của Người lao động</h2>
<p class="bold">3.1. Quyền của Người lao động</p>
<p>a) Tiền lương, phụ cấp và các khoản bổ sung khác</p>
<p>- Mức lương: {{mucLuong}};</p>
<p>- Các khoản phụ cấp: {{phuCapText}};</p>
<p>- Chế độ nâng lương: Theo quy định của pháp luật và Quy chế tiền lương của Công ty;</p>
<p>- Chế độ thưởng: Theo Quy chế thưởng, tùy theo hiệu quả công việc và tình hình kinh doanh của Công ty;</p>
<p>- Bảo hiểm xã hội, bảo hiểm y tế và bảo hiểm thất nghiệp: Theo quy định của pháp luật hiện hành;</p>
<p>- Kỳ hạn trả lương: 01 lần/tháng, vào ngày ….. hằng tháng. Nếu ngày trả lương trùng ngày nghỉ thì trả vào ngày làm việc liền trước/liền kề.</p>
<p>- Hình thức trả lương: Chuyển khoản.</p>
<p>b) Các quyền lợi khác:</p>
<p>- Chế độ nghỉ:</p>
<p>&nbsp;&nbsp;&nbsp;+ Nghỉ hàng tháng: 2 ngày Thứ 7 và các ngày Chủ nhật</p>
<p>&nbsp;&nbsp;&nbsp;+ Nghỉ hàng năm, nghỉ ngày Lễ: Ngày nghỉ lễ, Tết, ngày nghỉ hưởng nguyên lương theo quy định của Bộ luật Lao động và theo quy chế của Công ty.</p>
<p>- Chế độ đào tạo: Theo quy định của Công ty;</p>
<p>- Được đơn phương chấm dứt Hợp đồng theo quy định của pháp luật và nội quy Công ty.</p>
<p>- Các quyền khác theo quy định của pháp luật hiện hành.</p>
<p class="bold">3.2. Nghĩa vụ của Người lao động</p>
<p>a) Thực hiện công việc với hiệu quả cao theo phân công, điều hành của người có thẩm quyền;</p>
<p>b) Hoàn thành công việc được giao và sẵn sàng chấp nhận mọi sự điều động khi có yêu cầu;</p>
<p>c) Nắm rõ và chấp hành nghiêm túc kỷ luật lao động, an toàn lao động, vệ sinh lao động, phòng cháy chữa cháy, văn hóa công ty, nội quy lao động và các chủ trương, chính sách của Công ty;</p>
<p>d) Bồi thường thiệt hại theo quy chế, nội quy của Công ty và pháp luật Nhà nước quy định;</p>
<p>e) Tham dự đầy đủ, nhiệt tình các buổi huấn luyện, đào tạo, hội thảo do Bộ phận hoặc Công ty tổ chức;</p>
<p>f) Thực hiện đúng cam kết trong hợp đồng lao động và các thỏa thuận bằng văn bản khác với Công ty;</p>
<p>g) Thực hiện nghĩa vụ thuế và các khoản phải đóng theo quy định của pháp luật.</p>

<h2>Điều 4. Quyền và nghĩa vụ của Người sử dụng lao động</h2>
<p class="bold">4.1. Quyền của Người sử dụng lao động</p>
<p>a) Điều hành Người lao động hoàn thành công việc theo Hợp đồng (bố trí, điều chuyển công việc cho Người lao động theo đúng chức năng chuyên môn);</p>
<p>b) Có quyền tạm thời chuyển Người lao động sang làm công việc khác so với hợp đồng, ban hành và yêu cầu tuân thủ nội quy lao động; khen thưởng, tạm hoãn, chấm dứt hợp đồng lao động, xử lý kỷ luật lao động theo quy định pháp luật và theo nội quy lao động;</p>
<p>c) Có quyền áp dụng các hình thức xử lý kỷ luật lao động, yêu cầu bồi thường thiệt hại đối với Người lao động theo quy chế công ty và phù hợp quy định pháp luật;</p>
<p>d) Thực hiện các hành động, biện pháp nhằm ngăn chặn, hạn chế tối thiểu những rủi ro, thiệt hại từ các hành vi vi phạm gây thiệt hại của Người lao động đến quyền lợi chính đáng của Người sử dụng lao động trong phạm vi quyền hạn và quy định pháp luật.</p>
<p class="bold">4.2. Nghĩa vụ của Người sử dụng lao động</p>
<p>a) Thực hiện đầy đủ những cam kết trong Hợp đồng lao động;</p>
<p>b) Bảo đảm điều kiện làm việc, an toàn vệ sinh lao động, tôn trọng danh dự, nhân phẩm của Người lao động;</p>
<p>c) Thanh toán đầy đủ, đúng thời hạn các chế độ và quyền lợi cho Người lao động.</p>

<h2>Điều 5. Bảo vệ bí mật kinh doanh, bí mật công nghệ, dữ liệu và tài sản</h2>
<p>5.1. Người lao động có nghĩa vụ bảo mật bí mật kinh doanh, bí mật công nghệ, dữ liệu cá nhân và thông tin nội bộ của Người sử dụng lao động mà Người lao động biết được trong quá trình làm việc theo quy định pháp luật và Cam kết bảo mật thông tin ký kèm Hợp đồng này.</p>
<p>5.2. Trong thời gian làm việc tại Công ty và sau khi chấm dứt quan hệ lao động dưới bất kỳ lý do và hình thức nào, Người lao động có trách nhiệm giữ bí mật và không được trực tiếp hoặc gián tiếp tiết lộ, cung cấp, chuyển giao hoặc để bên thứ ba không có thẩm quyền tiếp cận các thông tin bí mật của Công ty (bao gồm nhưng không giới hạn: bí mật về công nghệ/ sản phẩm/ tài chính, bí mật kinh doanh, thông tin khách hàng...) trừ trường hợp được Ban Giám đốc Công ty chấp thuận trước bằng văn bản hoặc theo yêu cầu của cơ quan nhà nước có thẩm quyền theo quy định của pháp luật.</p>
<p>5.3. Quyền sở hữu trí tuệ đối với sản phẩm, kết quả công việc do Người lao động tạo ra trong phạm vi nhiệm vụ được giao hoặc sử dụng nguồn lực của Người sử dụng lao động thuộc về Người sử dụng lao động, trừ trường hợp pháp luật quy định hoặc hai Bên có thỏa thuận khác.</p>
<p>5.4. Người lao động vi phạm nghĩa vụ bảo mật phải bồi thường theo thỏa thuận và quy định pháp luật; việc xử lý bồi thường thực hiện theo trình tự pháp luật.</p>

<h2>Điều 6. Thu thập và xử lý dữ liệu cá nhân</h2>
<p>6.1. Người lao động đồng ý để Người sử dụng lao động thu thập, lưu trữ và xử lý dữ liệu cá nhân do Người lao động cung cấp nhằm phục vụ việc giao kết, thực hiện Hợp đồng, thanh toán thù lao, khấu trừ, kê khai, quyết toán thuế và thực hiện các nghĩa vụ theo quy định của pháp luật.</p>
<p>6.2. Người lao động có trách nhiệm cung cấp đầy đủ, chính xác các thông tin, tài liệu cần thiết (bao gồm nhưng không giới hạn: căn cước công dân, mã số thuế, thông tin tài khoản ngân hàng và các thông tin khác theo yêu cầu hợp lý của Người sử dụng lao động) và kịp thời thông báo khi có thay đổi.</p>
<p>6.3. Người sử dụng lao động cam kết bảo mật và xử lý dữ liệu cá nhân của Người lao động theo quy định của pháp luật về bảo vệ dữ liệu cá nhân.</p>
<p>6.4. Khi Hợp đồng chấm dứt hoặc hết hiệu lực, Người sử dụng lao động chấm dứt việc xử lý dữ liệu cá nhân của Người lao động, trừ trường hợp pháp luật có quy định khác hoặc việc tiếp tục lưu trữ, xử lý dữ liệu là cần thiết để thực hiện nghĩa vụ pháp lý hoặc bảo vệ quyền, lợi ích hợp pháp của Người sử dụng lao động. Việc lưu trữ, xử lý dữ liệu cá nhân sau khi Hợp đồng chấm dứt chỉ được thực hiện trong phạm vi cần thiết để thực hiện nghĩa vụ pháp lý hoặc bảo vệ quyền, lợi ích hợp pháp của Người sử dụng lao động.</p>

<h2>Điều 7. Đơn phương chấm dứt hợp đồng lao động</h2>
<p>7.1. Người lao động có quyền đơn phương chấm dứt Hợp đồng lao động theo quy định pháp luật.</p>
<p>7.2. Người sử dụng lao động có quyền đơn phương chấm dứt hợp đồng lao động trong các trường hợp sau:</p>
<p>a) Người lao động thường xuyên không hoàn thành công việc theo hợp đồng lao động được xác định theo tiêu chí đánh giá mức độ hoàn thành công việc trong quy chế của Người sử dụng lao động;</p>
<p>b) Người lao động bị ốm đau, tai nạn đã điều trị 12 tháng liên tục đối với người làm việc theo hợp đồng lao động không xác định thời hạn hoặc đã điều trị 06 tháng liên tục đối với người làm việc theo hợp đồng lao động xác định thời hạn có thời hạn từ 12 tháng đến 36 tháng hoặc quá nửa thời hạn hợp đồng lao động đối với người làm việc theo hợp đồng lao động xác định thời hạn có thời hạn dưới 12 tháng mà khả năng lao động chưa hồi phục.</p>
<p>c) Do thiên tai, hỏa hoạn, dịch bệnh nguy hiểm, địch họa hoặc di dời, thu hẹp sản xuất, kinh doanh theo yêu cầu của cơ quan nhà nước có thẩm quyền mà Người sử dụng lao động đã tìm mọi biện pháp khắc phục nhưng vẫn buộc phải giảm chỗ làm việc;</p>
<p>d) Người lao động không có mặt tại nơi làm việc sau thời hạn tạm hoãn thực hiện Hợp đồng lao động theo quy định của pháp luật;</p>
<p>đ) Người lao động đủ tuổi nghỉ hưu theo quy định của pháp luật, trừ trường hợp các bên có thỏa thuận khác;</p>
<p>e) Người lao động tự ý bỏ việc mà không có lý do chính đáng từ 05 ngày làm việc liên tục trở lên;</p>
<p>g) Người lao động cung cấp không trung thực thông tin khi giao kết hợp đồng lao động làm ảnh hưởng đến việc tuyển dụng.</p>

<h2>Điều 8. Điều khoản chung</h2>
<p>8.1. Các trường hợp, trình tự, thủ tục chấm dứt Hợp đồng lao động được thực hiện theo quy định của Bộ luật Lao động và các văn bản hướng dẫn thi hành.</p>
<p>8.2. Trong quá trình thực hiện hợp đồng nếu một bên có nhu cầu thay đổi nội dung trong Hợp đồng phải báo cho bên còn lại trước ít nhất 03 ngày và ký kết Phụ lục Hợp đồng theo quy định của pháp luật. Trong thời gian tiến hành thỏa thuận hai Bên vẫn tuân theo Hợp đồng lao động đã ký kết.</p>
<p>8.3. Trường hợp phát sinh tranh chấp trong quá trình thực hiện hợp đồng hai Bên sẽ thương lượng và đàm phán trên tinh thần hợp tác và đảm bảo quyền lợi của cả hai Bên. Nếu tranh chấp không giải quyết được bằng thương lượng, hai Bên sẽ yêu cầu tòa án có thẩm quyền giải quyết. Phán quyết của Tòa án có tính chất bắt buộc đối với hai Bên.</p>

<h2>Điều 9. Điều khoản thi hành</h2>
<p>9.1. Hai Bên cam kết hoàn toàn tự nguyện khi ký kết và thực hiện nghiêm túc Hợp đồng lao động này. Mọi sự thay đổi, bổ sung chỉ có giá trị khi được sự đồng ý bằng văn bản của cả hai Bên.</p>
<p>9.2. Những vấn đề về lao động không được quy định trong hợp đồng lao động này thì áp dụng quy định của Nội quy lao động, thỏa ước lao động tập thể, trường hợp thỏa ước lao động tập thể, nội quy lao động chưa có quy định thì áp dụng quy định của pháp luật lao động.</p>
<p>9.3. Các phụ lục, bản mô tả công việc, cam kết bảo mật thông tin ký kèm là bộ phận không thể tách rời của Hợp đồng.</p>
<p>9.4. Hợp đồng này được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản, có hiệu lực kể từ ngày ký./.</p>

<div class="signs">
  <div>
    <div class="bold">NGƯỜI SỬ DỤNG LAO ĐỘNG</div>
    <div class="note">(Ký và ghi rõ họ tên, đóng dấu)</div>
  </div>
  <div>
    <div class="bold">NGƯỜI LAO ĐỘNG</div>
    <div class="note">(Ký và ghi rõ họ tên)</div>
  </div>
</div>
</div>
`.trim();
