import { TrangThai } from './trangThai';

export interface ViTriLayDuoc {
  latitude: number;
  longitude: number;
  doChinhXacMet?: number;
}

export class LoiViTri extends Error {
  constructor(public readonly trangThai: TrangThai) {
    super(trangThai);
    this.name = 'LoiViTri';
  }
}

/**
 * Lấy vị trí hiện tại.
 *
 * CẢNH BÁO khi chạy thử: navigator.geolocation CHỈ hoạt động trong secure
 * context (HTTPS hoặc localhost). Mở PWA trên điện thoại qua IP LAN
 * (http://192.168.x.x:8081) sẽ bị trình duyệt từ chối, và thông báo lỗi
 * của Chrome Android khá mơ hồ. Xem Task 15.
 *
 * Luôn ném LoiViTri (không phải Error thường) để nhánh bắt lỗi phía trên
 * phân biệt được lỗi định vị với lỗi API — hai loại này hiện hai màn hình
 * hoàn toàn khác nhau.
 */
export function layViTri(timeoutMs = 10000): Promise<ViTriLayDuoc> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new LoiViTri(TrangThai.LOI_VI_TRI));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          doChinhXacMet: pos.coords.accuracy,
        }),
      (err) =>
        reject(
          new LoiViTri(
            // So sánh với hằng của CHÍNH đối tượng lỗi, không hằng toàn cục:
            // GeolocationPositionError không phải lúc nào cũng có mặt như một
            // global (WebView cũ), nhưng thể hiện lỗi thì luôn mang các hằng.
            err.code === err.PERMISSION_DENIED
              ? TrangThai.TU_CHOI_VI_TRI
              : TrangThai.LOI_VI_TRI,
          ),
        ),
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        // Chấm công phải lấy vị trí HIỆN TẠI. Vị trí cache sẽ ghi nhận nhân
        // viên "ở văn phòng" bằng toạ độ của lần mở app trước đó.
        maximumAge: 0,
      },
    );
  });
}
