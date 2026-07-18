import { Button, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useVaiTroHandler, useVaiTroState } from "../../VaiTroHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import "./VaiTroHeader.state";

interface VaiTroHeaderProps {
  settingsButton?: React.ReactNode;
}

export function VaiTroHeader({ settingsButton }: VaiTroHeaderProps) {
  const handler = useVaiTroHandler();
  const [loading] = useVaiTroState("loading", false);
  const { canCreate } = usePagePermission("/cau-hinh/vai-tro");

  const handleAdd = () => {
    handler.executeEvent("openModal", {});
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quản lý Vai trò</h1>
        <p className="text-muted-foreground">Quản lý các vai trò và phân quyền trong hệ thống</p>
      </div>
      <Space>
        {settingsButton}
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            loading={loading}
          >
            Thêm vai trò
          </Button>
        )}
      </Space>
    </div>
  );
}
