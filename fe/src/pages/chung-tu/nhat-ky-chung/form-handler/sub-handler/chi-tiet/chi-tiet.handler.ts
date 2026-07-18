import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { v4 as uuidv4 } from "uuid";
import "./chi-tiet.event";
import { NhatKyChungFormStates, NhatKyChungFormEvents } from "../../nhat-ky-chung-form.handler";
import { ChungTuChiTiet } from "../init/init.state";
import { QuyChuan } from "@/types";

@RegisterHandler("nhat-ky-chung-form")
export class ChiTietFormHandler extends CSubHanlder<NhatKyChungFormEvents, NhatKyChungFormStates> {
  @HandlerDecorator("addChiTiet")
  async addChiTiet(): Promise<void> {
    const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];

    const newItem: ChungTuChiTiet = {
      key: uuidv4(),
      taiKhoanNo: "",
      taiKhoanCo: "",
      soTien: 0,
      noiDung: "",
      nghiepVu: undefined,
      nghiepVuTen: undefined,
    };

    this.setState("chiTietList", [...chiTietList, newItem]);
  }

  @HandlerDecorator("removeChiTiet")
  async removeChiTiet(params: { key: string }): Promise<void> {
    const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];

    // Không cho xóa nếu chỉ còn 1 dòng
    if (chiTietList.length <= 1) {
      return;
    }

    const updatedList = chiTietList.filter((item) => item.key !== params.key);
    this.setState("chiTietList", updatedList);
  }

  @HandlerDecorator("updateChiTiet")
  async updateChiTiet(params: { key: string; field: keyof ChungTuChiTiet; value: unknown }): Promise<void> {
    const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];

    const updatedList = chiTietList.map((item) => {
      if (item.key === params.key) {
        return {
          ...item,
          [params.field]: params.value,
        };
      }
      return item;
    });

    this.setState("chiTietList", updatedList);
  }

  @HandlerDecorator("updateChiTietSnapshot")
  async updateChiTietSnapshot(params: {
    key: string;
    snapshotField: string;
    snapshot: Record<string, unknown>;
  }): Promise<void> {
    const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];

    const updatedList = chiTietList.map((item) => {
      if (item.key === params.key) {
        return {
          ...item,
          [params.snapshotField]: params.snapshot,
        };
      }
      return item;
    });

    this.setState("chiTietList", updatedList);
  }

  @HandlerDecorator("duplicateChiTiet")
  async duplicateChiTiet(params: { key: string }): Promise<void> {
    const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];

    const itemToDuplicate = chiTietList.find((item) => item.key === params.key);
    if (!itemToDuplicate) return;

    const newItem: ChungTuChiTiet = {
      ...itemToDuplicate,
      key: uuidv4(),
      id: undefined, // Clear ID for new item
    };

    // Insert after the original item
    const index = chiTietList.findIndex((item) => item.key === params.key);
    const updatedList = [
      ...chiTietList.slice(0, index + 1),
      newItem,
      ...chiTietList.slice(index + 1),
    ];

    this.setState("chiTietList", updatedList);
  }

  @HandlerDecorator("handleNghiepVuChange")
  async handleNghiepVuChange(params: { key: string; nghiepVu: string }): Promise<void> {
    const { key, nghiepVu } = params;
    const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
    const quyChaunList = (this.getState("quyChaunList") as QuyChuan[]) || [];

    // Tìm quy chuẩn tương ứng với nghiệp vụ được chọn
    const quyChuan = quyChaunList.find(
      (qc) => qc.nghiepVu === nghiepVu
    );

    const updatedList = chiTietList.map((item) => {
      if (item.key === key) {
        return {
          ...item,
          nghiepVu: nghiepVu,
          nghiepVuTen: nghiepVu,
          // Auto-fill TK Nợ/Có và nội dung từ quy chuẩn
          taiKhoanNo: quyChuan?.taiKhoanNo || item.taiKhoanNo,
          taiKhoanCo: quyChuan?.taiKhoanCo || item.taiKhoanCo,
          noiDung: quyChuan?.moTa || item.noiDung,
        };
      }
      return item;
    });

    this.setState("chiTietList", updatedList);
  }
}
