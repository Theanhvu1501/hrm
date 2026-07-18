import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import "./header.event";
import { NhatKyChungFormStates, NhatKyChungFormEvents } from "../../nhat-ky-chung-form.handler";
import { ChungTuHeader, ChungTuChiTiet } from "../init/init.state";
import { LoaiChungTuType } from "@/services/loaiChungTuService";
import { QuyChuan } from "@/types";

@RegisterHandler("nhat-ky-chung-form")
export class HeaderFormHandler extends CSubHanlder<NhatKyChungFormEvents, NhatKyChungFormStates> {
  @HandlerDecorator("updateHeader")
  async updateHeader(params: { field: keyof ChungTuHeader; value: unknown }): Promise<void> {
    const header = this.getState("header") as ChungTuHeader | null;
    if (!header) return;

    this.setState("header", {
      ...header,
      [params.field]: params.value,
    });
  }

  @HandlerDecorator("handleLoaiGiaoDichChange")
  async handleLoaiGiaoDichChange(params: { loaiGiaoDich: string }): Promise<void> {
    const { loaiGiaoDich } = params;
    const header = this.getState("header") as ChungTuHeader | null;
    const quyChaunList = (this.getState("quyChaunList") as QuyChuan[]) || [];

    if (!header) return;

    // Reset nghiệp vụ khi đổi loại giao dịch
    this.setState("header", {
      ...header,
      loaiGiaoDich,
      loai: undefined,
      loaiTen: undefined,
    });

    // Lọc nghiệp vụ theo loại giao dịch từ quyChaunList
    const filtered = quyChaunList
      .filter((qc) => qc.loaiGiaoDich === loaiGiaoDich)
      .map((qc) => ({
        value: qc.nghiepVu,
        label: qc.nghiepVu,
      }));

    this.setState("filteredNghiepVuList", filtered);
  }

  @HandlerDecorator("handleLoaiChange")
  async handleLoaiChange(params: { loaiMa: string }): Promise<void> {
    const { loaiMa } = params;
    const header = this.getState("header") as ChungTuHeader | null;
    const loaiChungTuList = (this.getState("loaiChungTuList") as LoaiChungTuType[]) || [];
    const quyChaunList = (this.getState("quyChaunList") as QuyChuan[]) || [];
    const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];

    if (!header) return;

    // Tìm loại chứng từ
    const loaiChungTu = loaiChungTuList.find((lct) => lct.ma === loaiMa);

    // Cập nhật header
    this.setState("header", {
      ...header,
      loai: loaiMa,
      loaiTen: loaiChungTu?.ten || loaiMa,
    });

    // Tìm quy chuẩn tương ứng để auto-fill TK Nợ/Có cho dòng đầu tiên
    const quyChuan = quyChaunList.find(
      (qc) => qc.loaiGiaoDich === loaiMa || qc.nghiepVu === loaiMa
    );

    if (quyChuan && chiTietList.length > 0) {
      // Auto-fill TK Nợ/Có và nội dung cho dòng đầu tiên
      const updatedChiTiet = [...chiTietList];
      updatedChiTiet[0] = {
        ...updatedChiTiet[0],
        taiKhoanNo: quyChuan.taiKhoanNo || updatedChiTiet[0].taiKhoanNo,
        taiKhoanCo: quyChuan.taiKhoanCo || updatedChiTiet[0].taiKhoanCo,
        noiDung: quyChuan.moTa || updatedChiTiet[0].noiDung,
      };
      this.setState("chiTietList", updatedChiTiet);
    }
  }
}
