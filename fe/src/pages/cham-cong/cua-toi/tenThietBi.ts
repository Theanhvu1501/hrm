/**
 * Tên gợi ý cho thiết bị, gửi kèm mọi lượt chấm công.
 *
 * VÌ SAO LUÔN GỬI, chứ không chỉ gửi khi người dùng tự đặt tên: backend
 * (kiemTraThietBi) tự tạo dòng `cho_duyet` NGAY ở lần chấm công đầu tiên
 * trên máy lạ, và chỉ ghi `tenThietBi` đúng lần tạo đó. Nếu lần đầu gửi
 * rỗng thì HR mở hàng chờ duyệt ra chỉ thấy một dòng trống với UUID — không
 * có cách nào biết đó là máy của ai.
 */

/** Tên hiện trong bảng hàng chờ của HR — cắt ngắn để không phá bố cục cột. */
export const DAI_NHAT_TEN_THIET_BI = 60;

const HE_DIEU_HANH: Array<[RegExp, string]> = [
  [/\biPhone\b/i, 'iPhone'],
  [/\biPad\b/i, 'iPad'],
  [/\bAndroid\b/i, 'Android'],
  [/\bWindows\b/i, 'Windows'],
  // Phải đứng SAU iPhone/iPad: UA của iOS chứa "like Mac OS X".
  [/\bMac OS X\b|\bMacintosh\b/i, 'macOS'],
  [/\bLinux\b/i, 'Linux'],
];

// Thứ tự có chủ đích: UA của Edge chứa cả "Chrome" lẫn "Safari", UA của
// Chrome chứa "Safari". Nhánh khớp trước thắng.
const TRINH_DUYET: Array<[RegExp, string]> = [
  [/\bEdgA?\/|\bEdge?\//i, 'Edge'],
  [/\bOPR\/|\bOpera\b/i, 'Opera'],
  [/\bCriOS\/|\bChrome\//i, 'Chrome'],
  [/\bFxiOS\/|\bFirefox\//i, 'Firefox'],
  [/\bSafari\//i, 'Safari'],
];

function khop(ua: string, bang: Array<[RegExp, string]>): string | undefined {
  for (const [re, ten] of bang) if (re.test(ua)) return ten;
  return undefined;
}

/**
 * Suy tên máy từ user agent. Cố ý thô: chỉ cần đủ để HR phân biệt được các
 * dòng trong hàng chờ, không phải để nhận dạng thiết bị chính xác.
 *
 * `userAgent` truyền vào được để test; mặc định đọc từ trình duyệt.
 */
export function tenThietBiMacDinh(
  userAgent: string | undefined = typeof navigator !== 'undefined'
    ? navigator.userAgent
    : undefined,
): string {
  const ua = (userAgent ?? '').trim();
  const os = khop(ua, HE_DIEU_HANH);
  const tr = khop(ua, TRINH_DUYET);

  const ten = os && tr ? `${os} · ${tr}` : (os ?? tr ?? 'Thiết bị không rõ');
  return ten.slice(0, DAI_NHAT_TEN_THIET_BI);
}

/** Chuẩn hoá tên do nhân viên tự nhập trước khi gửi lên backend. */
export function chuanHoaTenThietBi(ten: string): string {
  return ten.trim().slice(0, DAI_NHAT_TEN_THIET_BI);
}
