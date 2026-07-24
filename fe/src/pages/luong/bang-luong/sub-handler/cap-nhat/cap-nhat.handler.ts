import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { bangLuongService, DongLuong } from "@/services/bangLuongService";
import type { CapNhatDongLuongDto } from "@/services/bangLuongService";
import "./cap-nhat.event";

@RegisterHandler("bang-luong-context")
export class CapNhatHandler extends CSubHanlder {
  @HandlerDecorator("capNhatDong")
  async capNhatDong(params: { id: string; dto: CapNhatDongLuongDto }): Promise<void> {
    try {
      const updated = await bangLuongService.capNhatDong(params.id, params.dto);
      const danhSach = (this.getState("danhSach") as DongLuong[]) || [];
      this.setState(
        "danhSach",
        danhSach.map((dong) => (dong.id === params.id ? updated : dong))
      );
      message.success("Cập nhật dòng lương thành công!");
    } catch (error) {
      console.error("Cập nhật dòng lương lỗi:", error);
      message.error(apiErrorMessage(error, "Không thể cập nhật dòng lương"));
    }
  }
}
