import { Card, Checkbox, Spin } from "antd";
import { usePhanQuyenHandler, usePhanQuyenState } from "../../PhanQuyenHandlerContext";
import {
  permissionModules,
  PERMISSION_ACTIONS,
  PermissionModule,
  PermissionAction,
} from "../../constants/permissionModules";
import { ModulePermission, collectLeafModules } from "../../utils/permissionConverter";
import "./PermissionMatrix.state";

function getActionState(
  permissions: ModulePermission[],
  keys: string[],
  action: PermissionAction
): { checked: boolean; indeterminate: boolean } {
  let trueCount = 0;
  let total = 0;
  for (const key of keys) {
    const perm = permissions.find((p) => p.moduleKey === key);
    if (perm) {
      total++;
      if (perm.actions[action]) trueCount++;
    }
  }
  if (total === 0) return { checked: false, indeterminate: false };
  return {
    checked: trueCount === total,
    indeterminate: trueCount > 0 && trueCount < total,
  };
}

function getAllState(
  permissions: ModulePermission[],
  keys: string[]
): { checked: boolean; indeterminate: boolean } {
  let allTrue = 0;
  let total = 0;
  for (const key of keys) {
    const perm = permissions.find((p) => p.moduleKey === key);
    if (perm) {
      for (const a of PERMISSION_ACTIONS) {
        total++;
        if (perm.actions[a.key]) allTrue++;
      }
    }
  }
  if (total === 0) return { checked: false, indeterminate: false };
  return {
    checked: allTrue === total,
    indeterminate: allTrue > 0 && allTrue < total,
  };
}

function SectionRow({ mod }: { mod: PermissionModule }) {
  return (
    <tr>
      <td
        colSpan={7}
        style={{
          backgroundColor: "#f0f0f0",
          fontWeight: 700,
          padding: "10px 12px",
          fontSize: 13,
          letterSpacing: "0.5px",
        }}
      >
        {mod.label}
      </td>
    </tr>
  );
}

