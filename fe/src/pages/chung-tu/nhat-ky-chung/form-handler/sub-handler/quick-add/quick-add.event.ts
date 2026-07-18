import { BaseEvents } from "@/common";

export interface QuickAddFormEvent extends BaseEvents {
  quickCreateDoiTuong: {
    params: { key: string; field: "doiTuongId" | "doiTuong2Id"; loai: string[]; ma: string; ten: string };
    result: { ok: boolean };
  };
  quickCreateSanPham: {
    params: { key: string; ma: string; ten: string; donVi?: string; giaBan?: number };
    result: { ok: boolean };
  };
}

declare module "../../nhat-ky-chung-form.handler" {
  interface NhatKyChungFormEvents extends QuickAddFormEvent {}
}
