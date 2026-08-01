import { ServiceBase } from './base/service-base';

/**
 * P4.2a — quỹ giờ làm thêm (Task 9 dựng route, Task 10 dựng client FE).
 *
 * Ba route đọc, cùng cơ chế "cua-toi vs quản trị" như `leaveBalanceService`/
 * `attendanceRequestService`: `soDuCuaToi()` chỉ cần JwtGuard, employeeId
 * LUÔN suy từ token; `soDuCuaNhanVien()`/`layQuyTheoNhanVien()` đòi quyền
 * `/cham-cong/quy-gio:xem` (kiểm ở backend, FE không tự chặn ở đây).
 */
export interface SoDuQuyGioTheoKy {
  kyTich: string;
  hanDung: string;
  soGioConLai: number;
}

export interface SoDuQuyGio {
  soGioConLai: number;
  theoKy: SoDuQuyGioTheoKy[];
}

class OvertimeBalanceService extends ServiceBase {
  constructor() {
    super({ endpoint: '/config/quy-gio' });
  }

  /** Số dư của CHÍNH người đang đăng nhập — `GET /quy-gio/cua-toi/so-du`. */
  async soDuCuaToi(): Promise<SoDuQuyGio> {
    const res = await super.get<Record<string, unknown>>({
      endpoint: '/cua-toi/so-du',
    });
    return this.transform(res);
  }

  /**
   * Số dư của một nhân viên — `GET /quy-gio/:employeeId/so-du`. Đòi quyền
   * `/cham-cong/quy-gio:xem`, dùng cho form HR nộp hộ đơn nghỉ bù.
   */
  async soDuCuaNhanVien(employeeId: string): Promise<SoDuQuyGio> {
    const res = await super.get<Record<string, unknown>>({
      endpoint: `/${employeeId}/so-du`,
    });
    return this.transform(res);
  }

  private transform(x: Record<string, unknown>): SoDuQuyGio {
    return {
      // `??` chứ không `||`: 0 giờ còn lại là số dư hợp lệ, không phải "chưa
      // tính".
      soGioConLai: (x.soGioConLai as number) ?? 0,
      theoKy: ((x.theoKy as SoDuQuyGioTheoKy[] | undefined) ?? []).map((k) => ({
        kyTich: k.kyTich,
        hanDung: k.hanDung,
        soGioConLai: k.soGioConLai ?? 0,
      })),
    };
  }
}

export const overtimeBalanceService = new OvertimeBalanceService();
