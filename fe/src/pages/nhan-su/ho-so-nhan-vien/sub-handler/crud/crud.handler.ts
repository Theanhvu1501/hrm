import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import { apiErrorMessage } from "@/config/api";
import { employeeService } from "@/services/employeeService";
import type {
  CreateEmployeeDto,
  Employee,
  UpdateEmployeeDto,
} from "@/services/employeeService";
import "./crud.event";

@RegisterHandler("ho-so-nhan-vien-context")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("openForm")
  async openForm(params: { record?: Employee }): Promise<void> {
    this.setState("editingEmployee", params.record || null);
    this.setState("formVisible", true);
  }

  @HandlerDecorator("closeForm")
  async closeForm(): Promise<void> {
    this.setState("formVisible", false);
    this.setState("editingEmployee", null);
  }

  @HandlerDecorator("createEmployee")
  async createEmployee(dto: CreateEmployeeDto): Promise<void> {
    this.setState("saving", true);
    try {
      const created = await employeeService.create(dto);
      const currentList = (this.getState("employeeList") as Employee[]) || [];
      this.setState("employeeList", [...currentList, created]);
      this.setState("formVisible", false);
      this.setState("editingEmployee", null);
      message.success("Thêm nhân viên thành công!");
    } catch (error) {
      console.error("Create employee error:", error);
      message.error(apiErrorMessage(error, "Không thể thêm nhân viên"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("updateEmployee")
  async updateEmployee(params: { id: string; dto: UpdateEmployeeDto }): Promise<void> {
    this.setState("saving", true);
    try {
      const updated = await employeeService.update(params.id, params.dto);
      const currentList = (this.getState("employeeList") as Employee[]) || [];
      const updatedList = currentList.map((item) =>
        item.id === params.id ? updated : item
      );

      this.setState("employeeList", updatedList);
      this.setState("formVisible", false);
      this.setState("editingEmployee", null);
      message.success("Cập nhật nhân viên thành công!");
    } catch (error) {
      console.error("Update employee error:", error);
      message.error(apiErrorMessage(error, "Không thể cập nhật nhân viên"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("removeEmployee")
  async removeEmployee(params: { id: string }): Promise<void> {
    try {
      await employeeService.remove(params.id);

      const currentList = (this.getState("employeeList") as Employee[]) || [];
      const updatedList = currentList.filter((item) => item.id !== params.id);

      this.setState("employeeList", updatedList);
      message.success("Xoá nhân viên thành công!");
    } catch (error) {
      console.error("Remove employee error:", error);
      message.error(apiErrorMessage(error, "Không thể xoá nhân viên"));
    }
  }

  @HandlerDecorator("updateEmployeeStatus")
  async updateEmployeeStatus(params: { id: string; trangThai: string }): Promise<void> {
    try {
      const updated = await employeeService.updateStatus(params.id, params.trangThai);

      const currentList = (this.getState("employeeList") as Employee[]) || [];
      const updatedList = currentList.map((item) =>
        item.id === params.id ? updated : item
      );

      this.setState("employeeList", updatedList);
      message.success("Cập nhật trạng thái thành công!");
    } catch (error) {
      console.error("Update employee status error:", error);
      message.error(apiErrorMessage(error, "Không thể cập nhật trạng thái"));
    }
  }
}
