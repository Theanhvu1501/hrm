import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import "./submit.event";
import { ImportEvents } from "../../import.handler";
import { ImportStates } from "../../import.state";
import { nhatKyChungService, CreateEntryDto } from "@/services/nhatKyChungService";

@RegisterHandler("nhat-ky-chung-import")
export class SubmitImportHandler extends CSubHanlder<ImportEvents, ImportStates> {
  @HandlerDecorator("submitImport")
  async submitImport(params: { onSuccess?: () => void }): Promise<void> {
    const hasErrors = this.getState("hasErrors") as boolean;
    const items = (this.getState("validItems") as CreateEntryDto[]) || [];
    if (hasErrors) {
      message.error("Còn dòng lỗi, vui lòng sửa file trước khi import");
      return;
    }
    if (items.length === 0) {
      message.warning("Không có dòng hợp lệ để import");
      return;
    }
    this.setState("submitting", true);
    try {
      const saved = await nhatKyChungService.importEntries(items);
      message.success(`Đã import ${saved.length} chứng từ`);
      this.setState("open", false);
      this.setState("parsed", false);
      this.setState("results", []);
      this.setState("validItems", []);
      this.setState("fileName", "");
      params.onSuccess?.();
    } catch (e) {
      const err = e as { message?: string };
      message.error(err.message || "Import thất bại");
    } finally {
      this.setState("submitting", false);
    }
  }
}
