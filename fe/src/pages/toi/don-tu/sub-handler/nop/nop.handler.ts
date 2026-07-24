import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { attendanceRequestService } from "@/services/attendanceRequestService";
import { GiaTriFormDon, dungDtoNopDon, kiemTraDon } from "../../truongDon";
import { thongDiepLoiDon } from "../../thongDiepLoi";
import "./nop.event";

@RegisterHandler("don-tu-cua-toi-context")
export class NopHandler extends CSubHanlder {
  @HandlerDecorator("moForm")
  moForm(): void {
    this.setState("loiGui", "");
    this.setState("formMo", true);
  }

  @HandlerDecorator("dongForm")
  dongForm(): void {
    this.setState("formMo", false);
  }

  @HandlerDecorator("nopDon")
  async nopDon(values: GiaTriFormDon): Promise<void> {
    // Chặn bấm chồng: mạng 3G ở cổng công ty đủ chậm để người dùng bấm hai
    // lần, và hai lần bấm ở đây là hai cái đơn nghỉ phép trùng nhau.
    if (this.getState("dangGui") === true) return;

    const loi = kiemTraDon(values);
    if (loi) {
      this.setState("loiGui", loi);
      return;
    }

    this.setState("dangGui", true);
    this.setState("loiGui", "");

    try {
      // taoDonCuaToi() → POST /don-cham-cong/cua-toi. Payload đi qua
      // dungDtoNopDon() để không thừa khoá nào (forbidNonWhitelisted ở BE).
      await attendanceRequestService.taoDonCuaToi(dungDtoNopDon(values));
      this.setState("formMo", false);
      // Nạp lại từ server thay vì tự chèn đơn vừa tạo vào đầu danh sách:
      // backend còn tự tính soNgayNghi/soGioOt/heSoOt, và đó chính là những
      // con số người vừa nộp muốn nhìn để biết mình khai đúng chưa.
      await this.executeEvent("init", {});
    } catch (error) {
      console.error("Nộp đơn lỗi:", error);
      // Giữ form MỞ khi lỗi: đóng lại là người dùng mất hết những gì vừa gõ.
      this.setState(
        "loiGui",
        thongDiepLoiDon(error, "Không nộp được đơn. Vui lòng thử lại.")
      );
    } finally {
      this.setState("dangGui", false);
    }
  }
}
