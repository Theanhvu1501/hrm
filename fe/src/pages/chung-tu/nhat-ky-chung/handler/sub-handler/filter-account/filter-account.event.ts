import { BaseEvents } from "@/common";

export interface FilterAccountEvent extends BaseEvents {
  filterByAccount: { params: { account: string | undefined }; result: void };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends FilterAccountEvent {}
}
