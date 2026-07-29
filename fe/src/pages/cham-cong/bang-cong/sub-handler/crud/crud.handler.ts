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
      // generate() giờ trả về tóm tắt (TomTatTongHop), KHÔNG còn là danh sách
      // Timesheet — không thể nhét thẳng vào dataSource nữa. Nạp lại lưới bằng
      // đường lấy danh sách sẵn có (giống init.handler) thay vì dùng giá trị trả về.
      const t = await timesheetService.generate(params.thang);
      await this.napLaiDanhSach(params.thang);
      // HR cần biết CÓ SỐ ngay trong thông báo — "thành công" chung chung
      // không nói còn bao nhiêu ô phải xử lý tay trước khi chốt được.
      const phan = [
        `Đã điền ${t.soODaDien} ô`,
        `còn ${t.soOTrong} ô trống`,
        `${t.soOCanhBao} ô cảnh báo`,
      ];
      if (t.soDongBoQuaVIChot > 0) {
        phan.push(`bỏ qua ${t.soDongBoQuaVIChot} dòng đã chốt`);
      }
      // NV bị soft-delete sau một lần Tổng hợp để lại dòng "mồ côi" —
      // generate() đã tự dọn về 0 ô trống (xem TomTatTongHop.soDongMoCoi ở
      // BE), nhưng HR vẫn cần biết CÓ chuyện đó xảy ra, không phải lặng lẽ.
      if (t.soDongMoCoi > 0) {
        phan.push(`dọn ${t.soDongMoCoi} dòng mồ côi (NV không còn hoạt động)`);
      }
      message.success(phan.join(" · "));
    } catch (error) {
      console.error("Generate bang cong error:", error);
      message.error(apiErrorMessage(error, "Không thể tổng hợp bảng công"));
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

  @HandlerDecorator("setDay")
  async setDay(params: {
    id: string;
    ngay: number;
    kyHieu: string;
    veTuDong?: boolean;
  }): Promise<void> {
    try {
      const updated = await timesheetService.setDay(params.id, {
        ngay: params.ngay,
        kyHieu: params.kyHieu,
        veTuDong: params.veTuDong,
      });
      const currentList =
        (this.getState("timesheetList") as Timesheet[]) || [];
      const updatedList = currentList.map((item) =>
        item._id === params.id ? updated : item
      );
      this.setState("timesheetList", updatedList);
    } catch (error) {
      console.error("Set day bang cong error:", error);
      // BE ném 409 BANG_CONG_DA_CHOT nếu dòng vừa bị chốt (vd ở tab khác)
      // trong lúc ô này đang mở để sửa — apiErrorMessage() đã lấy đúng câu
      // tiếng Việt backend soạn sẵn, không cần so khớp mã ở đây.
      message.error(apiErrorMessage(error, "Không thể cập nhật ngày công"));
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
      // BE chặn chốt bằng 409 CON_O_CHUA_XU_LY khi còn ô trống (phòng vệ ở
      // tầng backend — FE đã tự khoá nút này qua tomTatThang() rồi, nhưng
      // vẫn có thể lọt qua nếu dữ liệu đổi giữa lúc nút được tính và lúc
      // bấm). apiErrorMessage() lấy nguyên câu tiếng Việt backend đã soạn
      // sẵn (có kèm số ô, số nhân viên) — không cần và không được so khớp
      // chuỗi ở đây để tự chế câu khác.
      message.error(apiErrorMessage(error, "Không thể chốt bảng công"));
    } finally {
      this.setState("finalizing", false);
    }
  }

  @HandlerDecorator("moLaiBangCong")
  async moLaiBangCong(params: { thang: string }): Promise<void> {
    this.setState("reopening", true);
    try {
      const { soDong } = await timesheetService.moLai(params.thang);
      await this.napLaiDanhSach(params.thang);
      message.success(`Đã mở lại ${soDong} dòng để sửa`);
    } catch (error) {
      console.error("Mo lai bang cong error:", error);
      message.error(apiErrorMessage(error, "Không thể mở lại bảng công"));
    } finally {
      this.setState("reopening", false);
    }
  }

  /** Nạp lại lưới từ danh sách mới nhất — dùng chung cho tổng hợp và mở lại,
   * cả hai đều trả về tóm tắt/số dòng chứ không phải mảng Timesheet. */
  private async napLaiDanhSach(thang: string): Promise<void> {
    const list = await timesheetService.getList({ thang });
    this.setState("timesheetList", list);
  }
}
