import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import {
  attendanceRecordService,
  AttendanceRecordFilter,
} from "@/services/attendanceRecordService";
import { employeeService } from "@/services/employeeService";
import { homNayVN } from "@/ultils/thoiGianVN";
import "./init.event";

@RegisterHandler("ban-ghi-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("formVisible", false);
    this.setState("saving", false);

    const filter: AttendanceRecordFilter = {
      tuNgay: homNayVN(),
      denNgay: homNayVN(),
    };
    this.setState("filter", filter);

    // GET /nhan-vien chỉ có JwtGuard (mọi nhân viên đăng nhập đều đọc được
    // danh sách để chấm công/tra cứu của chính mình) nên lỗi ở đây hiếm khi
    // là lỗi quyền — không cần làm phiền người dùng bằng message, chỉ log.
    try {
      const employeeList = await employeeService.getList();
      this.setState("employeeList", employeeList);
    } catch (error) {
      console.error("Tải danh sách nhân viên lỗi:", error);
      this.setState("employeeList", []);
    }

    await this.taiDanhSach(filter);
  }

  @HandlerDecorator("timKiem")
  async timKiem(params: AttendanceRecordFilter): Promise<void> {
    this.setState("filter", params);
    await this.taiDanhSach(params);
  }

  /**
   * `GET /ban-ghi-cham-cong` chỉ mở cho ADMIN/SUPER_ADMIN (AdminGuard theo
   * `vaiTro`, không theo mảng quyền `/cham-cong/ban-ghi:xem`) — người có
   * quyền FE nhưng không đúng vaiTro sẽ nhận 403 từ BE. Phải hiện message
   * thật cho HR, không được lặng lẽ trả về danh sách rỗng.
   */
  private async taiDanhSach(filter: AttendanceRecordFilter): Promise<void> {
    this.setState("loading", true);
    try {
      const recordList = await attendanceRecordService.getList(filter);
      this.setState("recordList", recordList);
    } catch (error) {
      console.error("Tải bản ghi chấm công lỗi:", error);
      this.setState("recordList", []);
      message.error(
        apiErrorMessage(error, "Không thể tải danh sách bản ghi chấm công")
      );
    } finally {
      this.setState("loading", false);
    }
  }
}
