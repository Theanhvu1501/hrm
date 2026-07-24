import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import dayjs from "dayjs";
import { apiErrorMessage } from "@/config/api";
import { bangLuongService, DongLuong } from "@/services/bangLuongService";
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

    await this.loadDanhSach(thang);
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
