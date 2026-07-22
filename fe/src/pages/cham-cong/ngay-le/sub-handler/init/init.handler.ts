import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { holidayService } from "@/services/holidayService";
import { homNayVN } from "@/ultils/thoiGianVN";
import "./init.event";

@RegisterHandler("ngay-le-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("formVisible", false);
    this.setState("editingHoliday", null);
    this.setState("saving", false);

    // homNayVN() (múi giờ Asia/Ho_Chi_Minh cố định) chứ không dùng
    // new Date().getFullYear() — máy người xem ở múi giờ khác có thể lệch năm.
    const nam = Number(homNayVN().slice(0, 4));
    this.setState("nam", nam);
    await this.taiDanhSach(nam);
  }

  @HandlerDecorator("doiNam")
  async doiNam(params: { nam: number }): Promise<void> {
    this.setState("nam", params.nam);
    await this.taiDanhSach(params.nam);
  }

  private async taiDanhSach(nam: number): Promise<void> {
    this.setState("loading", true);
    try {
      const holidayList = await holidayService.getList({ nam });
      this.setState("holidayList", holidayList);
    } catch (error) {
      console.error("Tải danh sách ngày lễ lỗi:", error);
      this.setState("holidayList", []);
    } finally {
      this.setState("loading", false);
    }
  }
}
