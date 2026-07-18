import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import { apiErrorMessage } from "@/config/api";
import { employmentHistoryService } from "@/services/employmentHistoryService";
import type {
  CreateEmploymentHistoryDto,
  EmploymentHistory,
  UpdateEmploymentHistoryDto,
} from "@/services/employmentHistoryService";
import { employeeService } from "@/services/employeeService";
import "./crud.event";

@RegisterHandler("qua-trinh-cong-tac-context")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("openForm")
  async openForm(params: { record?: EmploymentHistory }): Promise<void> {
    this.setState("editingHistory", params.record || null);
    this.setState("formVisible", true);
  }

  @HandlerDecorator("closeForm")
  async closeForm(): Promise<void> {
    this.setState("formVisible", false);
    this.setState("editingHistory", null);
  }

  @HandlerDecorator("createHistory")
  async createHistory(dto: CreateEmploymentHistoryDto): Promise<void> {
    this.setState("saving", true);
    try {
      const created = await employmentHistoryService.create(dto);
      const currentList = (this.getState("historyList") as EmploymentHistory[]) || [];
      this.setState("historyList", [created, ...currentList]);
      this.setState("formVisible", false);
      this.setState("editingHistory", null);
      message.success("Ghi nhận thay đổi thành công!");

      // Tạo bản ghi mới sẽ làm BE ghi đè phòng ban/chức danh/trạng thái hiện
      // tại của nhân viên — nạp lại employeeList để form hiển thị đúng giá
      // trị "hiện tại" cho lần ghi nhận tiếp theo.
      try {
        const employeeList = await employeeService.getList();
        this.setState("employeeList", employeeList);
      } catch (refreshError) {
        console.error("Refresh employee list error:", refreshError);
      }
    } catch (error) {
      console.error("Create employment history error:", error);
      message.error(apiErrorMessage(error, "Không thể ghi nhận thay đổi"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("updateHistory")
  async updateHistory(params: {
    id: string;
    dto: UpdateEmploymentHistoryDto;
  }): Promise<void> {
    this.setState("saving", true);
    try {
      const updated = await employmentHistoryService.update(params.id, params.dto);
      const currentList = (this.getState("historyList") as EmploymentHistory[]) || [];
      const updatedList = currentList.map((item) =>
        item.id === params.id ? updated : item
      );

      this.setState("historyList", updatedList);
      this.setState("formVisible", false);
      this.setState("editingHistory", null);
      message.success("Cập nhật quá trình công tác thành công!");
    } catch (error) {
      console.error("Update employment history error:", error);
      message.error(apiErrorMessage(error, "Không thể cập nhật quá trình công tác"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("removeHistory")
  async removeHistory(params: { id: string }): Promise<void> {
    try {
      await employmentHistoryService.remove(params.id);

      const currentList = (this.getState("historyList") as EmploymentHistory[]) || [];
      const updatedList = currentList.filter((item) => item.id !== params.id);

      this.setState("historyList", updatedList);
      message.success("Xoá quá trình công tác thành công!");
    } catch (error) {
      console.error("Remove employment history error:", error);
      message.error(apiErrorMessage(error, "Không thể xoá quá trình công tác"));
    }
  }
}
