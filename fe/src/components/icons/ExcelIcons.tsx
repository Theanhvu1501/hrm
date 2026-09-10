/**
 * Icon Excel màu cho nút Import / Xuất.
 *
 * Bố cục: tờ tài liệu dồn sang PHẢI, mũi tên đứng hẳn bên TRÁI — không chồng
 * lên nhau. Bản vẽ đầu tiên đặt mũi tên đè lên thân tài liệu và ở 16px (cỡ thật
 * trên nút) hai hình dính thành một cục không đọc ra gì.
 *
 * Thân tờ tài liệu dùng `currentColor` để theo được màu chữ của nút và chế độ
 * tối; ô bảng tính giữ xanh Excel để nhận ra ngay đây là file Excel.
 */
// Một tông xanh duy nhất, chọn đủ sáng để còn đọc được cả trên nền trắng lẫn
// trên nút nền đậm / chế độ tối. Tông đậm hơn (#1D7044) chìm hẳn vào nút primary.
const XANH_EXCEL = '#21A366';

interface IconProps {
  size?: number;
}

/** Tờ tài liệu + ô bảng tính, chiếm phần bên phải khung 24×24. */
function ThanTaiLieu() {
  return (
    <>
      <path
        d="M17 2.5h-4.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V6.5l-4.5-4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M17 2.5v2.6a1.6 1.6 0 0 0 1.6 1.6h2.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="12.6" y="11.5" width="8.2" height="7" rx="1" fill={XANH_EXCEL} />
      <path d="M12.6 15h8.2M16.7 11.5v7" stroke="#FFFFFF" strokeWidth="1.1" />
    </>
  );
}

/** Mũi tên đứng riêng bên trái, không chạm vào tờ tài liệu. */
function MuiTen({ vao }: { vao: boolean }) {
  return (
    <path
      d={vao ? 'M1.5 12h6.5M5.2 8.8 8.4 12l-3.2 3.2' : 'M8 12H1.5M4.8 8.8 1.6 12l3.2 3.2'}
      fill="none"
      stroke={XANH_EXCEL}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function IconNhapExcel({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <ThanTaiLieu />
      <MuiTen vao />
    </svg>
  );
}

export function IconXuatExcel({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <ThanTaiLieu />
      <MuiTen vao={false} />
    </svg>
  );
}
