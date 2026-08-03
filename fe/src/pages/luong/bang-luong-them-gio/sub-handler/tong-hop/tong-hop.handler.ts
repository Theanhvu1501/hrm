import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { bangLuongThemGioService } from "@/services/bangLuongThemGioService";
import { tinhDaChot } from "../init/init.handler";
import "./tong-hop.event";

@RegisterHandler("bang-luong-them-gio-context")
export class TongHopHandler extends CSubHanlder {
  @HandlerDecorator("tongHop")
  async tongHop(params: { thang: string }): Promise<void> {
    this.setState("dangTongHop", true);
    try {
      const danhSach = await bangLuongThemGioService.tongHop(params.thang);
      this.setState("danhSach", danhSach);
      this.setState("daChot", tinhDaChot(danhSach));
      if (danhSach.length === 0) {
        // Backend trả rỗng khi công ty CHƯA khai cấu hình làm thêm — báo đúng
        // lý do thay vì để người dùng nhìn bảng trống và tưởng mất dữ liệu.
        message.warning(
          "Chưa tổng hợp được: công ty chưa bật quỹ giờ làm thêm ở màn Cấu hình lương.",
        );
      } else {
        message.success("Tổng hợp bảng lương thêm giờ thành công!");
      }
    } catch (error) {
      console.error("Tổng hợp bảng lương thêm giờ lỗi:", error);
      message.error(apiErrorMessage(error, "Không thể tổng hợp bảng lương thêm giờ"));
    } finally {
      this.setState("dangTongHop", false);
    }
  }
}
