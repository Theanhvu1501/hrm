import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { attendanceRequestService } from "@/services/attendanceRequestService";
import { thongDiepLoiDon } from "../../thongDiepLoi";
import "./huy.event";

@RegisterHandler("don-tu-cua-toi-context")
export class HuyHandler extends CSubHanlder {
  @HandlerDecorator("huyDon")
  async huyDon(params: { id: string }): Promise<void> {
    if (this.getState("dangHuyId")) return;

    this.setState("dangHuyId", params.id);
    this.setState("loiHuy", "");

    try {
      await attendanceRequestService.huyDonCuaToi(params.id);
      await this.executeEvent("init", {});
    } catch (error) {
      console.error("Huỷ đơn lỗi:", error);
      // Backend còn có luật riêng ở đây (DON_DA_XU_LY_KHONG_THE_HUY khi đơn
      // vừa được duyệt xong ở tab khác) — câu của backend nói đúng chuyện đó,
      // FE không đoán lại.
      this.setState(
        "loiHuy",
        thongDiepLoiDon(error, "Không huỷ được đơn. Vui lòng thử lại.")
      );
    } finally {
      this.setState("dangHuyId", null);
    }
  }
}
