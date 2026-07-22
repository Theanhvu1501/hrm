/**
 * Định danh thiết bị dùng cho ràng buộc "1 nhân viên = 1 máy".
 *
 * Mọi nơi khác CHỈ được gọi getDeviceId() — không đọc thẳng localStorage.
 * Nhờ vậy khi bọc Capacitor, chỉ cần gọi setDeviceIdProvider() một lần
 * với provider đọc device ID cấp hệ điều hành là xong, không phải sửa
 * màn hình hay service nào.
 *
 * Lưu ý về độ bền: id này mất khi người dùng xoá dữ liệu trình duyệt, và
 * Safari giới hạn storage do script ghi ở mức 7 ngày không tương tác. Đó
 * là MA SÁT chứ không phải lỗ hổng — mất id thì bị khoá chờ HR duyệt lại,
 * tức chặt hơn chứ không lỏng hơn.
 */
export interface DeviceIdProvider {
  getDeviceId(): Promise<string>;
}

export const KHOA_LUU_TRU = 'nhan-su.deviceId';

function sinhId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Dự phòng cho môi trường không có crypto.randomUUID.
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Khi localStorage bị chặn (chế độ riêng tư), id sinh ra không lưu được và
// mỗi lần gọi getDeviceId() sẽ sinh một id khác — check-in rồi check-out
// trong cùng phiên gửi hai deviceId khác nhau, khiến backend coi mỗi lần
// gọi là một thiết bị lạ và tạo thêm một dòng chờ HR duyệt. Nhớ tạm id
// trong biến module để cùng một phiên trang luôn trả cùng một giá trị,
// kể cả khi không ghi được localStorage.
let idPhienTamThoi: string | null = null;

const providerWeb: DeviceIdProvider = {
  async getDeviceId(): Promise<string> {
    let id: string | null = null;
    try {
      id = localStorage.getItem(KHOA_LUU_TRU);
    } catch {
      // Chế độ riêng tư có thể chặn đọc — rơi xuống nhánh sinh mới.
    }

    if (id) return id;

    if (idPhienTamThoi) return idPhienTamThoi;

    const moi = sinhId();
    try {
      localStorage.setItem(KHOA_LUU_TRU, moi);
    } catch {
      // Không lưu được thì vẫn trả id cho phiên hiện tại; nhớ tạm trong biến
      // module để các lần gọi tiếp theo trong cùng phiên trả cùng giá trị
      // thay vì sinh id mới mỗi lần. Chấp nhận mất id khi tải lại trang.
      idPhienTamThoi = moi;
    }
    return moi;
  },
};

let provider: DeviceIdProvider = providerWeb;

export function setDeviceIdProvider(p: DeviceIdProvider): void {
  provider = p;
}

export function getDeviceId(): Promise<string> {
  return provider.getDeviceId();
}

/** Chỉ dùng trong test. */
export function __resetProviderChoTest(): void {
  provider = providerWeb;
  idPhienTamThoi = null;
}
