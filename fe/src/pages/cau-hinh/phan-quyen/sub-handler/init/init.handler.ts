import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { phanQuyenService } from "@/services/phanQuyenService";
import { vaiTroService } from "@/services/vaiTroService";
import { message } from "antd";
import { convertPermissionsToMatrix } from "../../utils/permissionConverter";
import "./init.event";

@RegisterHandler("phan-quyen-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    try {
      const vaiTroList = await vaiTroService.getAll();
      const roleOptions = vaiTroList.map((vt) => ({
        id: vt.ten,
        ten: vt.ten,
      }));

      this.setState("roleOptions", roleOptions);

      if (roleOptions.length > 0) {
        this.setState("selectedRoleId", roleOptions[0].id);

        try {
          const permissionsArray = await phanQuyenService.getPermissionsByVaiTro(roleOptions[0].id);
          this.setState("permissions", convertPermissionsToMatrix(permissionsArray));
        } catch {
          this.setState("permissions", convertPermissionsToMatrix([]));
        }
      } else {
        this.setState("selectedRoleId", "");
        this.setState("permissions", convertPermissionsToMatrix([]));
      }
    } catch (error) {
      message.error("Không thể tải danh sách vai trò");
      console.error("Init phan quyen error:", error);
    } finally {
      this.setState("loading", false);
    }
  }
}
