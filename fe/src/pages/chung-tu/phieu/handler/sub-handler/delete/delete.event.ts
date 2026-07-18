import { BaseEvents } from "@/common";

export interface DeleteEvent extends BaseEvents {
  deletePhieu: { params: { id: string }; result: boolean };
}

declare module "../../../phieu.handler" {
  interface PhieuEvents extends DeleteEvent {}
}
