import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { attendanceRequestService } from "@/services/attendanceRequestService";
import { thongDiepLoiDon } from "../../thongDiepLoi";
import "./init.event";

@RegisterHandler("don-tu-cua-toi-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("dangTai", true);
    this.setState("loiTai", "");
    // Lỗi huỷ của lượt trước không được sống sót qua một lần nạp lại: nó nói
    // về một hành động đã kết thúc.
    this.setState("loiHuy", "");

    try {
      // `cuaToi()` gọi GET /don-cham-cong/cua-toi — route CHỈ cần JwtGuard.
      // KHÔNG được đổi sang getList(): route quản trị đó đòi
      // /cham-cong/don-tu:xem mà nhân viên thường không có (Task 4) → 403.
      const danhSach = await attendanceRequestService.cuaToi();
      this.setState("danhSach", danhSach);
    } catch (error) {
      // PHẢI đẩy lên state, không chỉ console.error: danh sách rỗng vì lỗi và
      // danh sách rỗng vì chưa nộp đơn nào trông y hệt nhau trên màn hình, và
      // người dùng sẽ nộp lại đơn mình đã nộp.
      console.error("Tải danh sách đơn của tôi lỗi:", error);
      this.setState("danhSach", []);
      this.setState(
        "loiTai",
        thongDiepLoiDon(error, "Không tải được danh sách đơn của bạn.")
      );
    } finally {
      this.setState("dangTai", false);
    }
  }
}
