import { ServiceBase, getAuthToken } from "./base/service-base";
import { API_CONFIG } from "@/config/api";

/** Loại hồ sơ chủ của tệp — phải khớp bảng `MAN_HINH` ở BE (dinh-kem.controller.ts). */
export type DoiTuongDinhKem =
  | "nhan_vien"
  | "hop_dong"
  | "qua_trinh_cong_tac"
  | "thoi_viec";

export interface DinhKem {
  _id: string;
  doiTuong: string;
  doiTuongId: string;
  nhom: string;
  khoaPhu?: string;
  tenFile: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface TimDinhKem {
  doiTuong: DoiTuongDinhKem;
  doiTuongId: string;
  nhom?: string;
  khoaPhu?: string;
}

class DinhKemService extends ServiceBase {
  constructor() {
    super({ endpoint: "/config/dinh-kem" });
  }

  danhSach(q: TimDinhKem): Promise<DinhKem[]> {
    return this.get<DinhKem[]>({ params: q });
  }

  tai(p: TimDinhKem & { nhom: string; file: File }): Promise<DinhKem> {
    const fd = new FormData();
    fd.append("file", p.file);
    fd.append("doiTuong", p.doiTuong);
    fd.append("doiTuongId", p.doiTuongId);
    fd.append("nhom", p.nhom);
    if (p.khoaPhu) fd.append("khoaPhu", p.khoaPhu);
    return this.post<DinhKem>(fd);
  }

  xoa(id: string): Promise<void> {
    return super.delete({ endpoint: `/${id}` });
  }

  /**
   * Chuyển đính kèm đã tải lên khi form còn ở chế độ THÊM (bám id nháp) sang
   * id thật của bản ghi vừa lưu.
   */
  gan(p: {
    doiTuong: DoiTuongDinhKem;
    tuId: string;
    sangId: string;
  }): Promise<{ soDong: number }> {
    return this.patch<{ soDong: number }>(p, { endpoint: "/gan" });
  }

  /**
   * Mở tệp trong tab mới. Phải qua fetch + objectURL chứ không gán thẳng
   * `window.open(url)`: route cần header `Authorization`, mà thẻ/tab mới
   * không gửi được header.
   *
   * Nơi gọi tự `URL.revokeObjectURL` khi không dùng nữa.
   */
  async lienKetXem(id: string): Promise<string> {
    const token = getAuthToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}/config/dinh-kem/${id}/tep`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Không tải được tệp");
    return URL.createObjectURL(await res.blob());
  }
}

export const dinhKemService = new DinhKemService();

/**
 * Id nháp cho hồ sơ CHƯA lưu. Đính kèm tải lên lúc này bám vào id nháp, sau
 * khi lưu xong gọi `dinhKemService.gan()` để chuyển sang id thật.
 *
 * `crypto.randomUUID` không có trên trình duyệt cũ và trên `http://` không
 * phải localhost (secure context) — có nhánh dự phòng để form không vỡ.
 */
export function idNhap(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return `nhap-${c.randomUUID()}`;
  return `nhap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
