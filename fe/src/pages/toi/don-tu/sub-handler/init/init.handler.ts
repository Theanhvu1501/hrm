import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { attendanceRequestService } from "@/services/attendanceRequestService";
import { leaveBalanceService } from "@/services/leaveBalanceService";
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

    // P3.8 (Task 12): số dư phép — tải RIÊNG, không chung try/catch với danh
    // sách đơn. BE quỹ phép lỗi (hoặc NV chưa lên chính thức, chưa có quỹ
    // nào) không được chặn xem/nộp các loại đơn khác (giải trình, OT, nghỉ
    // bù) — rỗng khi lỗi, KhoiSoDuPhep tự hiện đúng câu cho từng trường hợp.
    try {
      const soDuPhep = await leaveBalanceService.getCuaToi();
      this.setState("soDuPhep", soDuPhep);
      this.setState("loiSoDuPhep", undefined);
    } catch (error) {
      console.error("Tải số dư phép lỗi:", error);
      this.setState("soDuPhep", []);
      // Review round 1 (Minor 4): PHẢI đánh dấu "lỗi tải" riêng, không chỉ
      // set mảng rỗng — mảng rỗng vì lỗi (vd tài khoản chưa gắn hồ sơ nhân
      // viên, 404) và mảng rỗng vì thật sự chưa có quỹ (thử việc) trông y
      // hệt nhau, và trước bản sửa này, người dùng bị lỗi 404 còn thấy thêm
      // một câu "đang thử việc, chưa được cấp phép" không liên quan gì tới
      // lỗi thật của họ.
      this.setState("loiSoDuPhep", "loi_khac");
    }
  }
}
