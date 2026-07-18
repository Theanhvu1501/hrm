import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { phanQuyenService } from "@/services/phanQuyenService";
import { message } from "antd";
import { convertMatrixToPermissions, ModulePermission } from "../../utils/permissionConverter";
import "./save.event";

@RegisterHandler("phan-quyen-context")
export class SaveHandler extends CSubHanlder {
  @HandlerDecorator("savePermissions")
  async savePermissions(): Promise<void> {
    const selectedRoleId = this.getState("selectedRoleId") as string;
    const permissions = this.getState("permissions") as ModulePermission[];

    if (!selectedRoleId) {
      message.error("Vui lòng chọn vai trò");
      return;
    }

    try {
      const permissionsArray = convertMatrixToPermissions(permissions);
      await phanQuyenService.savePermissions(selectedRoleId, permissionsArray);
      message.success("Đã lưu phân quyền thành công!");
    } catch (error) {
      message.error("Không thể lưu phân quyền");
      console.error("Save permissions error:", error);
    }
  }
}
