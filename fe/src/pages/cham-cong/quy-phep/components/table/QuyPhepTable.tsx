import { useEffect } from "react";
import {
  Card,
  Button,
  Tag,
  Space,
  Select,
  Modal,
  Form,
  InputNumber,
  Input,
  Tooltip,
  Typography,
} from "antd";
import { EditOutlined, HistoryOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useQuyPhepHandler, useQuyPhepState } from "../../QuyPhepHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { FilterBar } from "@/components/common/FilterBar";
import { BangDuLieu } from "@/components/table/BangDuLieu";
import { StatusPill } from "@/components/ui/StatusPill";
import { DongDuKienPhep, LeaveBalance } from "@/services/leaveBalanceService";
import { homNayVN } from "@/ultils/thoiGianVN";
import { TONE_TRANG_THAI_QUY, nhanTrangThaiQuy, oDuKien, sapHetHan } from "../../nhanQuy";
import "./QuyPhepTable.state";

const { Text } = Typography;

const NAM_HIEN_TAI = Number(homNayVN().slice(0, 4));
const DS_NAM = [NAM_HIEN_TAI - 1, NAM_HIEN_TAI, NAM_HIEN_TAI + 1];

export function QuyPhepTable() {
  const handler = useQuyPhepHandler();
  const [danhSach] = useQuyPhepState("danhSach", [] as LeaveBalance[]);
  const [dangTai] = useQuyPhepState("dangTai", false);
  const [namLoc] = useQuyPhepState("namLoc", NAM_HIEN_TAI);
  const [dangXuLy] = useQuyPhepState("dangXuLy", false);
  // Modal điều chỉnh tay: state này SỐNG ở handler (không phải useState cục
  // bộ) vì đóng/mở phải do handler quyết định — lưu thất bại thì giữ modal
  // mở (xem thao-tac.handler.ts:dieuChinh) để người dùng không mất số liệu
  // vừa nhập, chỉ đóng khi lưu thành công.
  const [dieuChinhRecord] = useQuyPhepState("dieuChinhRecord", null as LeaveBalance | null);
  const { canCreate, canEdit } = usePagePermission("/cham-cong/quy-phep");
  // (P3.10) Dự kiến đọc từ bảng công CHƯA CHỐT — hiển thị để NV biết trước,
  // nhưng KHÔNG nằm trong số dư. Nhãn phải nói rõ điều đó.
  const [duKien] = useQuyPhepState("duKien", {} as Record<string, DongDuKienPhep>);
  const [thangDuKien] = useQuyPhepState("thangDuKien", homNayVN().slice(0, 7));

  const [form] = Form.useForm<{ soNgay: number; ghiChu: string }>();

  const homNay = homNayVN();

  useEffect(() => {
    if (dieuChinhRecord) {
      form.setFieldsValue({ soNgay: 0, ghiChu: "" });
    }
  }, [dieuChinhRecord, form]);

  const moDieuChinh = (record: LeaveBalance) => {
    handler.executeEvent("moDieuChinh", { record });
  };

  const submitDieuChinh = async () => {
    if (!dieuChinhRecord) return;
    const values = await form.validateFields();
    await handler.executeEvent("dieuChinh", {
      employeeId: dieuChinhRecord.employeeId,
      balanceId: dieuChinhRecord.id,
      soNgay: values.soNgay,
      ghiChu: values.ghiChu,
    });
  };

  const columns: ColumnsType<LeaveBalance> = [
    {
      title: "Mã NV",
      dataIndex: "employeeCode",
      key: "employeeCode",
      width: 100,
      render: (v?: string) =>
        v ? (
          <Text strong className="text-primary">
            {v}
          </Text>
        ) : (
          "-"
        ),
    },
    { title: "Họ tên", dataIndex: "employeeName", key: "employeeName" },
    { title: "Năm", dataIndex: "nam", key: "nam", width: 80, align: "center" },
    { title: "Được cấp", dataIndex: "soNgayDuocCap", key: "soNgayDuocCap", width: 100, align: "right" },
    { title: "Đã dùng", dataIndex: "soNgayDaDung", key: "soNgayDaDung", width: 100, align: "right" },
    { title: "Chờ duyệt", dataIndex: "soNgayDangChoDuyet", key: "soNgayDangChoDuyet", width: 100, align: "right" },
    {
      title: "Còn lại",
      dataIndex: "soNgayConLai",
      key: "soNgayConLai",
      width: 100,
      align: "right",
      render: (v: number) => <strong>{v}</strong>,
    },
    {
      title: `Dự kiến ${thangDuKien.slice(5)}/${thangDuKien.slice(0, 4)}`,
      key: "duKien",
      width: 190,
      render: (_v: unknown, r: LeaveBalance) => {
        // Chỉ có nghĩa với quỹ của năm chứa tháng đang xét — quỹ năm khác
        // không tích từ bảng công tháng này.
        if (r.nam !== Number(thangDuKien.slice(0, 4))) return null;
        const o = oDuKien(duKien[r.employeeId]);
        switch (o.kieu) {
          case "khong_ap_dung":
            return <span className="text-muted-foreground text-xs">—</span>;
          case "da_tich":
            return <Tag color="green">Đã vào số dư</Tag>;
          case "dat":
            return (
              <span className="text-xs">
                <Tag color="blue">+{o.soNgay} ngày</Tag>
                {o.congHopLe}/{o.chuan} công — chưa chốt
              </span>
            );
          case "chua_dat":
            return (
              <span className="text-muted-foreground text-xs">
                Chưa đạt — {o.congHopLe}/{o.chuan} công, cần ≥{o.can}
              </span>
            );
        }
      },
    },
    {
      title: "Hạn dùng",
      dataIndex: "hanDung",
      key: "hanDung",
      width: 160,
      render: (v: string, record: LeaveBalance) =>
        sapHetHan({ hanDung: v, soNgayConLai: record.soNgayConLai }, homNay) ? (
          <Tag color="warning">{v} — sắp hết hạn</Tag>
        ) : (
          v
        ),
    },
    {
      title: "Trạng thái",
      dataIndex: "trangThai",
      key: "trangThai",
      width: 130,
      align: "center",
      render: (v: string) => (
        <StatusPill tone={TONE_TRANG_THAI_QUY[v] ?? "trung-tinh"}>
          {nhanTrangThaiQuy(v)}
        </StatusPill>
      ),
    },
    {
      title: "Thao tác",
      key: "thaoTac",
      width: 90,
      align: "center",
      fixed: "right",
      render: (_: unknown, record: LeaveBalance) => (
        <Space size="small">
          <Tooltip title="Sổ biến động">
            <Button
              type="text"
              icon={<HistoryOutlined />}
              onClick={() => handler.executeEvent("moSoBienDong", { quy: record })}
            />
          </Tooltip>
          {canEdit && (
            <Tooltip title="Điều chỉnh">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => moDieuChinh(record)}
                className="text-primary"
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <FilterBar
        filters={
          <Select
            value={namLoc}
            style={{ width: 140 }}
            options={DS_NAM.map((n) => ({ value: n, label: `Năm ${n}` }))}
            onChange={(v) => handler.executeEvent("doiNamLoc", { nam: v })}
          />
        }
        actions={
          <>
            {canEdit && (
              <Button
                danger
                loading={dangXuLy}
                onClick={() => handler.executeEvent("moXemTruoc", { loai: "dong_quy", nam: namLoc })}
              >
                Đóng quỹ năm {namLoc}
              </Button>
            )}
            {canCreate && (
              <Button
                type="primary"
                loading={dangXuLy}
                onClick={() => handler.executeEvent("moXemTruoc", { loai: "cap_dau_nam", nam: namLoc })}
              >
                Cấp phép đầu năm
              </Button>
            )}
          </>
        }
      />

      <BangDuLieu<LeaveBalance>
        columns={columns}
        dataSource={danhSach}
        rowKey="id"
        loading={dangTai}
        pagination={{
          defaultPageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ["25", "50", "100", "200"],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} quỹ phép`,
        }}
      />

      <Modal
        title={`Điều chỉnh quỹ phép — ${dieuChinhRecord?.employeeName ?? ""} — năm ${dieuChinhRecord?.nam ?? ""}`}
        open={!!dieuChinhRecord}
        onCancel={() => handler.executeEvent("dongDieuChinh", {})}
        onOk={submitDieuChinh}
        okText="Lưu"
        cancelText="Huỷ"
        okButtonProps={{ loading: dangXuLy }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="soNgay"
            label="Số ngày điều chỉnh (âm để trừ, dương để cộng)"
            rules={[{ required: true, message: "Vui lòng nhập số ngày" }]}
          >
            <InputNumber className="w-full" />
          </Form.Item>
          <Form.Item
            name="ghiChu"
            label="Lý do điều chỉnh"
            rules={[{ required: true, message: "Vui lòng nhập lý do" }]}
          >
            <Input.TextArea rows={2} placeholder="Ví dụ: bù công tác tháng 5" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
