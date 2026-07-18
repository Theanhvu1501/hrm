import { BaseEvents } from "@/common";

export interface InitEvent extends BaseEvents {
  init: { params: Record<string, never>; result: void };
}

declare module "../../diaDiemChamCongHandler" {
  interface DiaDiemChamCongEvents extends InitEvent {}
}
