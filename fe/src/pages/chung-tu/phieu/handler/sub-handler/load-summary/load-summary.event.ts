import { BaseEvents } from "@/common";
import { PhieuSummaryType } from "@/services/phieuService";

export interface LoadSummaryEvent extends BaseEvents {
  loadSummary: { params: { type: PhieuSummaryType }; result: void };
}

declare module "../../../phieu.handler" {
  interface PhieuEvents extends LoadSummaryEvent {}
}
