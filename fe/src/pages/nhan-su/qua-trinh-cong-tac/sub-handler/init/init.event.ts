import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: Record<string, never>; result: void };
}

declare module "../../quaTrinhCongTacHandler" {
  interface QuaTrinhCongTacEvents extends InitEvent {}
}
