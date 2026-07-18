import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService } from "@/services/nhatKyChungService";
import type { CreateEntryDto } from "@/services/nhatKyChungService";
import { message } from "antd";
import "./create.event";
import "./create.state";
import {
  NhatKyChungStates,
  NhatKyChungEvents,
} from "../../../handler/nhat-ky-chung.handler";

@RegisterHandler("nhat-ky-chung")
export class CreateHandler extends CSubHanlder<
  NhatKyChungEvents,
  NhatKyChungStates
> {
  @HandlerDecorator("openCreateModal")
  async openCreateModal(): Promise<void> {
    this.setState("editingEntry", null);
    this.setState("formModalVisible", true);
    await this.executeEvent("loadMasterData", {});
    await this.executeEvent("clearMasterDataChanges", {});
  }

  @HandlerDecorator("closeFormModal")
  async closeFormModal(): Promise<void> {
    this.setState("formModalVisible", false);
    this.setState("editingEntry", null);
    this.setState("formLoading", false);
    await this.executeEvent("clearMasterDataChanges", {});
  }

  @HandlerDecorator("createEntry")
  async createEntry(params: CreateEntryDto): Promise<void> {
    this.setState("formLoading", true);
    try {
      await nhatKyChungService.create(params);
      message.success("Tạo bút toán thành công");
      this.setState("formModalVisible", false);
      this.setState("editingEntry", null);
      await this.executeEvent("refresh", {});
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Có lỗi xảy ra khi tạo bút toán");
    } finally {
      this.setState("formLoading", false);
    }
  }
}
