import { ServiceBase } from './base/service-base';

/** Phòng ban do identity-service sở hữu. `path` = id tổ tiên, KHÔNG gồm chính nó. */
export interface PhongBan {
  id: string;
  maPhong: string;
  tenPhong: string;
  parentId: string | null;
  path: string[];
  thuTu: number;
}

class PhongBanService extends ServiceBase {
  constructor() {
    // Qua gateway: prefix /config bị strip trước khi tới config-service,
    // nơi PhongBanController đăng ký ở @Controller('phong-ban') — cùng khuôn
    // với attendanceLocationService ('/config/dia-diem-cham-cong') và
    // employeeService ('/config/nhan-vien').
    super({ endpoint: '/config/phong-ban' });
  }

  /**
   * ServiceBase.get() đã bóc { success, data } ở parseResponse() nên kết quả
   * ở đây là mảng thẳng, không phải { data: PhongBan[] }. Vẫn phòng hờ
   * undefined/null vì backend GET /phong-ban ném lỗi khi identity chết chứ
   * không cam kết luôn trả mảng.
   */
  async list(): Promise<PhongBan[]> {
    const res = await this.get<PhongBan[]>({});
    return res ?? [];
  }
}

export const phongBanService = new PhongBanService();
