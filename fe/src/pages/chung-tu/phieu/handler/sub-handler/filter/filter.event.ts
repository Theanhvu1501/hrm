import { BaseEvents } from "@/common";

export interface FilterEvent extends BaseEvents {
  setFilter: { params: { key: string; value: unknown }; result: void };
  applyFilters: { params: {}; result: void };
  resetFilters: { params: {}; result: void };
}

declare module "../../../phieu.handler" {
  interface PhieuEvents extends FilterEvent {}
}
