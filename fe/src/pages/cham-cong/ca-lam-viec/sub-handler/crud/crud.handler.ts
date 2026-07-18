import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import { apiErrorMessage } from "@/config/api";
import { workShiftService } from "@/services/workShiftService";
import type {
  CreateWorkShiftDto,
  UpdateWorkShiftDto,
  WorkShift,
} from "@/services/workShiftService";
import "./crud.event";

@RegisterHandler("ca-lam-viec-context")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("openForm")
  async openForm(params: { record?: WorkShift }): Promise<void> {
    this.setState("editingShift", params.record || null);
    this.setState("formVisible", true);
  }

  @HandlerDecorator("closeForm")
  async closeForm(): Promise<void> {
    this.setState("formVisible", false);
    this.setState("editingShift", null);
  }

  @HandlerDecorator("createShift")
  async createShift(dto: CreateWorkShiftDto): Promise<void> {
    this.setState("saving", true);
    try {
      const created = await workShiftService.create(dto);
      const currentList = (this.getState("shiftList") as WorkShift[]) || [];
      this.setState("shiftList", [...currentList, created]);
      this.setState("formVisible", false);
      this.setState("editingShift", null);
      message.success("Thêm ca làm việc thành công!");
    } catch (error) {
      console.error("Create work shift error:", error);
      // BE validate giờ HH:mm và cặp giờ nghỉ — message tiếng Việt đó phải
      // hiển thị nguyên văn cho người dùng.
      message.error(apiErrorMessage(error, "Không thể thêm ca làm việc"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("updateShift")
  async updateShift(params: {
    id: string;
    dto: UpdateWorkShiftDto;
  }): Promise<void> {
    this.setState("saving", true);
    try {
      const updated = await workShiftService.update(params.id, params.dto);
      const currentList = (this.getState("shiftList") as WorkShift[]) || [];
      const updatedList = currentList.map((item) =>
        item.id === params.id ? updated : item
      );

      this.setState("shiftList", updatedList);
      this.setState("formVisible", false);
      this.setState("editingShift", null);
      message.success("Cập nhật ca làm việc thành công!");
    } catch (error) {
      console.error("Update work shift error:", error);
      message.error(apiErrorMessage(error, "Không thể cập nhật ca làm việc"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("removeShift")
  async removeShift(params: { id: string }): Promise<void> {
    try {
      await workShiftService.remove(params.id);

      const currentList = (this.getState("shiftList") as WorkShift[]) || [];
      const updatedList = currentList.filter((item) => item.id !== params.id);

      this.setState("shiftList", updatedList);
      message.success("Xoá ca làm việc thành công!");
    } catch (error) {
      console.error("Remove work shift error:", error);
      message.error(apiErrorMessage(error, "Không thể xoá ca làm việc"));
    }
  }
}
