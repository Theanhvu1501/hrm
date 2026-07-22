import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import { employeeDeviceService } from "@/services/employeeDeviceService";
import type { EmployeeDevice } from "@/services/employeeDeviceService";
import "./duyet.event";

@RegisterHandler("thiet-bi-context")
export class DuyetHandler extends CSubHanlder {
  @HandlerDecorator("duyetThietBi")
  async duyetThietBi(params: { id: string }): Promise<void> {
    try {
      await employeeDeviceService.duyet(params.id);
      // Đã duyệt -> dòng rời khỏi tab "Chờ duyệt" đang xem (chuyển sang
      // da_duyet). BE đã tự thu hồi máy da_duyet cũ khác (nếu có) của cùng
      // nhân viên trong CÙNG thao tác — không cần gọi thêm request nào.
      this.boKhoiDanhSachDangXem(params.id);
      message.success(
        "Đã duyệt thiết bị. Thiết bị cũ (nếu có) của nhân viên đã bị thu hồi."
      );
    } catch (error) {
      console.error("Duyệt thiết bị lỗi:", error);
      // BE chỉ chấp nhận duyệt dòng đang ở trạng thái cho_duyet; message cụ
      // thể đó (vd dòng đã bị duyệt/từ chối/thu hồi từ trước) phải hiển thị
      // nguyên văn, không phải "Duyệt thiết bị thất bại" chung chung.
      message.error(apiErrorMessage(error, "Duyệt thiết bị thất bại"));
      await this.taiLaiSauLoi();
    }
  }

  @HandlerDecorator("tuChoiThietBi")
  async tuChoiThietBi(params: { id: string }): Promise<void> {
    try {
      await employeeDeviceService.tuChoi(params.id);
      this.boKhoiDanhSachDangXem(params.id);
      message.success("Đã từ chối thiết bị");
    } catch (error) {
      console.error("Từ chối thiết bị lỗi:", error);
      message.error(apiErrorMessage(error, "Từ chối thiết bị thất bại"));
      await this.taiLaiSauLoi();
    }
  }

  @HandlerDecorator("thuHoiThietBi")
  async thuHoiThietBi(params: { id: string; lyDo?: string }): Promise<void> {
    try {
      await employeeDeviceService.thuHoi(params.id, params.lyDo);
      this.boKhoiDanhSachDangXem(params.id);
      message.success("Đã thu hồi thiết bị");
    } catch (error) {
      console.error("Thu hồi thiết bị lỗi:", error);
      message.error(apiErrorMessage(error, "Thu hồi thiết bị thất bại"));
      await this.taiLaiSauLoi();
    }
  }

  /**
   * Cả ba thao tác đều đưa dòng RA KHỎI tab đang xem (cho_duyet -> da_duyet
   * hoặc tu_choi; da_duyet -> thu_hoi) nên xoá khỏi danh sách cục bộ là đúng,
   * không phải cập nhật trạng thái tại chỗ — tránh hiện nhầm dòng đã đổi
   * trạng thái trong đúng tab đang lọc theo trạng thái cũ.
   */
  private boKhoiDanhSachDangXem(id: string): void {
    const currentList = (this.getState("deviceList") as EmployeeDevice[]) || [];
    this.setState(
      "deviceList",
      currentList.filter((item) => item.id !== id)
    );
  }

  /**
   * Thao tác thất bại (vd dòng vừa bị người khác duyệt/từ chối/thu hồi trước
   * đó) nghĩa là hiểu biết của FE về trạng thái dòng này đã cũ. Nạp lại đúng
   * tab đang xem để HR thấy trạng thái thật — nếu không, dòng vẫn hiện nút cũ
   * và bấm lại bao nhiêu lần cũng lỗi y hệt.
   */
  private async taiLaiSauLoi(): Promise<void> {
    const tab = (this.getState("tab") as string) || "cho_duyet";
    try {
      const deviceList = await employeeDeviceService.getList({
        trangThai: tab,
      });
      this.setState("deviceList", deviceList);
    } catch (error) {
      console.error("Tải lại danh sách thiết bị sau lỗi thao tác:", error);
    }
  }
}
