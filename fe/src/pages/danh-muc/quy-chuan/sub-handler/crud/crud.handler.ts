import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { quyChauanService, CreateQuyChaunDto, UpdateQuyChaunDto } from "@/services/quyChaunService";
import { QuyChuan } from "@/types";
import { message } from "antd";
import "./crud.event";

@RegisterHandler("quy-chuan-context")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("create")
  async create(data: CreateQuyChaunDto): Promise<QuyChuan> {
    this.setState("formLoading", true);
    try {
      const result = await quyChauanService.create(data);
      message.success("Thêm quy chuẩn thành công");
      this.executeEvent("closeModal", {});
      this.executeEvent("refresh", {});
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi khi thêm quy chuẩn";
      message.error(errorMessage);
      throw error;
    } finally {
      this.setState("formLoading", false);
    }
  }

  @HandlerDecorator("update")
  async update(params: { id: string; data: UpdateQuyChaunDto }): Promise<QuyChuan> {
    this.setState("formLoading", true);
    try {
      const result = await quyChauanService.update(params.id, params.data);
      message.success("Cập nhật quy chuẩn thành công");
      this.executeEvent("closeModal", {});
      this.executeEvent("refresh", {});
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi khi cập nhật quy chuẩn";
      message.error(errorMessage);
      throw error;
    } finally {
      this.setState("formLoading", false);
    }
  }

  @HandlerDecorator("deleteQuyChuan")
  async deleteQuyChuan(params: { id: string }): Promise<void> {
    try {
      await quyChauanService.remove(params.id);
      message.success("Xóa quy chuẩn thành công");
      this.executeEvent("refresh", {});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi khi xóa quy chuẩn";
      message.error(errorMessage);
      throw error;
    }
  }

  @HandlerDecorator("openModal")
  async openModal(params: { record?: QuyChuan }): Promise<void> {
    this.setState("editingRecord", params.record || null);
    this.setState("modalVisible", true);
  }

  @HandlerDecorator("closeModal")
  async closeModal(): Promise<void> {
    this.setState("modalVisible", false);
    this.setState("editingRecord", null);
    this.setState("formLoading", false);
  }
}
