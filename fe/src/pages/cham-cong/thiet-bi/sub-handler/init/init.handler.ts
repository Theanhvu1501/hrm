import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { employeeDeviceService } from "@/services/employeeDeviceService";
import "./init.event";

@RegisterHandler("thiet-bi-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    // Đây là hàng đợi công việc, không phải danh mục tra cứu — mặc định mở
    // ở tab "Chờ duyệt", không phải tab/năm hiện tại như các màn hình danh mục.
    this.setState("tab", "cho_duyet");
    await this.taiDanhSach("cho_duyet");
  }

  @HandlerDecorator("doiTab")
  async doiTab(params: { trangThai: string }): Promise<void> {
    this.setState("tab", params.trangThai);
    await this.taiDanhSach(params.trangThai);
  }

  private async taiDanhSach(trangThai: string): Promise<void> {
    this.setState("loading", true);
    try {
      const deviceList = await employeeDeviceService.getList({ trangThai });
      this.setState("deviceList", deviceList);
    } catch (error) {
      console.error("Tải danh sách thiết bị lỗi:", error);
      this.setState("deviceList", []);
      message.error(
        apiErrorMessage(error, "Không thể tải danh sách thiết bị. Vui lòng thử lại.")
      );
    } finally {
      this.setState("loading", false);
    }
  }
}
