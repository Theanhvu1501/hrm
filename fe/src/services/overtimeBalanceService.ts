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

/**
 * Một dòng `overtime_balances` (quỹ giờ của MỘT kỳ tích) — dùng cho màn HR
 * `QuyGioPage` liệt kê mọi kỳ của một nhân viên, khác `SoDuQuyGio` (chỉ có số
 * dư tổng hợp, dùng cho form nộp hộ đơn nghỉ bù).
 */
export interface OvertimeBalanceRow {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  kyTich: string; // "YYYY-MM"
  soGioTich: number;
  soGioDaDung: number;
  soGioDangChoDuyet: number;
  soGioConLai: number;
  hanDung: string; // "YYYY-MM-DD"; '9999-12-31' = không hết hạn
  trangThai: string; // dang_hieu_luc|da_dong
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
   * Danh sách quỹ theo từng kỳ tích của một nhân viên — `GET /quy-gio?employeeId=`.
   * Đòi quyền `/cham-cong/quy-gio:xem`, dùng cho màn HR `QuyGioPage`.
   *
   * BE trả mảng RỖNG khi thiếu `employeeId` (không phải lỗi 400) — cố ý
   * KHÔNG gọi route này khi chưa chọn nhân viên, để tránh một lượt gọi vô
   * nghĩa mỗi lần màn hình mở.
   */
  async layTheoNhanVien(employeeId: string): Promise<OvertimeBalanceRow[]> {
    const res = await super.get<Array<Record<string, unknown>>>({
      params: { employeeId },
    });
    return res.map((x) => ({
      id: (x._id as string) || (x.id as string),
      employeeId: x.employeeId as string,
      employeeName: x.employeeName as string | undefined,
      employeeCode: x.employeeCode as string | undefined,
      kyTich: x.kyTich as string,
      // `??` chứ không `||`: 0 giờ là số hợp lệ, không phải "chưa tính".
      soGioTich: (x.soGioTich as number) ?? 0,
      soGioDaDung: (x.soGioDaDung as number) ?? 0,
      soGioDangChoDuyet: (x.soGioDangChoDuyet as number) ?? 0,
      soGioConLai: (x.soGioConLai as number) ?? 0,
      hanDung: x.hanDung as string,
      trangThai: (x.trangThai as string) ?? 'dang_hieu_luc',
    }));
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
