import { Select } from "antd";
import { usePhanQuyenHandler, usePhanQuyenState } from "../../PhanQuyenHandlerContext";
import "./PhanQuyenHeader.state";

export function PhanQuyenHeader() {
  const handler = usePhanQuyenHandler();
  const [selectedRoleId] = usePhanQuyenState("selectedRoleId", null);
  const [roleOptions] = usePhanQuyenState("roleOptions", []);

  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">Thiết lập Phân quyền</h1>
      <Select
        style={{ width: 240 }}
        placeholder="Chọn vai trò"
        value={selectedRoleId}
        onChange={(value: string) => handler.executeEvent("selectRole", { roleId: value })}
        options={roleOptions.map((role) => ({
          value: role.id,
          label: role.ten,
        }))}
      />
    </div>
  );
}
