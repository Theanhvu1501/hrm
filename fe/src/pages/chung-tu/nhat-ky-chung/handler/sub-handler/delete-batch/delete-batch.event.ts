import { BaseEvents } from "@/common";

export interface DeleteBatchEvent extends BaseEvents {
  deleteBatch: { params: { ids: string[] }; result: void };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends DeleteBatchEvent {}
}
