import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { bangLuongService } from "@/services/bangLuongService";
import { tinhDaChot } from "../init/init.handler";
import "./chot.event";

@RegisterHandler("bang-luong-context")
export class ChotHandler extends CSubHanlder {
  @HandlerDecorator("chot")
  async chot(params: { thang: string }): Promise<void> {
    try {
      const danhSach = await bangLuongService.chot(params.thang);
      this.setState("danhSach", danhSach);
      this.setState("daChot", tinhDaChot(danhSach));
      message.success("Chốt kỳ lương thành công!");
    } catch (error) {
      console.error("Chốt kỳ lương lỗi:", error);
      message.error(apiErrorMessage(error, "Không thể chốt kỳ lương"));
    }
  }

  @HandlerDecorator("moLai")
  async moLai(params: { thang: string }): Promise<void> {
    try {
      const danhSach = await bangLuongService.moLai(params.thang);
      this.setState("danhSach", danhSach);
      this.setState("daChot", tinhDaChot(danhSach));
      message.success("Mở lại kỳ lương thành công!");
    } catch (error) {
      console.error("Mở lại kỳ lương lỗi:", error);
      message.error(apiErrorMessage(error, "Không thể mở lại kỳ lương"));
    }
  }
}
