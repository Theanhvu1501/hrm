import { Table, Button, Tag, Space, Tabs, Popconfirm, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useThietBiHandler, useThietBiState } from "../../ThietBiHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { EmployeeDevice } from "@/services/employeeDeviceService";
import { ngayGioVN } from "@/ultils/thoiGianVN";
import {
  TRANG_THAI_OPTIONS,
  TRANG_THAI_TAG_COLOR,
  TAB_OPTIONS,
  labelFor,
} from "../../constants";
import "./ThietBiTable.state";

export function ThietBiTable() {
  const handler = useThietBiHandler();
  const [deviceList] = useThietBiState("deviceList", [] as EmployeeDevice[]);
  const [loading] = useThietBiState("loading", false);
  const [tab] = useThietBiState("tab", "cho_duyet");
  const { canEdit } = usePagePermission("/cham-cong/thiet-bi");

  const columns: ColumnsType<EmployeeDevice> = [
    {
      title: "Nhân viên",
      key: "nhanVien",
      render: (_: unknown, r: EmployeeDevice) =>
        `${r.employeeName ?? ""} (${r.employeeCode ?? ""})`,
    },
    {
      title: "Tên thiết bị",
      dataIndex: "tenThietBi",
      key: "tenThietBi",
      render: (v?: string) =>
        v || <span className="text-muted-foreground">Chưa đặt tên</span>,
    },
    {
      title: "Trình duyệt",
      dataIndex: "userAgent",
      key: "userAgent",
      ellipsis: true,
      render: (v?: string) => (
        <Tooltip title={v}>
          <span className="text-xs text-muted-foreground">{v}</span>
        </Tooltip>
      ),
    },
    {
      title: "Đăng ký lúc",
      dataIndex: "lanDauDangKy",
      key: "lanDauDangKy",
      width: 170,
      render: ngayGioVN,
    },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 130,
      render: (v: string) => (
        <Tag color={TRANG_THAI_TAG_COLOR[v] || "default"}>
          {labelFor(TRANG_THAI_OPTIONS, v)}
        </Tag>
      ),
    },
    {
      title: "Hành động",
      key: "thaoTac",
      width: 220,
      render: (_: unknown, r: EmployeeDevice) => {
        if (!canEdit) return null;
        return (
          <Space>
            {r.trangThai === "cho_duyet" && (
              <>
                <Popconfirm
                  title="Duyệt thiết bị này?"
                  description={`Duyệt sẽ thu hồi thiết bị cũ (nếu có) đang dùng của ${
                    r.employeeName ?? "nhân viên"
                  } — nhân viên đó sẽ không chấm công được từ máy cũ nữa.`}
                  okText="Duyệt"
                  cancelText="Huỷ"
                  onConfirm={() =>
                    handler.executeEvent("duyetThietBi", { id: r.id })
                  }
                >
                  <Button type="primary" size="small">
                    Duyệt
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="Từ chối thiết bị này?"
                  okText="Từ chối"
                  cancelText="Huỷ"
                  onConfirm={() =>
                    handler.executeEvent("tuChoiThietBi", { id: r.id })
                  }
                >
                  <Button size="small" danger>
                    Từ chối
                  </Button>
                </Popconfirm>
              </>
            )}
            {r.trangThai === "da_duyet" && (
              <Popconfirm
                title="Thu hồi thiết bị này?"
                description="Nhân viên sẽ không chấm công được cho tới khi đăng ký và được duyệt máy mới."
                okText="Thu hồi"
                cancelText="Huỷ"
                onConfirm={() =>
                  handler.executeEvent("thuHoiThietBi", { id: r.id })
                }
              >
                <Button size="small" danger>
                  Thu hồi
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Thiết bị chấm công</h1>
        <p className="text-muted-foreground">
          Hàng đợi duyệt thiết bị — quyết định máy nào được phép chấm công cho từng nhân viên
        </p>
      </div>

      <Tabs
        activeKey={tab}
        onChange={(k) => handler.executeEvent("doiTab", { trangThai: k })}
        items={TAB_OPTIONS.map((o) => ({ key: o.value, label: o.label }))}
      />

      <Table<EmployeeDevice>
        columns={columns}
        rowKey="id"
        loading={loading}
        dataSource={deviceList}
        pagination={{ pageSize: 10 }}
        bordered
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}
