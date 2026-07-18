import { ModulePermission } from "../../utils/permissionConverter";

declare module "../../phanQuyenHandler" {
  interface PhanQuyenStates {
    permissions: ModulePermission[];
    loading: boolean;
  }
}
