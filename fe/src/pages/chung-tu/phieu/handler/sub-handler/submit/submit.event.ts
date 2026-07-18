import { BaseEvents } from "@/common";
import { CreatePhieuDto } from "@/services/phieuService";

export interface SubmitEvent extends BaseEvents {
  submitPhieu: { params: { id?: string; dto: CreatePhieuDto }; result: boolean };
}

declare module "../../../phieu.handler" {
  interface PhieuEvents extends SubmitEvent {}
}
