import { BaseEvents } from "@/common";

export interface SearchEvent extends BaseEvents {
  search: { params: { text: string }; result: void };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends SearchEvent {}
}
