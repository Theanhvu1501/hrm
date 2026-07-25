import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import dayjs from "dayjs";
import { apiErrorMessage } from "@/config/api";
import { bangLuongService, DongLuong } from "@/services/bangLuongService";
import { cauHinhLuongService } from "@/services/cauHinhLuongService";
import "./init.event";

@RegisterHandler("bang-luong-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    const thang = dayjs().format("YYYY-MM");
    this.setState("thang", thang);
    this.setState("danhSach", []);
    this.setState("dangTai", false);
    this.setState("dangTongHop", false);
    this.setState("tabDangXem", "khaiBao");
    this.setState("daChot", false);
    this.setState("khoanLuong", []);
    this.setState("cauHinhChung", null);

    await Promise.all([this.loadDanhSach(thang), this.loadKhoanLuong()]);
  }

  /**
   * Best-effort: bảng lương vẫn dùng được nếu cấu hình lỗi/user không có
   * quyền `/luong/cau-hinh:xem` — table fallback về hành vi cũ (mã thô làm
   * tiêu đề, sửa được nếu đã có sẵn trong `nhapTheoKy`). Vì vậy KHÔNG toast
   * lỗi ở đây (đã có toast riêng cho `loadDanhSach`, tránh chồng 2 lỗi).
   */
  private async loadKhoanLuong(): Promise<void> {
    try {
      const cauHinh = await cauHinhLuongService.get();
      this.setState("khoanLuong", cauHinh.khoanLuong ?? []);
      this.setState("cauHinhChung", cauHinh);
    } catch (error) {
      console.error("Tải cấu hình lương (khoản lương) lỗi:", error);
      this.setState("khoanLuong", []);
      this.setState("cauHinhChung", null);
    }
  }

  @HandlerDecorator("doiThang")
  async doiThang(params: { thang: string }): Promise<void> {
    this.setState("thang", params.thang);
    await this.loadDanhSach(params.thang);
  }

  private async loadDanhSach(thang: string): Promise<void> {
    this.setState("dangTai", true);
    try {
      const danhSach = await bangLuongService.danhSach(thang);
      this.setState("danhSach", danhSach);
      this.setState("daChot", tinhDaChot(danhSach));
    } catch (error) {
      console.error("Tải bảng lương lỗi:", error);
      this.setState("danhSach", []);
      this.setState("daChot", false);
      message.error(apiErrorMessage(error, "Không thể tải bảng lương. Vui lòng thử lại."));
    } finally {
      this.setState("dangTai", false);
    }
  }
}

export function tinhDaChot(danhSach: DongLuong[]): boolean {
  return danhSach.length > 0 && danhSach.every((dong) => dong.trangThai === "chot");
}
