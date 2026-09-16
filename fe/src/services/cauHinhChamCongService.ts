import { ServiceBase } from './base/service-base';

/** Cấu hình chấm công mức công ty. Khớp `CauHinhChamCong` bên BE. */
export interface CauHinhChamCong {
  id?: string;
  /** 0=CN … 6=T7. */
  ngayLamViecTrongTuan: number[];
  /**
   * Cho phép nhân viên tự khai "làm từ xa" khi bấm chấm công (yêu cầu d16).
   * Bật lên là bỏ hàng rào đối chiếu địa điểm — xem cảnh báo trên màn cấu hình.
   */
  choPhepTuKhaiTuXa?: boolean;
}

class CauHinhChamCongService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/cau-hinh-cham-cong' });
  }

  async get(): Promise<CauHinhChamCong> {
    return super.get<CauHinhChamCong>();
  }

  /**
   * `forbidNonWhitelisted` ở `CapNhatCauHinhChamCongDto` chặn 400 nếu body có
   * field ngoài whitelist — mà object trong state đọc từ server còn kèm
   * `id`/`_id`/`tenantId`/`createdAt`/`updatedAt`/`isActive`. Lọc trước khi PUT.
   */
  async update(dto: Partial<CauHinhChamCong>): Promise<CauHinhChamCong> {
    const { id, _id, tenantId, createdAt, updatedAt, isActive, ...payload } =
      dto as Record<string, unknown>;
    return super.put<CauHinhChamCong>(payload);
  }
}

export const cauHinhChamCongService = new CauHinhChamCongService();
