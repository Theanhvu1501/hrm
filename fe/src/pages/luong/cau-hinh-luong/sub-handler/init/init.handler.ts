import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import {
  cauHinhLuongService,
  chuanHoaLamThem,
} from "@/services/cauHinhLuongService";
import "./init.event";

@RegisterHandler("cau-hinh-luong-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("dangLuu", false);
    this.setState("dangTai", true);
    try {
      const cauHinh = await cauHinhLuongService.get();
      // Bồi các trường P4.2b còn thiếu NGAY khi vào state: công ty bật quỹ giờ
      // từ P4.2a có `lamThem` không có `uuTienLoai`, mà `LamThemEditor` gọi
      // `.map()` trên nó — repo không có ErrorBoundary nên đó là trắng TOÀN
      // trang. Bồi ở đây (chứ không riêng trong component) để giá trị bồi vào
      // cũng là giá trị được PUT lên khi bấm Lưu, thoả DTO backend.
      this.setState("cauHinh", {
        ...cauHinh,
        lamThem: chuanHoaLamThem(cauHinh.lamThem),
      });
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
