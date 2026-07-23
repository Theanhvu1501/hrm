import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { attendanceRecordService } from "@/services/attendanceRecordService";
import { homNayVN } from "@/ultils/thoiGianVN";
import { bayNgayTu, dauTuanCua, dichTuan } from "../../lichTuan";
import { ngayMacDinhCuaTuan } from "../../ngayDangXem";
import "./tuan.event";

@RegisterHandler("cham-cong-cua-toi-context")
export class TuanHandler extends CSubHanlder {
  @HandlerDecorator("napTuan")
  async napTuan(params: { tuanBatDau?: string }): Promise<void> {
    const dau = params.tuanBatDau ?? dauTuanCua(homNayVN());
    const ngay = bayNgayTu(dau);

    this.setState("tuanBatDau", dau);
    // Đặt TRƯỚC lời gọi mạng: đổi tuần phải thấy 3 ô + chi tiết nhảy về ngày
    // mặc định của tuần mới ngay lập tức, không đợi round-trip API.
    this.setState("ngayDangXem", ngayMacDinhCuaTuan(dau, homNayVN()));
    this.setState("dangTaiTuan", true);

    try {
      const banGhi = await attendanceRecordService.cuaToi(ngay[0], ngay[6]);
      this.setState("banGhiTuan", banGhi);
    } catch (error) {
      // Lịch tuần là thông tin phụ trợ. Hỏng nó KHÔNG được phép chặn nút
      // chấm công — đó mới là việc người dùng đến đây để làm. Dọn về rỗng
      // (lịch hiện toàn chấm xám) và ghi log, không đổi `trangThai`.
      console.error("Tải lịch tuần lỗi:", error);
      this.setState("banGhiTuan", []);
    } finally {
      this.setState("dangTaiTuan", false);
    }
  }

  @HandlerDecorator("doiTuan")
  async doiTuan(params: { lech: number }): Promise<void> {
    const hienTai =
      (this.getState("tuanBatDau") as string) ?? dauTuanCua(homNayVN());
    await this.executeEvent("napTuan", {
      tuanBatDau: dichTuan(hienTai, params.lech),
    });
  }

  @HandlerDecorator("chonNgay")
  async chonNgay(params: { ngay: string }): Promise<void> {
    this.setState("ngayDangXem", params.ngay);
  }
}
