import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService } from "@/services/nhatKyChungService";
import { message } from "antd";
import "./delete.event";
import { NhatKyChungStates, NhatKyChungEvents } from "../../../handler/nhat-ky-chung.handler";

@RegisterHandler("nhat-ky-chung")
export class DeleteHandler extends CSubHanlder<NhatKyChungEvents, NhatKyChungStates> {
  @HandlerDecorator("deleteEntry")
  async deleteEntry(params: { id: string }): Promise<void> {
    try {
      await nhatKyChungService.remove(params.id);
      message.success("Xóa bút toán thành công");
      await this.executeEvent("refresh", {});
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Có lỗi xảy ra khi xóa bút toán");
    }
  }
}
