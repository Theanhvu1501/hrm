import { BaseEvents } from "@/common";

export interface DeleteEvent extends BaseEvents {
  deleteEntry: { params: { id: string }; result: void };
}

declare module "../../../handler/nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends DeleteEvent {}
}
