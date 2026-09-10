import { Card, Button, Space, Tabs, Popconfirm, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useThietBiHandler, useThietBiState } from "../../ThietBiHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmployeeDevice } from "@/services/employeeDeviceService";
import { ngayGioVN } from "@/ultils/thoiGianVN";
import {
  TRANG_THAI_OPTIONS,
  TRANG_THAI_TONE,
  TAB_OPTIONS,
  labelFor,
  choPhepKichHoatLai,
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
        r.employeeCode
          ? `${r.employeeName ?? ""} (${r.employeeCode})`
          : r.employeeName ?? "",
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
      align: "center",
      render: (v: string) => (
        <StatusPill tone={TRANG_THAI_TONE[v] ?? "trung-tinh"}>
          {labelFor(TRANG_THAI_OPTIONS, v)}
        </StatusPill>
      ),
    },
    // Cột này là dấu vết vì sao máy từng bị chặn — HR cần đọc TRƯỚC khi bấm
    // mở lại. Trên tab "Đang dùng" nó còn cho biết máy đang chạy này từng bị
    // khoá (BE cố ý không xoá `lyDoThuHoi` khi kích hoạt lại). Ẩn ở tab "Chờ
    // duyệt" vì dòng chưa từng bị khoá, cột luôn rỗng.
    ...(tab === "cho_duyet"
      ? []
      : [
          {
            title: "Lý do khoá",
            dataIndex: "lyDoThuHoi",
            key: "lyDoThuHoi",
            ellipsis: true,
            render: (v?: string) =>
              v || <span className="text-muted-foreground">—</span>,
          } as ColumnsType<EmployeeDevice>[number],
        ]),
    {
      title: "Thao tác",
      key: "thaoTac",
      width: 200,
      align: "center",
      fixed: "right",
      // Nút chữ (không phải icon) — mỗi nút là một quyết định có hậu quả lên
      // máy của nhân viên, đọc nhãn rõ hơn đoán icon.
      render: (_: unknown, r: EmployeeDevice) => {
        if (!canEdit) return null;
        return (
          <Space size="small">
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
            {choPhepKichHoatLai(r.trangThai) && (
              <Popconfirm
                title="Kích hoạt lại thiết bị này?"
                description={`Máy này sẽ chấm công được ngay. Thiết bị khác (nếu có) đang dùng của ${
                  r.employeeName ?? "nhân viên"
                } sẽ bị thu hồi — mỗi nhân viên chỉ dùng được một máy.`}
                okText="Kích hoạt lại"
                cancelText="Huỷ"
                onConfirm={() =>
                  handler.executeEvent("kichHoatLaiThietBi", { id: r.id })
                }
              >
                <Button type="primary" size="small">
                  Kích hoạt lại
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Card>
      {/* Tab trạng thái chính là bộ lọc của trang — hàng đợi duyệt. */}
      <Tabs
        activeKey={tab}
        onChange={(k) => handler.executeEvent("doiTab", { trangThai: k })}
        items={TAB_OPTIONS.map((o) => ({ key: o.value, label: o.label }))}
      />

      <BangDuLieu<EmployeeDevice>
        columns={columns}
        rowKey="id"
        loading={loading}
        dataSource={deviceList}
        buTruDoc={300}
        pagination={{
          defaultPageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ["25", "50", "100", "200"],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} thiết bị`,
        }}
      />
    </Card>
  );
}
