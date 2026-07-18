import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import {
  PermissionAction,
  PERMISSION_ACTIONS,
  permissionModules,
  PermissionModule,
} from "../../constants/permissionModules";
import { ModulePermission, collectLeafModules } from "../../utils/permissionConverter";
import "./toggle-permission.event";

function findModuleByKey(
  modules: PermissionModule[],
  key: string
): PermissionModule | null {
  for (const mod of modules) {
    if (mod.key === key) return mod;
    if (mod.children) {
      const found = findModuleByKey(mod.children, key);
      if (found) return found;
    }
  }
  return null;
}

@RegisterHandler("phan-quyen-context")
export class TogglePermissionHandler extends CSubHanlder {
  @HandlerDecorator("togglePermission")
  async togglePermission(params: {
    moduleKey: string;
    action: PermissionAction | "all";
  }): Promise<void> {
    const { moduleKey, action } = params;
    const permissions: ModulePermission[] = this.getState("permissions") || [];
    const updated = [...permissions.map((p) => ({ ...p, actions: { ...p.actions } }))];

    const targetModule = findModuleByKey(permissionModules, moduleKey);
    const targetKeys = targetModule?.children
      ? collectLeafModules([targetModule])
      : [moduleKey];

    if (action === "all") {
      const allTrue = targetKeys.every((key) => {
        const perm = updated.find((p) => p.moduleKey === key);
        return perm
          ? PERMISSION_ACTIONS.every((a) => perm.actions[a.key])
          : false;
      });

      const newValue = !allTrue;
      for (const key of targetKeys) {
        const perm = updated.find((p) => p.moduleKey === key);
        if (perm) {
          for (const a of PERMISSION_ACTIONS) {
            perm.actions[a.key] = newValue;
          }
        }
      }
    } else {
      const allTrue = targetKeys.every((key) => {
        const perm = updated.find((p) => p.moduleKey === key);
        return perm ? perm.actions[action] : false;
      });

      const newValue = !allTrue;
      for (const key of targetKeys) {
        const perm = updated.find((p) => p.moduleKey === key);
        if (perm) {
          perm.actions[action] = newValue;
        }
      }
    }

    this.setState("permissions", updated);
  }
}
