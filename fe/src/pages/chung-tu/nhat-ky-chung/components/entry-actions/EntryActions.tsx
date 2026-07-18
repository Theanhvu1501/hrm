import { Space, Button, Tooltip, Popconfirm } from "antd";
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { usePagePermission } from "@/hooks/usePagePermission";
import { NhatKyChung } from "@/types";
import {
  useNhatKyChungHandler,
  useNhatKyChungState,
} from "../../NhatKyChungHandlerContext";

interface EntryActionsProps {
  entry: NhatKyChung;
}

export function EntryActions({ entry }: EntryActionsProps) {
  const navigate = useNavigate();
  const handler = useNhatKyChungHandler();
  const { canEdit, canDelete } = usePagePermission("/chung-tu/nhat-ky-chung");

  // Row edit state (for inline edit via double-click)
  const [editingRowId] = useNhatKyChungState("editingRowId", null);
  const [savingRow] = useNhatKyChungState("savingRow", false);

  // Check if this row is being edited
  const isThisRowEditing = editingRowId === entry.id;

  // Check if another row is being edited
  const isOtherRowEditing = editingRowId && editingRowId !== entry.id;

  // Check if entry is approved (cannot edit/delete)
  const isApproved = (entry as any).trangThai === "DA_DUYET";

  const handleView = () => {
    handler.executeEvent("openViewModal", { entry });
  };

  // Navigate to edit page (for Edit button)
  const handleEdit = () => {
    navigate(`/chung-tu/nhat-ky-chung/${encodeURIComponent(entry.soPhieu)}/sua`);
  };

  // Inline row edit handlers (for double-click)
  const handleSaveRow = () => {
    handler.executeEvent("saveEditRow", {});
  };

  const handleCancelRow = () => {
    handler.executeEvent("cancelEditRow", {});
  };

  const handleDelete = () => {
    handler.executeEvent("deleteEntry", { id: entry.id });
  };

  // If this row is being edited (via double-click), show Save/Cancel buttons
  if (isThisRowEditing) {
    return (
      <Space size="small">
        <Tooltip title="Lưu">
          <Button
            type="text"
            size="small"
            icon={<CheckOutlined />}
            onClick={handleSaveRow}
            loading={savingRow}
            className="!text-green-600 hover:!text-green-700"
          />
        </Tooltip>

        <Tooltip title="Hủy">
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={handleCancelRow}
            disabled={savingRow}
            className="!text-red-600 hover:!text-red-700"
          />
        </Tooltip>
      </Space>
    );
  }

  // Normal mode - show View/Edit/Delete buttons
  return (
    <Space size="small">
      <Tooltip title="Xem">
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={handleView}
          disabled={isOtherRowEditing}
        />
      </Tooltip>

      {canEdit && (isApproved ? (
        <Tooltip title="Không thể sửa bút toán đã duyệt">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            disabled
          />
        </Tooltip>
      ) : (
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
onClick={handleEdit}
          disabled={isOtherRowEditing}
        />
      ))}

      {canDelete && (
        <Popconfirm
          title="Xác nhận xóa bút toán này?"
          onConfirm={handleDelete}
          okText="Xóa"
          cancelText="Hủy"
          disabled={isApproved || isOtherRowEditing}
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            disabled={isApproved || isOtherRowEditing}
            className={isApproved || isOtherRowEditing ? "" : "!text-destructive"}
          />
        </Popconfirm>
      )}
    </Space>
  );
}
