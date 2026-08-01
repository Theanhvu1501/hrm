import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { employeeService } from "@/services/employeeService";
import { overtimeBalanceService } from "@/services/overtimeBalanceService";
import "./init.event";

@RegisterHandler("quy-gio-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("dangTai", false);
    this.setState("danhSach", []);
    this.setState("employeeId", undefined);

    // GET /nhan-vien chỉ có JwtGuard (mọi nhân viên đăng nhập đều đọc được
    // để phục vụ ô chọn) nên lỗi ở đây hiếm khi là lỗi quyền — không cần
    // làm phiền người dùng bằng message, chỉ log, giống ban-ghi/init.handler.ts.
    try {
      const employeeList = await employeeService.getList();
      this.setState("employeeList", employeeList);
    } catch (error) {
      console.error("Tải danh sách nhân viên lỗi:", error);
      this.setState("employeeList", []);
    }
  }

  @HandlerDecorator("chonNhanVien")
  async chonNhanVien(params: { employeeId: string | undefined }): Promise<void> {
    this.setState("employeeId", params.employeeId);

    if (!params.employeeId) {
      // Chưa chọn ai — không gọi API, tránh một lượt gọi vô nghĩa mà BE
      // cũng chỉ trả mảng rỗng cho trường hợp này.
      this.setState("danhSach", []);
      return;
    }

    this.setState("dangTai", true);
    try {
      const danhSach = await overtimeBalanceService.layTheoNhanVien(
        params.employeeId
      );
      this.setState("danhSach", danhSach);
    } catch (error) {
      console.error("Tải quỹ giờ làm thêm lỗi:", error);
      this.setState("danhSach", []);
      message.error(
        apiErrorMessage(error, "Không thể tải quỹ giờ làm thêm. Vui lòng thử lại.")
      );
    } finally {
      this.setState("dangTai", false);
    }
  }
}
