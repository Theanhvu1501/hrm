import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { cauHinhLuongService } from "@/services/cauHinhLuongService";
import type { CauHinhLuong } from "@/services/cauHinhLuongService";
import "./luu.event";

@RegisterHandler("cau-hinh-luong-context")
export class LuuHandler extends CSubHanlder {
  @HandlerDecorator("luu")
  async luu(params: { cauHinh: CauHinhLuong }): Promise<void> {
    this.setState("dangLuu", true);
    try {
      const updated = await cauHinhLuongService.update(params.cauHinh);
      this.setState("cauHinh", updated);
      message.success("Lưu cấu hình lương thành công!");
    } catch (error) {
      console.error("Lưu cấu hình lương lỗi:", error);
      message.error(apiErrorMessage(error, "Không thể lưu cấu hình lương"));
    } finally {
      this.setState("dangLuu", false);
    }
  }
}
