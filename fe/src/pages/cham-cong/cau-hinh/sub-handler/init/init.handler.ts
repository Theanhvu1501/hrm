import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { cauHinhChamCongService } from "@/services/cauHinhChamCongService";
import "./init.event";

@RegisterHandler("cau-hinh-cham-cong-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("dangLuu", false);
    this.setState("dangTai", true);
    try {
      const cauHinh = await cauHinhChamCongService.get();
      // Bồi mảng rỗng ngay khi vào state: repo KHÔNG có ErrorBoundary, nên
      // một `.map()` trên undefined ở component là trắng TOÀN trang.
      this.setState("cauHinh", {
        ...cauHinh,
        ngayLamViecTrongTuan: cauHinh.ngayLamViecTrongTuan ?? [],
      });
    } catch (error) {
      console.error("Tải cấu hình chấm công lỗi:", error);
      this.setState("cauHinh", null);
      message.error(
        apiErrorMessage(error, "Không thể tải cấu hình chấm công. Vui lòng thử lại.")
      );
    } finally {
      this.setState("dangTai", false);
    }
  }
}
