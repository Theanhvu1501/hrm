import { BaseEvents } from "@/common";
import { PermissionAction } from "../../constants/permissionModules";

export interface TogglePermissionEvent extends BaseEvents {
  togglePermission: {
    params: { moduleKey: string; action: PermissionAction | "all" };
    result: void;
  };
}

declare module "../../phanQuyenHandler" {
  interface PhanQuyenEvents extends TogglePermissionEvent {}
}
