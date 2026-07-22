import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import {
  attendanceRecordService,
  AttendanceRecordFilter,
  HrNhapChamCongDto,
} from "@/services/attendanceRecordService";
import "./nhapBu.event";

@RegisterHandler("ban-ghi-context")
export class NhapBuHandler extends CSubHanlder {
  @HandlerDecorator("openNhapBu")
  openNhapBu(): void {
    this.setState("formVisible", true);
  }

  @HandlerDecorator("closeNhapBu")
  closeNhapBu(): void {
    this.setState("formVisible", false);
  }

  @HandlerDecorator("luuNhapBu")
  async luuNhapBu(dto: HrNhapChamCongDto): Promise<void> {
    this.setState("saving", true);
    try {
      // `POST /hr-nhap` cũng chỉ mở cho ADMIN/SUPER_ADMIN (AdminGuard) và BE
      // còn từ chối thời điểm ở tương lai / ngày không có thật — cả hai loại
      // lỗi đều phải hiện nguyên văn cho HR, không phải "Nhập bù thất bại"
      // chung chung.
      await attendanceRecordService.hrNhap(dto);
      message.success("Đã nhập bù bản ghi chấm công");
      this.setState("formVisible", false);

      // Nạp lại theo đúng bộ lọc đang xem thay vì chèn thẳng bản ghi mới vào
      // đầu danh sách: bản ghi nhập bù luôn thuộc QUÁ KHỨ nên chèn ở đầu sẽ
      // phá vỡ thứ tự thoiDiem DESC mà BE trả về, và nếu ngoài phạm vi lọc
      // hiện tại (khác ngày/khác nhân viên) thì không nên hiện ra.
      const filter = (this.getState("filter") as AttendanceRecordFilter) ?? {};
      this.setState("loading", true);
      try {
        const recordList = await attendanceRecordService.getList(filter);
        this.setState("recordList", recordList);
      } catch (error) {
        console.error("Tải lại bản ghi chấm công sau khi nhập bù lỗi:", error);
        message.error(
          apiErrorMessage(error, "Không thể tải lại danh sách sau khi nhập bù")
        );
      } finally {
        this.setState("loading", false);
      }
    } catch (error) {
      console.error("Nhập bù lỗi:", error);
      message.error(apiErrorMessage(error, "Nhập bù thất bại"));
    } finally {
      this.setState("saving", false);
    }
  }
}
