import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import { apiErrorMessage } from "@/config/api";
import { laborContractService } from "@/services/laborContractService";
import type {
  CreateLaborContractDto,
  LaborContract,
  UpdateLaborContractDto,
} from "@/services/laborContractService";
import "./crud.event";

@RegisterHandler("hop-dong-lao-dong-context")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("openForm")
  async openForm(params: { record?: LaborContract }): Promise<void> {
    this.setState("editingContract", params.record || null);
    this.setState("formVisible", true);
  }

  @HandlerDecorator("closeForm")
  async closeForm(): Promise<void> {
    this.setState("formVisible", false);
    this.setState("editingContract", null);
  }

  @HandlerDecorator("createContract")
  async createContract(dto: CreateLaborContractDto): Promise<void> {
    this.setState("saving", true);
    try {
      const created = await laborContractService.create(dto);
      const currentList = (this.getState("contractList") as LaborContract[]) || [];
      this.setState("contractList", [...currentList, created]);
      this.setState("formVisible", false);
      this.setState("editingContract", null);
      message.success("Thêm hợp đồng thành công!");
    } catch (error) {
      console.error("Create labor contract error:", error);
      // BE ném ConflictException (409) khi nhân viên đã ký đủ 2 HĐ xác định
      // thời hạn — message tiếng Việt đó phải hiển thị nguyên văn cho người dùng.
      message.error(apiErrorMessage(error, "Không thể thêm hợp đồng"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("updateContract")
  async updateContract(params: {
    id: string;
    dto: UpdateLaborContractDto;
  }): Promise<void> {
    this.setState("saving", true);
    try {
      const updated = await laborContractService.update(params.id, params.dto);
      const currentList = (this.getState("contractList") as LaborContract[]) || [];
      const updatedList = currentList.map((item) =>
        item.id === params.id ? updated : item
      );

      this.setState("contractList", updatedList);
      this.setState("formVisible", false);
      this.setState("editingContract", null);
      message.success("Cập nhật hợp đồng thành công!");
    } catch (error) {
      console.error("Update labor contract error:", error);
      // Rule 2-lần-HĐ-xác-định-thời-hạn cũng được BE re-check khi sửa HĐ
      // (PUT) chuyển loại hợp đồng thành xác định thời hạn.
      message.error(apiErrorMessage(error, "Không thể cập nhật hợp đồng"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("removeContract")
  async removeContract(params: { id: string }): Promise<void> {
    try {
      await laborContractService.remove(params.id);

      const currentList = (this.getState("contractList") as LaborContract[]) || [];
      const updatedList = currentList.filter((item) => item.id !== params.id);

      this.setState("contractList", updatedList);
      message.success("Xoá hợp đồng thành công!");
    } catch (error) {
      console.error("Remove labor contract error:", error);
      message.error(apiErrorMessage(error, "Không thể xoá hợp đồng"));
    }
  }

  @HandlerDecorator("updateContractStatus")
  async updateContractStatus(params: {
    id: string;
    trangThai: string;
  }): Promise<void> {
    try {
      const updated = await laborContractService.updateStatus(
        params.id,
        params.trangThai
      );

      const currentList = (this.getState("contractList") as LaborContract[]) || [];
      const updatedList = currentList.map((item) =>
        item.id === params.id ? updated : item
      );

      this.setState("contractList", updatedList);
      message.success("Cập nhật trạng thái thành công!");
    } catch (error) {
      console.error("Update labor contract status error:", error);
      message.error(apiErrorMessage(error, "Không thể cập nhật trạng thái"));
    }
  }
}
