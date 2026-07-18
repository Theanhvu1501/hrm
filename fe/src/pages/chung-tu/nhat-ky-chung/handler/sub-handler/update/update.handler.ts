import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService, UpdateEntryDto } from "@/services/nhatKyChungService";
import { NhatKyChung } from "@/types";
import { message } from "antd";
import "./update.event";
import {
  NhatKyChungStates,
  NhatKyChungEvents,
} from "../../../handler/nhat-ky-chung.handler";

@RegisterHandler("nhat-ky-chung")
export class UpdateHandler extends CSubHanlder<
  NhatKyChungEvents,
  NhatKyChungStates
> {
  @HandlerDecorator("openEditModal")
  async openEditModal(params: { entry: NhatKyChung }): Promise<void> {
    const { entry } = params;

    // Check if entry is approved
    const entryWithStatus = entry as NhatKyChung & { trangThai?: string };
    if (entryWithStatus.trangThai === "DA_DUYET") {
      message.warning("Không thể sửa bút toán đã duyệt");
      return;
    }

    this.setState("editingEntry", entry);
    this.setState("formModalVisible", true);
    this.setState("masterDataLoading", true);
    
    try {
      await this.executeEvent("loadMasterData", {});

      // Compare master data after loading
      if (entry.danhMuc) {
        await this.executeEvent("compareMasterData", { danhMuc: entry.danhMuc });
      }
    } finally {
      this.setState("masterDataLoading", false);
    }
  }

  @HandlerDecorator("updateEntry")
  async updateEntry(params: {
    id: string;
    data: UpdateEntryDto;
  }): Promise<void> {
    this.setState("formLoading", true);
    try {
      await nhatKyChungService.update(params.id, params.data);
      message.success("Cập nhật bút toán thành công");
      this.setState("formModalVisible", false);
      this.setState("editingEntry", null);
      await this.executeEvent("clearMasterDataChanges", {});
      await this.executeEvent("refresh", {});
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Có lỗi xảy ra khi cập nhật bút toán");
    } finally {
      this.setState("formLoading", false);
    }
  }
}