function ParentRow({
  mod,
  permissions,
  handler,
  depth,
}: {
  mod: PermissionModule;
  permissions: ModulePermission[];
  handler: ReturnType<typeof usePhanQuyenHandler>;
  depth: number;
}) {
  const leafKeys = collectLeafModules([mod]);
  const allState = getAllState(permissions, leafKeys);

  return (
    <tr style={{ backgroundColor: depth === 1 ? "#fafafa" : undefined }}>
      <td
        style={{
          padding: "8px 12px",
          paddingLeft: 12 + depth * 20,
          fontWeight: 600,
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        {mod.label}
      </td>
      <td style={{ textAlign: "center", borderBottom: "1px solid #f0f0f0" }}>
        <Checkbox
          checked={allState.checked}
          indeterminate={allState.indeterminate}
          onChange={() =>
            handler.executeEvent("togglePermission", {
              moduleKey: mod.key,
              action: "all",
            })
          }
        />
      </td>
      {PERMISSION_ACTIONS.map((action) => {
        const state = getActionState(permissions, leafKeys, action.key);
        return (
          <td
            key={action.key}
            style={{ textAlign: "center", borderBottom: "1px solid #f0f0f0" }}
          >
            <Checkbox
              checked={state.checked}
              indeterminate={state.indeterminate}
              onChange={() =>
                handler.executeEvent("togglePermission", {
                  moduleKey: mod.key,
                  action: action.key,
                })
              }
            />
          </td>
        );
      })}
    </tr>
  );
}

function LeafRow({
  mod,
  permissions,
  handler,
  depth,
  isEven,
}: {
  mod: PermissionModule;
  permissions: ModulePermission[];
  handler: ReturnType<typeof usePhanQuyenHandler>;
  depth: number;
  isEven: boolean;
}) {
  const perm = permissions.find((p) => p.moduleKey === mod.key);
  if (!perm) return null;

  const allChecked = PERMISSION_ACTIONS.every((a) => perm.actions[a.key]);
  const someChecked = PERMISSION_ACTIONS.some((a) => perm.actions[a.key]);

  return (
    <tr style={{ backgroundColor: isEven ? "#fafbfc" : "#ffffff" }}>
      <td
        style={{
          padding: "8px 12px",
          paddingLeft: 12 + depth * 20,
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        {mod.label}
      </td>
      <td style={{ textAlign: "center", borderBottom: "1px solid #f0f0f0" }}>
        <Checkbox
          checked={allChecked}
          indeterminate={!allChecked && someChecked}
          onChange={() =>
            handler.executeEvent("togglePermission", {
              moduleKey: mod.key,
              action: "all",
            })
          }
        />
      </td>
      {PERMISSION_ACTIONS.map((action) => (
        <td
          key={action.key}
          style={{ textAlign: "center", borderBottom: "1px solid #f0f0f0" }}
        >
          <Checkbox
            checked={perm.actions[action.key]}
            onChange={() =>
              handler.executeEvent("togglePermission", {
                moduleKey: mod.key,
                action: action.key,
              })
            }
          />
        </td>
      ))}
    </tr>
  );
}

function renderModuleRows(
  modules: PermissionModule[],
  permissions: ModulePermission[],
  handler: ReturnType<typeof usePhanQuyenHandler>,
  depth: number,
  counter: { value: number }
): React.ReactNode[] {
  const rows: React.ReactNode[] = [];

  for (const mod of modules) {
    if (mod.isSection) {
      rows.push(<SectionRow key={`section-${mod.key}`} mod={mod} />);
      if (mod.children) {
        rows.push(
          ...renderModuleRows(mod.children, permissions, handler, depth, counter)
        );
      }
    } else if (mod.children) {
      rows.push(
        <ParentRow
          key={`parent-${mod.key}`}
          mod={mod}
          permissions={permissions}
          handler={handler}
          depth={depth}
        />
      );
      rows.push(
        ...renderModuleRows(
          mod.children,
          permissions,
          handler,
          depth + 1,
          counter
        )
      );
    } else {
      counter.value++;
      rows.push(
        <LeafRow
          key={`leaf-${mod.key}`}
          mod={mod}
          permissions={permissions}
          handler={handler}
          depth={depth}
          isEven={counter.value % 2 === 0}
        />
      );
    }
  }

  return rows;
}

export function PermissionMatrix() {
  const handler = usePhanQuyenHandler();
  const [permissions] = usePhanQuyenState("permissions", []);
  const [loading] = usePhanQuyenState("loading", false);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  const counter = { value: 0 };

  return (
    <Card
      style={{ height: "100%" }}
      styles={{ body: { height: "100%", padding: 0, overflow: "auto" } }}
    >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
            <tr style={{ backgroundColor: "#fafafa" }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderBottom: "2px solid #e8e8e8",
                  fontWeight: 600,
                  backgroundColor: "#fafafa",
                }}
              >
                Module
              </th>
              <th
                style={{
                  textAlign: "center",
                  padding: "12px 4px",
                  borderBottom: "2px solid #e8e8e8",
                  fontWeight: 600,
                  width: 50,
                  whiteSpace: "nowrap",
                  backgroundColor: "#fafafa",
                }}
              >
                Tất cả
              </th>
              {PERMISSION_ACTIONS.map((action) => (
                <th
                  key={action.key}
                  style={{
                    textAlign: "center",
                    padding: "12px 4px",
                    borderBottom: "2px solid #e8e8e8",
                    fontWeight: 600,
                    width: 50,
                    whiteSpace: "nowrap",
                    backgroundColor: "#fafafa",
                  }}
                >
                  {action.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderModuleRows(
              permissionModules,
              permissions,
              handler,
              1,
              counter
            )}
          </tbody>
        </table>
    </Card>
  );
}
