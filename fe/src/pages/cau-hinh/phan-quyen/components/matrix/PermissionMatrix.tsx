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

/**
 * BA bậc nền của bảng, đậm dần từ dưới lên: hàng lá chẵn → hàng cha cấp 1 →
 * hàng tiêu đề nhóm. Trước đây cả ba đều là `hsl(var(--muted))` nên tiêu đề
 * nhóm có nền y hệt hàng lá chẵn và cấu trúc bảng phẳng ra.
 *
 * Chọn theo token để chạy được ở CẢ hai theme (bản tối vừa được tách bậc
 * --card 17% / --muted 23% / --border 34%):
 *   sáng: #E6E6EA → #F3F4F6 → #FAFAFB (trên card trắng)
 *   tối:  #42526C → #29374C → #222F42 (trên card #1D283A)
 * Chênh lệch giữa hai bậc liền kề: 1.13 / 1.05 (sáng), 1.52 / 1.12 (tối).
 */
const NEN_TIEU_DE_NHOM = "hsl(var(--border))";
const NEN_HANG_CHA = "hsl(var(--muted))";
const NEN_HANG_LA_CHAN = "hsl(var(--muted) / 0.45)";

const VIEN_DUOI = "1px solid hsl(var(--border))";

/**
 * Hàng gộp — dùng chung cho hàng TIÊU ĐỀ NHÓM (phân hệ, `isSection`) và hàng
 * CHA (nhóm nhỏ trong Danh mục). Hai hàng chỉ khác nền, cỡ chữ và thụt lề; ô
 * tick "cả nhóm" thì y hệt nhau, nên gộp thay vì nuôi hai cơ chế.
 *
 * Trước đây hàng tiêu đề nhóm là một ô `colSpan={7}` KHÔNG có ô tick. Hồi còn
 * 3 nhóm kỹ thuật thì ít ai để ý; từ khi ma trận tách theo 12 phân hệ nghiệp
 * vụ, 11 nhóm không tick cả nhóm được nghĩa là admin phải tick tay từng khoá.
 *
 * `togglePermission` đã sẵn sàng nhận khoá của một nhóm: nó tìm module theo
 * khoá rồi gom mọi lá con (`collectLeafModules`) — không cần đường xử lý riêng.
 */
function NhomRow({
  mod,
  permissions,
  handler,
  depth,
  laTieuDeNhom,
}: {
  mod: PermissionModule;
  permissions: ModulePermission[];
  handler: ReturnType<typeof usePhanQuyenHandler>;
  depth: number;
  laTieuDeNhom?: boolean;
}) {
  const leafKeys = collectLeafModules([mod]);
  const allState = getAllState(permissions, leafKeys);
  const nenHang = laTieuDeNhom
    ? NEN_TIEU_DE_NHOM
    : depth === 1
      ? NEN_HANG_CHA
      : undefined;
  const vien = laTieuDeNhom ? undefined : VIEN_DUOI;

  return (
    <tr style={{ backgroundColor: nenHang }}>
      <td
        style={
          laTieuDeNhom
            ? {
                padding: "10px 12px",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.5px",
              }
            : {
                padding: "8px 12px",
                paddingLeft: 12 + depth * 20,
                fontWeight: 600,
                borderBottom: VIEN_DUOI,
              }
        }
      >
        {mod.label}
      </td>
      <td style={{ textAlign: "center", borderBottom: vien }}>
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
            style={{ textAlign: "center", borderBottom: vien }}
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
    <tr style={{ backgroundColor: isEven ? NEN_HANG_LA_CHAN : "hsl(var(--card))" }}>
      <td
        style={{
          padding: "8px 12px",
          paddingLeft: 12 + depth * 20,
          borderBottom: "1px solid hsl(var(--border))",
        }}
      >
        {mod.label}
      </td>
      <td style={{ textAlign: "center", borderBottom: "1px solid hsl(var(--border))" }}>
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
          style={{ textAlign: "center", borderBottom: "1px solid hsl(var(--border))" }}
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
      rows.push(
        <NhomRow
          key={`section-${mod.key}`}
          mod={mod}
          permissions={permissions}
          handler={handler}
          depth={depth}
          laTieuDeNhom
        />
      );
      if (mod.children) {
        rows.push(
          ...renderModuleRows(mod.children, permissions, handler, depth, counter)
        );
      }
    } else if (mod.children) {
      rows.push(
        <NhomRow
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
            <tr style={{ backgroundColor: "hsl(var(--muted))" }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px",
                  borderBottom: "2px solid hsl(var(--border))",
                  fontWeight: 600,
                  backgroundColor: "hsl(var(--muted))",
                }}
              >
                Module
              </th>
              <th
                style={{
                  textAlign: "center",
                  padding: "12px 4px",
                  borderBottom: "2px solid hsl(var(--border))",
                  fontWeight: 600,
                  width: 50,
                  whiteSpace: "nowrap",
                  backgroundColor: "hsl(var(--muted))",
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
                    borderBottom: "2px solid hsl(var(--border))",
                    fontWeight: 600,
                    width: 50,
                    whiteSpace: "nowrap",
                    backgroundColor: "hsl(var(--muted))",
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
