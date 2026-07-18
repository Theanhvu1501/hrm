import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import { apiErrorMessage } from "@/config/api";
import { resignationService } from "@/services/resignationService";
import type {
  CreateResignationDto,
  Resignation,
  UpdateResignationDto,
} from "@/services/resignationService";
import "./crud.event";

@RegisterHandler("thoi-viec-context")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("openForm")
  async openForm(params: { record?: Resignation }): Promise<void> {
    this.setState("editingResignation", params.record || null);
    this.setState("formVisible", true);
  }

  @HandlerDecorator("closeForm")
  async closeForm(): Promise<void> {
    this.setState("formVisible", false);
    this.setState("editingResignation", null);
  }

  @HandlerDecorator("createResignation")
  async createResignation(dto: CreateResignationDto): Promise<void> {
    this.setState("saving", true);
    try {
      const created = await resignationService.create(dto);
      const currentList = (this.getState("resignationList") as Resignation[]) || [];
      this.setState("resignationList", [...currentList, created]);
      this.setState("formVisible", false);
      this.setState("editingResignation", null);
      message.success("Tạo đơn thôi việc thành công!");
    } catch (error) {
      console.error("Create resignation error:", error);
      message.error(apiErrorMessage(error, "Không thể tạo đơn thôi việc"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("updateResignation")
  async updateResignation(params: {
    id: string;
    dto: UpdateResignationDto;
  }): Promise<void> {
    this.setState("saving", true);
    try {
      const updated = await resignationService.update(params.id, params.dto);
      const currentList = (this.getState("resignationList") as Resignation[]) || [];
      const updatedList = currentList.map((item) =>
        item.id === params.id ? updated : item
      );

      this.setState("resignationList", updatedList);
      this.setState("formVisible", false);
      this.setState("editingResignation", null);
      message.success("Cập nhật đơn thôi việc thành công!");
    } catch (error) {
      console.error("Update resignation error:", error);
      message.error(apiErrorMessage(error, "Không thể cập nhật đơn thôi việc"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("removeResignation")
  async removeResignation(params: { id: string }): Promise<void> {
    try {
      await resignationService.remove(params.id);

      const currentList = (this.getState("resignationList") as Resignation[]) || [];
      const updatedList = currentList.filter((item) => item.id !== params.id);

      this.setState("resignationList", updatedList);
      message.success("Xoá đơn thôi việc thành công!");
    } catch (error) {
      console.error("Remove resignation error:", error);
      message.error(apiErrorMessage(error, "Không thể xoá đơn thôi việc"));
    }
  }

  @HandlerDecorator("updateResignationStatus")
  async updateResignationStatus(params: {
    id: string;
    trangThai: string;
  }): Promise<void> {
    try {
      const updated = await resignationService.updateStatus(
        params.id,
        params.trangThai
      );

      const currentList = (this.getState("resignationList") as Resignation[]) || [];
      const updatedList = currentList.map((item) =>
        item.id === params.id ? updated : item
      );

      this.setState("resignationList", updatedList);
      message.success("Cập nhật trạng thái thành công!");
    } catch (error) {
      console.error("Update resignation status error:", error);
      message.error(apiErrorMessage(error, "Không thể cập nhật trạng thái"));
    }
  }
}
