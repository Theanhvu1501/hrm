/**
 * Chuẩn hoá địa chỉ IP lấy được ở tầng request trước khi đem đi đối chiếu
 * địa điểm `loai='wifi'`.
 *
 * Hai thứ làm việc so khớp chuỗi thô luôn trượt trong thực tế:
 *
 * 1. Express trả IPv4 dưới dạng IPv4-mapped IPv6 — `::ffff:113.161.20.5` —
 *    khi socket nghe trên IPv6 (mặc định trên phần lớn máy chủ).
 * 2. Sau gateway/proxy, `X-Forwarded-For` là chuỗi NHIỀU chặng
 *    `"113.161.20.5, 10.0.0.1"`, chặng đầu là client, các chặng sau là proxy.
 *
 * Không chuẩn hoá thì `ipWifi === ipAddress` không bao giờ đúng và mọi lần
 * chấm bằng wifi đều bị gắn cờ ngoài vùng.
 */

/** Đúng dạng IPv4 dotted-quad, mỗi octet 0–255. */
const RE_IPV4 =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

const RE_TIEN_TO_MAPPED = /^::ffff:/i;

/**
 * Trả về IP của chặng gần client nhất, đã bỏ tiền tố `::ffff:`.
 * Trả `undefined` khi không có gì dùng được — cố ý không trả chuỗi rỗng,
 * vì `ipWifi === ''` cũng là một kiểu khớp nhầm.
 *
 * IPv6 thật được giữ nguyên: chỉ cắt `::ffff:` khi phần còn lại đúng là một
 * IPv4 dotted-quad, nếu không `::ffff:7161:1405` sẽ bị cắt thành chuỗi vô
 * nghĩa `7161:1405`.
 */
export function chuanHoaIp(raw?: string | null): string | undefined {
  if (typeof raw !== 'string') return undefined;

  const changDau = raw.split(',')[0].trim();
  if (!changDau) return undefined;

  if (RE_TIEN_TO_MAPPED.test(changDau)) {
    const conLai = changDau.replace(RE_TIEN_TO_MAPPED, '');
    if (RE_IPV4.test(conLai)) return conLai;
  }

  return changDau;
}
