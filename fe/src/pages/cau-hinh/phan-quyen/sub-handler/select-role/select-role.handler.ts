import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { phanQuyenService } from "@/services/phanQuyenService";
import { message } from "antd";
import { convertPermissionsToMatrix } from "../../utils/permissionConverter";
import "./select-role.event";

@RegisterHandler("phan-quyen-context")
export class SelectRoleHandler extends CSubHanlder {
  @HandlerDecorator("selectRole")
  async selectRole(params: { roleId: string }): Promise<void> {
    this.setState("selectedRoleId", params.roleId);
    this.setState("loading", true);

    try {
      const permissionsArray = await phanQuyenService.getPermissionsByVaiTro(params.roleId);
      this.setState("permissions", convertPermissionsToMatrix(permissionsArray));
    } catch (error) {
      message.error("Không thể tải quyền cho vai trò này");
      console.error("Select role permissions error:", error);
      this.setState("permissions", convertPermissionsToMatrix([]));
    } finally {
      this.setState("loading", false);
    }
  }
}
