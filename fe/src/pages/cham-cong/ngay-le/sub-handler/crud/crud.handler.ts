import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { holidayService } from "@/services/holidayService";
import type {
  CreateHolidayDto,
  Holiday,
  UpdateHolidayDto,
} from "@/services/holidayService";
import "./crud.event";

@RegisterHandler("ngay-le-context")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("openForm")
  openForm(params: { record?: Holiday }): void {
    this.setState("editingHoliday", params.record ?? null);
    this.setState("formVisible", true);
  }

  @HandlerDecorator("closeForm")
  closeForm(): void {
    this.setState("formVisible", false);
    this.setState("editingHoliday", null);
  }

  @HandlerDecorator("createHoliday")
  async createHoliday(dto: CreateHolidayDto): Promise<void> {
    this.setState("saving", true);
    try {
      const created = await holidayService.create(dto);
      // `nam` là do BE tự suy từ tuNgay — chỉ thêm vào danh sách đang xem nếu
      // ngày lễ mới thuộc đúng năm đang lọc.
      const nam = this.getState("nam") as number | undefined;
      if (nam === undefined || created.nam === nam) {
        const currentList = (this.getState("holidayList") as Holiday[]) || [];
        this.setState("holidayList", [...currentList, created]);
      }
      this.setState("formVisible", false);
      this.setState("editingHoliday", null);
      message.success("Thêm ngày lễ thành công!");
    } catch (error) {
      console.error("Create holiday error:", error);
      // BE từ chối khi denNgay < tuNgay — message tiếng Việt đó phải hiển thị
      // nguyên văn cho người dùng.
      message.error(apiErrorMessage(error, "Không thể thêm ngày lễ"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("updateHoliday")
  async updateHoliday(params: { id: string; dto: UpdateHolidayDto }): Promise<void> {
    this.setState("saving", true);
    try {
      const updated = await holidayService.update(params.id, params.dto);
      const nam = this.getState("nam") as number | undefined;
      const currentList = (this.getState("holidayList") as Holiday[]) || [];
      // Nếu sửa khiến ngày lễ đổi sang năm khác thì rơi ra khỏi danh sách
      // đang lọc theo năm hiện tại thay vì hiển thị dữ liệu sai năm.
      const stillInYear = nam === undefined || updated.nam === nam;
      const updatedList = stillInYear
        ? currentList.map((item) => (item.id === params.id ? updated : item))
        : currentList.filter((item) => item.id !== params.id);

      this.setState("holidayList", updatedList);
      this.setState("formVisible", false);
      this.setState("editingHoliday", null);
      message.success("Cập nhật ngày lễ thành công!");
    } catch (error) {
      console.error("Update holiday error:", error);
      message.error(apiErrorMessage(error, "Không thể cập nhật ngày lễ"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("removeHoliday")
  async removeHoliday(params: { id: string }): Promise<void> {
    try {
      await holidayService.remove(params.id);

      const currentList = (this.getState("holidayList") as Holiday[]) || [];
      const updatedList = currentList.filter((item) => item.id !== params.id);

      this.setState("holidayList", updatedList);
      message.success("Xoá ngày lễ thành công!");
    } catch (error) {
      console.error("Remove holiday error:", error);
      message.error(apiErrorMessage(error, "Không thể xoá ngày lễ"));
    }
  }
}
