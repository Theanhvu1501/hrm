import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import { apiErrorMessage } from "@/config/api";
import { timesheetService } from "@/services/timesheetService";
import type {
  Timesheet,
  UpdateTimesheetDto,
} from "@/services/timesheetService";
import "./crud.event";

@RegisterHandler("bang-cong-context")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("generateBangCong")
  async generateBangCong(params: { thang: string }): Promise<void> {
    this.setState("generating", true);
    try {
      const list = await timesheetService.generate(params.thang);
      this.setState("timesheetList", list);
      message.success("Tạo/cập nhật bảng công thành công!");
    } catch (error) {
      console.error("Generate bang cong error:", error);
      message.error(apiErrorMessage(error, "Không thể tạo bảng công"));
    } finally {
      this.setState("generating", false);
    }
  }

  @HandlerDecorator("updateRow")
  async updateRow(params: { id: string; dto: UpdateTimesheetDto }): Promise<void> {
    try {
      const updated = await timesheetService.update(params.id, params.dto);
      const currentList =
        (this.getState("timesheetList") as Timesheet[]) || [];
      const updatedList = currentList.map((item) =>
        item._id === params.id ? updated : item
      );
      this.setState("timesheetList", updatedList);
      message.success("Cập nhật bảng công thành công!");
    } catch (error) {
      console.error("Update bang cong error:", error);
      message.error(apiErrorMessage(error, "Không thể cập nhật bảng công"));
    }
  }

  @HandlerDecorator("finalizeBangCong")
  async finalizeBangCong(params: { thang: string }): Promise<void> {
    this.setState("finalizing", true);
    try {
      const list = await timesheetService.finalize(params.thang);
      this.setState("timesheetList", list);
      message.success("Chốt bảng công thành công!");
    } catch (error) {
      console.error("Finalize bang cong error:", error);
      message.error(apiErrorMessage(error, "Không thể chốt bảng công"));
    } finally {
      this.setState("finalizing", false);
    }
  }
}
