import { BaseEvents } from "@/common";

export interface SavePermissionsEvent extends BaseEvents {
  savePermissions: { params: Record<string, never>; result: void };
}

declare module "../../phanQuyenHandler" {
  interface PhanQuyenEvents extends SavePermissionsEvent {}
}
