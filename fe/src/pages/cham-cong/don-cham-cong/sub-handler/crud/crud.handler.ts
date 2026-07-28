import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import { apiErrorMessage } from "@/config/api";
import { attendanceRequestService } from "@/services/attendanceRequestService";
import type {
  AttendanceRequest,
  AttendanceRequestStatus,
  CreateAttendanceRequestDto,
  UpdateAttendanceRequestDto,
} from "@/services/attendanceRequestService";
// maLoiChamCong đọc `code` chung cho MỌI lỗi backend (không chỉ lỗi thiết
// bị) — định nghĩa ở attendanceRecordService.ts vì đó là module đầu tiên
// cần nó (Task 4), tái dùng ở đây thay vì chép lại logic bóc originalError.
import { maLoiChamCong } from "@/services/attendanceRecordService";
import { MA_LOI_QUY_PHEP } from "@/services/leaveBalanceService";
import "./crud.event";

/**
 * P3.8: đơn phép năm hết quỹ / NV chưa lên chính thức — đọc `code` (409),
 * KHÔNG so khớp chuỗi tiếng Việt, cùng quy ước MA_LOI_THIET_BI. Chỉ đổi câu
 * MẶC ĐỊNH khi backend lỡ không kèm message (không xảy ra trong thực tế vì
 * ConflictException luôn có message, nhưng vẫn phải có lối lùi rõ ràng thay
 * vì câu "Không thể tạo đơn chấm công" chung chung, sai bản chất lỗi).
 */
function macDinhTheoMaLoiQuyPhep(err: unknown, macDinhChung: string): string {
  const ma = maLoiChamCong(err);
  if (
    ma === MA_LOI_QUY_PHEP.CHUA_LEN_CHINH_THUC ||
    ma === MA_LOI_QUY_PHEP.KHONG_DU_SO_DU
  ) {
    return "Không tạo được đơn nghỉ phép năm";
  }
  return macDinhChung;
}

@RegisterHandler("don-cham-cong-context")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("openForm")
  async openForm(params: { record?: AttendanceRequest }): Promise<void> {
    this.setState("editingRequest", params.record || null);
    this.setState("formVisible", true);
  }

  @HandlerDecorator("closeForm")
  async closeForm(): Promise<void> {
    this.setState("formVisible", false);
    this.setState("editingRequest", null);
  }

  @HandlerDecorator("createRequest")
  async createRequest(dto: CreateAttendanceRequestDto): Promise<void> {
    this.setState("saving", true);
    try {
      const created = await attendanceRequestService.create(dto);
      const currentList =
        (this.getState("requestList") as AttendanceRequest[]) || [];
      this.setState("requestList", [...currentList, created]);
      this.setState("formVisible", false);
      this.setState("editingRequest", null);
      message.success("Tạo đơn chấm công thành công!");
    } catch (error) {
      console.error("Create attendance request error:", error);
      // BE ném NotFoundException khi employeeId không tồn tại — message tiếng
      // Việt đó phải hiển thị nguyên văn cho người dùng.
      message.error(
        apiErrorMessage(
          error,
          macDinhTheoMaLoiQuyPhep(error, "Không thể tạo đơn chấm công"),
        ),
      );
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("updateRequest")
  async updateRequest(params: {
    id: string;
    dto: UpdateAttendanceRequestDto;
  }): Promise<void> {
    this.setState("saving", true);
    try {
      const updated = await attendanceRequestService.update(
        params.id,
        params.dto
      );
      const currentList =
        (this.getState("requestList") as AttendanceRequest[]) || [];
      const updatedList = currentList.map((item) =>
        item.id === params.id ? updated : item
      );

      this.setState("requestList", updatedList);
      this.setState("formVisible", false);
      this.setState("editingRequest", null);
      message.success("Cập nhật đơn chấm công thành công!");
    } catch (error) {
      console.error("Update attendance request error:", error);
      message.error(
        apiErrorMessage(
          error,
          macDinhTheoMaLoiQuyPhep(error, "Không thể cập nhật đơn chấm công"),
        ),
      );
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("removeRequest")
  async removeRequest(params: { id: string }): Promise<void> {
    try {
      await attendanceRequestService.remove(params.id);

      const currentList =
        (this.getState("requestList") as AttendanceRequest[]) || [];
      const updatedList = currentList.filter((item) => item.id !== params.id);

      this.setState("requestList", updatedList);
      message.success("Xoá đơn chấm công thành công!");
    } catch (error) {
      console.error("Remove attendance request error:", error);
      message.error(apiErrorMessage(error, "Không thể xoá đơn chấm công"));
    }
  }

  @HandlerDecorator("updateRequestStatus")
  async updateRequestStatus(params: {
    id: string;
    trangThai: AttendanceRequestStatus;
    nguoiDuyet?: string;
  }): Promise<void> {
    try {
      const updated = await attendanceRequestService.updateStatus(
        params.id,
        params.trangThai,
        params.nguoiDuyet
      );

      const currentList =
        (this.getState("requestList") as AttendanceRequest[]) || [];
      const updatedList = currentList.map((item) =>
        item.id === params.id ? updated : item
      );

      this.setState("requestList", updatedList);
      message.success(
        params.trangThai === "da_duyet"
          ? "Duyệt đơn thành công!"
          : params.trangThai === "tu_choi"
            ? "Từ chối đơn thành công!"
            : "Cập nhật trạng thái thành công!"
      );
    } catch (error) {
      console.error("Update attendance request status error:", error);
      message.error(apiErrorMessage(error, "Không thể cập nhật trạng thái"));
    }
  }
}
