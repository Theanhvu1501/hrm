import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import {
  DieuChinhQuyPhepDto,
  DongXemTruocCap,
  DongXemTruocDong,
  LeaveBalance,
  leaveBalanceService,
} from "@/services/leaveBalanceService";
import { XemTruocData, XemTruocLoai } from "../../components/XemTruocModal.state";
import "./thao-tac.event";

@RegisterHandler("quy-phep-context")
export class ThaoTacHandler extends CSubHanlder {
  @HandlerDecorator("moXemTruoc")
  async moXemTruoc(params: { loai: XemTruocLoai; nam: number }): Promise<void> {
    this.setState("dangXuLy", true);
    try {
      if (params.loai === "cap_dau_nam") {
        // xemTruoc:true — BE chỉ TÍNH TOÁN, không ghi gì. Xem ghi chú ở
        // thao-tac.event.ts về vì sao đây là cửa duy nhất tới ghi dữ liệu.
        const rows = (await leaveBalanceService.capDauNam(
          params.nam,
          true
        )) as DongXemTruocCap[];
        this.setState("xemTruoc", {
          loai: params.loai,
          nam: params.nam,
          capRows: rows,
          dongRows: [],
        } as XemTruocData);
      } else {
        const rows = (await leaveBalanceService.dongQuy(
          params.nam,
          true
        )) as DongXemTruocDong[];
        this.setState("xemTruoc", {
          loai: params.loai,
          nam: params.nam,
          capRows: [],
          dongRows: rows,
        } as XemTruocData);
      }
    } catch (error) {
      console.error("Xem trước thao tác quỹ phép lỗi:", error);
      message.error(apiErrorMessage(error, "Không thể tải dữ liệu xem trước."));
    } finally {
      this.setState("dangXuLy", false);
    }
  }

  @HandlerDecorator("huyXemTruoc")
  huyXemTruoc(): void {
    this.setState("xemTruoc", null);
  }

  @HandlerDecorator("xacNhanXemTruoc")
  async xacNhanXemTruoc(): Promise<void> {
    // Đọc nam/loai từ chính dữ liệu xem trước đã có trên state, KHÔNG nhận
    // tham số mới — nhờ vậy hàm này không thể bị gọi cho một năm/loại khác
    // với những gì người dùng vừa xem, và không thể gọi khi chưa xem trước
    // (xemTruoc null thì return sớm, không có gì để xác nhận).
    const xemTruoc = this.getState("xemTruoc") as XemTruocData | undefined;
    if (!xemTruoc) return;

    this.setState("dangXuLy", true);
    try {
      if (xemTruoc.loai === "cap_dau_nam") {
        const ketQua = (await leaveBalanceService.capDauNam(xemTruoc.nam, false)) as {
          daCap: number;
          boQua: number;
        };
        message.success(
          `Đã cấp phép đầu năm ${xemTruoc.nam} cho ${ketQua.daCap} nhân viên` +
            (ketQua.boQua > 0 ? ` (bỏ qua ${ketQua.boQua} người đã có quỹ).` : ".")
        );
      } else {
        const ketQua = (await leaveBalanceService.dongQuy(xemTruoc.nam, false)) as {
          soQuyDaDong: number;
          tongNgayMat: number;
        };
        message.success(
          `Đã đóng ${ketQua.soQuyDaDong} quỹ năm ${xemTruoc.nam}, tổng ${ketQua.tongNgayMat} ngày phép bị mất.`
        );
      }
      this.setState("xemTruoc", null);
      await this.executeEvent("taiLai", {});
    } catch (error) {
      console.error("Xác nhận thao tác quỹ phép lỗi:", error);
      message.error(apiErrorMessage(error, "Thao tác thất bại. Vui lòng thử lại."));
    } finally {
      this.setState("dangXuLy", false);
    }
  }

  @HandlerDecorator("moDieuChinh")
  moDieuChinh(params: { record: LeaveBalance }): void {
    this.setState("dieuChinhRecord", params.record);
  }

  @HandlerDecorator("dongDieuChinh")
  dongDieuChinh(): void {
    this.setState("dieuChinhRecord", null);
  }

  @HandlerDecorator("dieuChinh")
  async dieuChinh(dto: DieuChinhQuyPhepDto): Promise<void> {
    this.setState("dangXuLy", true);
    try {
      await leaveBalanceService.dieuChinh(dto);
      // Chỉ đóng modal SAU khi lưu thành công — lưu lỗi thì giữ modal mở
      // (kèm message.error) để người dùng không phải nhập lại từ đầu.
      this.setState("dieuChinhRecord", null);
      message.success("Đã điều chỉnh quỹ phép.");
      await this.executeEvent("taiLai", {});
    } catch (error) {
      console.error("Điều chỉnh quỹ phép lỗi:", error);
      message.error(apiErrorMessage(error, "Không thể điều chỉnh quỹ phép."));
    } finally {
      this.setState("dangXuLy", false);
    }
  }

  @HandlerDecorator("moSoBienDong")
  async moSoBienDong(params: { quy: LeaveBalance }): Promise<void> {
    this.setState("drawerQuy", params.quy);
    this.setState("dangTaiBienDong", true);
    try {
      const bienDong = await leaveBalanceService.getSoBienDong(params.quy.id);
      this.setState("bienDong", bienDong);
    } catch (error) {
      console.error("Tải sổ biến động lỗi:", error);
      this.setState("bienDong", []);
      message.error(apiErrorMessage(error, "Không thể tải sổ biến động."));
    } finally {
      this.setState("dangTaiBienDong", false);
    }
  }

  @HandlerDecorator("dongSoBienDong")
  dongSoBienDong(): void {
    this.setState("drawerQuy", null);
    this.setState("bienDong", []);
  }
}
