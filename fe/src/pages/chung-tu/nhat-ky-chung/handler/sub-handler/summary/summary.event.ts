import { BaseEvents } from "@/common";
import { SummaryType } from "@/services/nhatKyChungService";

export interface SummaryEvent extends BaseEvents {
  loadSummary: { params: { type: SummaryType }; result: void };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends SummaryEvent {}
}
