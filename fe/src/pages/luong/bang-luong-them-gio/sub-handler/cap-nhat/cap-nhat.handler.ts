import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import {
  bangLuongThemGioService,
  DongLuongThemGio,
} from "@/services/bangLuongThemGioService";
import "./cap-nhat.event";

@RegisterHandler("bang-luong-them-gio-context")
export class CapNhatHandler extends CSubHanlder {
  @HandlerDecorator("capNhatDong")
  async capNhatDong(params: {
    id: string;
    theoLoai?: Record<string, number>;
    gioNghiBu?: number;
  }): Promise<void> {
    const { id, ...dto } = params;
    try {
      const moi = await bangLuongThemGioService.capNhatDong(id, dto);
      // Thay ĐÚNG dòng vừa sửa thay vì tải lại cả kỳ: giữ nguyên vị trí cuộn
      // và không nuốt mất dòng khác kế toán đang sửa dở.
      const danhSach = this.getState("danhSach") as DongLuongThemGio[];
      this.setState(
        "danhSach",
        (danhSach ?? []).map((d) => (d.id === moi.id ? moi : d)),
      );
      message.success("Đã cập nhật dòng!");
    } catch (error) {
      console.error("Cập nhật dòng bảng lương thêm giờ lỗi:", error);
      message.error(apiErrorMessage(error, "Không thể cập nhật dòng"));
    }
  }
}
