import { createContext, useContext } from "react";

/**
 * Id mà mọi tệp đính kèm trong form hồ sơ bám vào.
 *
 * Sửa hồ sơ: là id thật của nhân viên. Thêm mới: là id NHÁP sinh lúc mở form
 * — hồ sơ chưa tồn tại thì chưa có id thật để bám, mà HR vẫn cần đính ảnh
 * CCCD ngay lúc nhập. Sau khi lưu, `CrudHandler.createEmployee` gọi
 * `dinhKemService.gan()` để chuyển toàn bộ sang id thật.
 *
 * Chuỗi rỗng = chưa sẵn sàng (form chưa mở) — `DinhKemO` sẽ không gọi API.
 */
export const HoSoDinhKemContext = createContext<string>("");

export function useHoSoDinhKemId(): string {
  return useContext(HoSoDinhKemContext);
}
