import { BaseEvents } from "@/common";

export interface SelectRoleEvent extends BaseEvents {
  selectRole: { params: { roleId: string }; result: void };
}

declare module "../../phanQuyenHandler" {
  interface PhanQuyenEvents extends SelectRoleEvent {}
}
