import { BaseEvents } from "@/common";
import { GiaTriFormDon } from "../../truongDon";

export interface NopEvent extends BaseEvents {
  /** Mở form nộp đơn (xoá sạch lỗi của lần trước). */
  moForm: { params: Record<string, never>; result: void };
  dongForm: { params: Record<string, never>; result: void };
  /**
   * Nộp đơn. Nhận GIÁ TRỊ FORM thô, không nhận DTO: việc lọc trường theo loại
   * đơn nằm ở `dungDtoNopDon()` trong handler, để không có đường nào gửi
   * payload chưa qua lọc lên backend.
   */
  nopDon: { params: GiaTriFormDon; result: void };
}

declare module "../../donTuCuaToiHandler" {
  interface DonTuCuaToiEvents extends NopEvent {}
}
