import { message } from "antd";
import dayjs from "dayjs";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { apiErrorMessage } from "@/config/api";
import {
  bangLuongThemGioService,
  DongLuongThemGio,
} from "@/services/bangLuongThemGioService";
import "./init.event";

@RegisterHandler("bang-luong-them-gio-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    const thang = dayjs().format("YYYY-MM");
    this.setState("thang", thang);
    this.setState("danhSach", []);
    this.setState("dangTai", false);
    this.setState("dangTongHop", false);
    this.setState("daChot", false);

    await this.loadDanhSach(thang);
  }

  @HandlerDecorator("doiThang")
  async doiThang(params: { thang: string }): Promise<void> {
    this.setState("thang", params.thang);
    await this.loadDanhSach(params.thang);
  }

  async loadDanhSach(thang: string): Promise<void> {
    this.setState("dangTai", true);
    try {
      const danhSach = await bangLuongThemGioService.danhSach(thang);
      this.setState("danhSach", danhSach);
      this.setState("daChot", tinhDaChot(danhSach));
    } catch (error) {
      console.error("Tải bảng lương thêm giờ lỗi:", error);
      this.setState("danhSach", []);
      this.setState("daChot", false);
      message.error(
        apiErrorMessage(error, "Không thể tải bảng lương thêm giờ. Vui lòng thử lại."),
      );
    } finally {
      this.setState("dangTai", false);
    }
  }
}

export function tinhDaChot(danhSach: DongLuongThemGio[]): boolean {
  return danhSach.length > 0 && danhSach.every((d) => d.trangThai === "chot");
}
