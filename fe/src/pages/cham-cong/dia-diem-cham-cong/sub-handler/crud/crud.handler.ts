import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import { apiErrorMessage } from "@/config/api";
import { attendanceLocationService } from "@/services/attendanceLocationService";
import type {
  AttendanceLocation,
  CreateAttendanceLocationDto,
  UpdateAttendanceLocationDto,
} from "@/services/attendanceLocationService";
import "./crud.event";

@RegisterHandler("dia-diem-cham-cong-context")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("openForm")
  async openForm(params: { record?: AttendanceLocation }): Promise<void> {
    this.setState("editingLocation", params.record || null);
    this.setState("formVisible", true);
  }

  @HandlerDecorator("closeForm")
  async closeForm(): Promise<void> {
    this.setState("formVisible", false);
    this.setState("editingLocation", null);
  }

  @HandlerDecorator("createLocation")
  async createLocation(dto: CreateAttendanceLocationDto): Promise<void> {
    this.setState("saving", true);
    try {
      const created = await attendanceLocationService.create(dto);
      const currentList =
        (this.getState("locationList") as AttendanceLocation[]) || [];
      this.setState("locationList", [...currentList, created]);
      this.setState("formVisible", false);
      this.setState("editingLocation", null);
      message.success("Thêm địa điểm chấm công thành công!");
    } catch (error) {
      console.error("Create attendance location error:", error);
      // BE validate theo loại (GPS thiếu toạ độ/bán kính, Wifi thiếu IP, QR
      // thiếu mã) — message tiếng Việt đó phải hiển thị nguyên văn.
      message.error(apiErrorMessage(error, "Không thể thêm địa điểm chấm công"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("updateLocation")
  async updateLocation(params: {
    id: string;
    dto: UpdateAttendanceLocationDto;
  }): Promise<void> {
    this.setState("saving", true);
    try {
      const updated = await attendanceLocationService.update(
        params.id,
        params.dto
      );
      const currentList =
        (this.getState("locationList") as AttendanceLocation[]) || [];
      const updatedList = currentList.map((item) =>
        item.id === params.id ? updated : item
      );

      this.setState("locationList", updatedList);
      this.setState("formVisible", false);
      this.setState("editingLocation", null);
      message.success("Cập nhật địa điểm chấm công thành công!");
    } catch (error) {
      console.error("Update attendance location error:", error);
      message.error(
        apiErrorMessage(error, "Không thể cập nhật địa điểm chấm công")
      );
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("removeLocation")
  async removeLocation(params: { id: string }): Promise<void> {
    try {
      await attendanceLocationService.remove(params.id);

      const currentList =
        (this.getState("locationList") as AttendanceLocation[]) || [];
      const updatedList = currentList.filter((item) => item.id !== params.id);

      this.setState("locationList", updatedList);
      message.success("Xoá địa điểm chấm công thành công!");
    } catch (error) {
      console.error("Remove attendance location error:", error);
      message.error(apiErrorMessage(error, "Không thể xoá địa điểm chấm công"));
    }
  }
}
