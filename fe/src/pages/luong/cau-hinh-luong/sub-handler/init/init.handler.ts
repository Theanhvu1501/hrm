import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { cauHinhLuongService } from "@/services/cauHinhLuongService";
import "./init.event";

@RegisterHandler("cau-hinh-luong-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("dangLuu", false);
    this.setState("dangTai", true);
    try {
      const cauHinh = await cauHinhLuongService.get();
      this.setState("cauHinh", cauHinh);
    } catch (error) {
      console.error("Tải cấu hình lương lỗi:", error);
      this.setState("cauHinh", null);
      message.error(
        apiErrorMessage(error, "Không thể tải cấu hình lương. Vui lòng thử lại.")
      );
    } finally {
      this.setState("dangTai", false);
    }
  }
}
