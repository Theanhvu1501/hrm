import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { attendanceRecordService } from "@/services/attendanceRecordService";
import { TrangThai, phanLoaiLoi, thongDiepChoTrangThai } from "../../trangThai";
import "./init.event";

@RegisterHandler("cham-cong-cua-toi-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("trangThai", TrangThai.DANG_TAI);
    this.setState("dangCham", false);
    this.setState("banGhiVuaTao", null);
    this.setState("thongBao", "");
    this.setState("banGhiTuan", []);
    this.setState("dangTaiTuan", false);

    try {
      const homNay = await attendanceRecordService.homNay();
      this.setState("homNay", homNay);
      this.setState("trangThai", TrangThai.SAN_SANG);
    } catch (error) {
      // KHÔNG dùng message.error(): màn hình này là toàn bộ việc người dùng
      // đến đây để làm, nên lý do hỏng phải nằm ngay giữa màn hình kèm việc
      // cần làm tiếp — không phải một toast biến mất sau 3 giây.
      console.error("Tải trạng thái chấm công hôm nay lỗi:", error);
      const tt = phanLoaiLoi(error);
      this.setState("trangThai", tt);
      this.setState("thongBao", thongDiepChoTrangThai(tt, error));
      this.setState("homNay", null);
    }

    // Nạp lịch tuần SAU khi trạng thái chính đã xong và KHÔNG await chung
    // khối try ở trên: lịch tuần hỏng thì chỉ mất lịch tuần, nút chấm công
    // vẫn phải dùng được.
    void this.executeEvent("napTuan", {});
  }
}
