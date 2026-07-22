import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import {
  attendanceRecordService,
  ChamCongDto,
  TrangThaiHomNay,
} from "@/services/attendanceRecordService";
import { getDeviceId } from "@/services/deviceIdentity";
import { TrangThai, phanLoaiLoi, thongDiepChoTrangThai } from "../../trangThai";
import { chuanHoaTenThietBi, tenThietBiMacDinh } from "../../tenThietBi";
import { layViTri, LoiViTri } from "../../viTri";
import "./cham.event";

@RegisterHandler("cham-cong-cua-toi-context")
export class ChamHandler extends CSubHanlder {
  @HandlerDecorator("cham")
  async cham(params: { tenThietBi?: string }): Promise<void> {
    const homNay = this.getState("homNay") as TrangThaiHomNay | null;
    if (!homNay) return;
    // Chặn bấm chồng: cú chạm thứ hai lúc đang gửi sẽ đẻ ra hai request, và
    // ngưỡng chống trùng 60 giây của backend chỉ cứu được nếu cả hai cùng
    // loại — bấm nhanh quanh lúc đổi vào/ra thì không.
    if (this.getState("dangCham") === true) return;

    this.setState("dangCham", true);
    this.setState("thongBao", "");
    this.setState("banGhiVuaTao", null);

    try {
      const viTri = await layViTri();
      // Bắt buộc qua getDeviceId(): bọc Capacitor sau này chỉ cần đổi một
      // provider, không phải sửa màn hình nào.
      const deviceId = await getDeviceId();

      const dto: ChamCongDto = {
        deviceId,
        phuongThuc: "gps",
        latitude: viTri.latitude,
        longitude: viTri.longitude,
        doChinhXacMet: viTri.doChinhXacMet,
        // LUÔN gửi tên máy, kể cả lần chấm đầu tiên khi người dùng chưa đặt
        // tên: backend tự tạo dòng chờ duyệt ngay lần đó và chỉ ghi tên đúng
        // một lần, nên bỏ trống là để HR nhìn một UUID trần trong hàng chờ.
        tenThietBi:
          chuanHoaTenThietBi(params?.tenThietBi ?? "") || tenThietBiMacDinh(),
      };

      // Tin `hanhDongKeTiep` của backend, KHÔNG tự suy từ danh sách bản ghi:
      // backend còn tính cả luật "lượt vào treo quá hạn thì không cho tự
      // check-out" (luotVaoConHieuLuc) — suy lại ở FE sẽ hiện nút Check-out
      // dẫn thẳng vào lỗi 409.
      const banGhi =
        homNay.hanhDongKeTiep === "vao"
          ? await attendanceRecordService.checkIn(dto)
          : await attendanceRecordService.checkOut(dto);

      this.setState("banGhiVuaTao", banGhi);
      this.setState("trangThai", TrangThai.SAN_SANG);
      await this.taiLaiHomNay();
    } catch (error) {
      console.error("Chấm công lỗi:", error);
      // LoiViTri là lỗi của thiết bị người dùng, chưa hề gọi API — không được
      // đem đi phân loại như lỗi HTTP (sẽ ra LOI_KHAC "vui lòng thử lại" và
      // giấu mất hướng dẫn bật quyền vị trí).
      const tt =
        error instanceof LoiViTri ? error.trangThai : phanLoaiLoi(error);
      this.setState("trangThai", tt);
      this.setState("thongBao", thongDiepChoTrangThai(tt, error));

      // Sai thứ tự vào/ra nghĩa là hiểu biết của FE về phiên đang mở đã cũ
      // (chấm trên máy khác, HR nhập bù...). Nạp lại để nút đổi đúng chiều
      // thay vì bắt người dùng tự tải lại trang.
      if (tt === TrangThai.SAI_THU_TU) await this.taiLaiHomNay();
    } finally {
      this.setState("dangCham", false);
    }
  }

  /**
   * Nạp lại trạng thái hôm nay. Nuốt lỗi có chủ đích: bản ghi đã được ghi
   * nhận thành công rồi, đè một thông báo lỗi lên màn hình lúc này chỉ khiến
   * người dùng tưởng chấm công hỏng và bấm lại.
   */
  private async taiLaiHomNay(): Promise<void> {
    try {
      const moi = await attendanceRecordService.homNay();
      this.setState("homNay", moi);
    } catch (error) {
      console.error("Tải lại trạng thái hôm nay lỗi:", error);
    }
  }
}
