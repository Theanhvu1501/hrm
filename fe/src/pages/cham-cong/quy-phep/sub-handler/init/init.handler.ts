import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { leaveBalanceService } from "@/services/leaveBalanceService";
import { homNayVN } from "@/ultils/thoiGianVN";
import "./init.event";

@RegisterHandler("quy-phep-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("dangTai", false);
    this.setState("danhSach", []);
    // homNayVN() (múi giờ Asia/Ho_Chi_Minh cố định) chứ không dùng
    // new Date().getFullYear() — máy người xem ở múi giờ khác có thể lệch năm.
    this.setState("namLoc", Number(homNayVN().slice(0, 4)));
    await this.taiDanhSach();
  }

  @HandlerDecorator("taiLai")
  async taiLai(): Promise<void> {
    await this.taiDanhSach();
  }

  @HandlerDecorator("doiNamLoc")
  doiNamLoc(params: { nam: number }): void {
    this.setState("namLoc", params.nam);
  }

  private async taiDanhSach(): Promise<void> {
    this.setState("dangTai", true);
    try {
      const danhSach = await leaveBalanceService.getList();
      this.setState("danhSach", danhSach);
    } catch (error) {
      console.error("Tải danh sách quỹ phép lỗi:", error);
      this.setState("danhSach", []);
      message.error(
        apiErrorMessage(error, "Không thể tải danh sách quỹ phép. Vui lòng thử lại.")
      );
    } finally {
      this.setState("dangTai", false);
    }
  }
}
