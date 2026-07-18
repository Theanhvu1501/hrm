import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import "./quick-add.event";
import { NhatKyChungFormStates, NhatKyChungFormEvents } from "../../nhat-ky-chung-form.handler";
import { ChungTuChiTiet } from "../init/init.state";
import { DoiTuong, SanPham } from "@/types";
import { doiTuongService } from "@/services/doiTuongService";
import { sanPhamService } from "@/services/sanPhamService";
import {
  quickAddDoiTuongReducer,
  quickAddSanPhamReducer,
} from "./quick-add.reducers";

@RegisterHandler("nhat-ky-chung-form")
export class QuickAddFormHandler extends CSubHanlder<NhatKyChungFormEvents, NhatKyChungFormStates> {
  @HandlerDecorator("quickCreateDoiTuong")
  async quickCreateDoiTuong(params: {
    key: string; field: "doiTuongId" | "doiTuong2Id"; loai: string[]; ma: string; ten: string;
  }): Promise<{ ok: boolean }> {
    try {
      const created: DoiTuong = await doiTuongService.create({
        loai: params.loai,
        ma: params.ma,
        ten: params.ten,
      } as unknown as Omit<DoiTuong, "id">);
      const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
      const doiTuongList = (this.getState("doiTuongList") as DoiTuong[]) || [];
      const next = quickAddDoiTuongReducer({ chiTietList, doiTuongList, key: params.key, field: params.field, created });
      this.setState("doiTuongList", next.doiTuongList);
      this.setState("chiTietList", next.chiTietList);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @HandlerDecorator("quickCreateSanPham")
  async quickCreateSanPham(params: {
    key: string; ma: string; ten: string; donVi?: string; giaBan?: number;
  }): Promise<{ ok: boolean }> {
    try {
      const created: SanPham = await sanPhamService.create({
        ma: params.ma,
        ten: params.ten,
        donVi: params.donVi,
        giaBan: params.giaBan,
      } as unknown as Omit<SanPham, "id">);
      const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
      const sanPhamList = (this.getState("sanPhamList") as SanPham[]) || [];
      const next = quickAddSanPhamReducer({ chiTietList, sanPhamList, key: params.key, created });
      this.setState("sanPhamList", next.sanPhamList);
      this.setState("chiTietList", next.chiTietList);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
}
