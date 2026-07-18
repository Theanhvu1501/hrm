import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";

declare module "../../phanQuyenHandler" {
  interface PhanQuyenStates {
    selectedRoleId: string | null;
    roleOptions: { id: string; ten: string }[];
  }
}
