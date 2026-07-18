import { BaseEvents } from "@/common";

export interface MasterDataEvent extends BaseEvents {
  loadMasterData: { params: Record<string, never>; result: void };
}

declare module "../../../handler/nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends MasterDataEvent {}
}
