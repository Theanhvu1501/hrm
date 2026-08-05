import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { cauHinhChamCongService } from "@/services/cauHinhChamCongService";
import type { CauHinhChamCong } from "@/services/cauHinhChamCongService";
import "./luu.event";

@RegisterHandler("cau-hinh-cham-cong-context")
export class LuuHandler extends CSubHanlder {
  @HandlerDecorator("luu")
  async luu(params: { cauHinh: CauHinhChamCong }): Promise<void> {
    this.setState("dangLuu", true);
    try {
      const updated = await cauHinhChamCongService.update(params.cauHinh);
      this.setState("cauHinh", {
        ...updated,
        ngayLamViecTrongTuan: updated.ngayLamViecTrongTuan ?? [],
      });
      message.success("Lưu cấu hình chấm công thành công!");
    } catch (error) {
      console.error("Lưu cấu hình chấm công lỗi:", error);
      message.error(apiErrorMessage(error, "Không thể lưu cấu hình chấm công"));
    } finally {
      this.setState("dangLuu", false);
    }
  }
}
