import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { bangLuongThemGioService } from "@/services/bangLuongThemGioService";
import { tinhDaChot } from "../init/init.handler";
import "./chot.event";

/**
 * Backend trả `{ soDong }` chứ không trả danh sách (khác `bangLuongService`),
 * nên phải TẢI LẠI sau khi đổi trạng thái — nếu không, bảng vẫn hiện trạng
 * thái cũ và người dùng bấm chốt lần hai.
 */
@RegisterHandler("bang-luong-them-gio-context")
export class ChotHandler extends CSubHanlder {
  @HandlerDecorator("chot")
  async chot(params: { thang: string }): Promise<void> {
    try {
      const { soDong } = await bangLuongThemGioService.chot(params.thang);
      await this.taiLai(params.thang);
      message.success(`Đã chốt ${soDong} dòng bảng lương thêm giờ!`);
    } catch (error) {
      console.error("Chốt kỳ bảng lương thêm giờ lỗi:", error);
      message.error(apiErrorMessage(error, "Không thể chốt kỳ"));
    }
  }

  @HandlerDecorator("moLai")
  async moLai(params: { thang: string }): Promise<void> {
    try {
      const { soDong } = await bangLuongThemGioService.moLai(params.thang);
      await this.taiLai(params.thang);
      message.success(`Đã mở lại ${soDong} dòng!`);
    } catch (error) {
      console.error("Mở lại kỳ bảng lương thêm giờ lỗi:", error);
      message.error(apiErrorMessage(error, "Không thể mở lại kỳ"));
    }
  }

  private async taiLai(thang: string): Promise<void> {
    const danhSach = await bangLuongThemGioService.danhSach(thang);
    this.setState("danhSach", danhSach);
    this.setState("daChot", tinhDaChot(danhSach));
  }
}
