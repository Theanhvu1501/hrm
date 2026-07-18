import { permissionModules, PermissionModule, PermissionAction, PERMISSION_ACTIONS } from "../constants/permissionModules";

export interface ModulePermission {
  moduleKey: string;
  actions: Record<PermissionAction, boolean>;
}

export function collectLeafModules(modules: PermissionModule[]): string[] {
  const keys: string[] = [];
  for (const mod of modules) {
    if (mod.children) {
      keys.push(...collectLeafModules(mod.children));
    } else {
      keys.push(mod.key);
    }
  }
  return keys;
}

/**
 * Convert permissions string array from API (e.g. ["/danh-muc/tai-khoan:xem"])
 * to ModulePermission[] format used by the matrix UI.
 */
export function convertPermissionsToMatrix(permissionsArray: string[]): ModulePermission[] {
  const permissionSet = new Set(permissionsArray);
  const leafKeys = collectLeafModules(permissionModules);

  return leafKeys.map((moduleKey) => {
    const actions = {} as Record<PermissionAction, boolean>;
    for (const { key } of PERMISSION_ACTIONS) {
      actions[key] = permissionSet.has(`/${moduleKey}:${key}`) || permissionSet.has(`${moduleKey}:${key}`);
    }
    return { moduleKey, actions };
  });
}

/**
 * Convert ModulePermission[] from the matrix UI back to string array format
 * for saving to API (e.g. ["/danh-muc/tai-khoan:xem", "/danh-muc/tai-khoan:them"])
 */
export function convertMatrixToPermissions(modulePermissions: ModulePermission[]): string[] {
  const permissions: string[] = [];
  for (const { moduleKey, actions } of modulePermissions) {
    const normalizedKey = moduleKey.startsWith('/') ? moduleKey : `/${moduleKey}`;
    for (const { key } of PERMISSION_ACTIONS) {
      if (actions[key]) {
        permissions.push(`${normalizedKey}:${key}`);
      }
    }
  }
  return permissions;
}
