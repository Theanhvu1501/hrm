import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService } from "@/services/nhatKyChungService";
import { message } from "antd";
import "./delete-batch.event";
import "./delete-batch.state";
import {
  NhatKyChungStates,
  NhatKyChungEvents,
} from "../../nhat-ky-chung.handler";

@RegisterHandler("nhat-ky-chung")
export class DeleteBatchHandler extends CSubHanlder<
  NhatKyChungEvents,
  NhatKyChungStates
> {
  @HandlerDecorator("deleteBatch")
  async deleteBatch(params: { ids: string[] }): Promise<void> {
    if (!params.ids || params.ids.length === 0) return;

    this.setState("deletingBatch", true);
    try {
      const res = await nhatKyChungService.removeBatch(params.ids);
      const skippedMsg =
        res.skipped > 0 ? `, bỏ qua ${res.skipped} bút toán đã duyệt` : "";
      message.success(`Đã xóa ${res.deleted} bút toán${skippedMsg}`);
      this.setState("selectedEntryIds", []);
      await this.executeEvent("refresh", {});
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Có lỗi xảy ra khi xóa hàng loạt");
    } finally {
      this.setState("deletingBatch", false);
    }
  }
}
