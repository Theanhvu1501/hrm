import { BaseEvents } from "@/common";

export interface LoadMasterDataEvent extends BaseEvents {
  loadMasterData: { params: Record<string, never>; result: void };
}

declare module "../../import.handler" {
  interface ImportEvents extends LoadMasterDataEvent {}
}
