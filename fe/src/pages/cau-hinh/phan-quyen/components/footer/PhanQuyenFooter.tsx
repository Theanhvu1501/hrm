import { Button } from "antd";
import { usePhanQuyenHandler } from "../../PhanQuyenHandlerContext";

export function PhanQuyenFooter() {
  const handler = usePhanQuyenHandler();

  return (
    <div className="flex justify-end pt-3 shrink-0">
      <Button
        type="primary"
        onClick={() => handler.executeEvent("savePermissions", {})}
      >
        Lưu thay đổi
      </Button>
    </div>
  );
}
