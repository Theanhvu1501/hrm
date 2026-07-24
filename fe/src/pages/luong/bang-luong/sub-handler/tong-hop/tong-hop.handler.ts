import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { bangLuongService } from "@/services/bangLuongService";
import { tinhDaChot } from "../init/init.handler";
import "./tong-hop.event";

@RegisterHandler("bang-luong-context")
export class TongHopHandler extends CSubHanlder {
  @HandlerDecorator("tongHop")
  async tongHop(params: { thang: string }): Promise<void> {
    this.setState("dangTongHop", true);
    try {
      const danhSach = await bangLuongService.tongHop(params.thang);
      this.setState("danhSach", danhSach);
      this.setState("daChot", tinhDaChot(danhSach));
      message.success("Tổng hợp bảng lương thành công!");
    } catch (error) {
      console.error("Tổng hợp bảng lương lỗi:", error);
      message.error(apiErrorMessage(error, "Không thể tổng hợp bảng lương"));
    } finally {
      this.setState("dangTongHop", false);
    }
  }
}
