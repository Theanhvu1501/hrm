import { BaseEvents } from "@/common";
import type { HinhThucLam } from "@/services/attendanceRecordService";

export interface ChamEvent extends BaseEvents {
  /**
   * Một cú chấm công. `tenThietBi` chỉ có mặt khi nhân viên tự đặt tên máy ở
   * màn hình "thiết bị chưa được phép"; các lần khác handler tự điền tên suy
   * từ user agent.
   */
  cham: {
    params: { tenThietBi?: string; hinhThucLam?: HinhThucLam };
    result: void;
  };
}

declare module "../../chamCongCuaToiHandler" {
  interface ChamCongCuaToiEvents extends ChamEvent {}
}
