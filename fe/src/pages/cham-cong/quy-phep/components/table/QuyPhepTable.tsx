import { useEffect } from "react";
import { Table, Button, Tag, Space, Select, Modal, Form, InputNumber, Input } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuyPhepHandler, useQuyPhepState } from "../../QuyPhepHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { LeaveBalance } from "@/services/leaveBalanceService";
import { homNayVN } from "@/ultils/thoiGianVN";
import { nhanTrangThaiQuy, sapHetHan } from "../../nhanQuy";
import "./QuyPhepTable.state";

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
    { title: "Mã NV", dataIndex: "employeeCode", key: "employeeCode", width: 100 },
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
      render: (v: string) => (
        <Tag color={v === "dang_hieu_luc" ? "green" : "default"}>{nhanTrangThaiQuy(v)}</Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "thaoTac",
      width: 190,
      render: (_: unknown, record: LeaveBalance) => (
        <Space>
          <Button
            size="small"
            onClick={() => handler.executeEvent("moSoBienDong", { quy: record })}
          >
            Sổ biến động
          </Button>
          {canEdit && (
            <Button size="small" onClick={() => moDieuChinh(record)}>
              Điều chỉnh
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quỹ phép năm</h1>
          <p className="text-muted-foreground">
            Chu kỳ phép năm: cấp đầu năm, theo dõi số dư, đóng quỹ năm cũ
          </p>
        </div>
        <Space wrap>
          <Select
            value={namLoc}
            style={{ width: 140 }}
            options={DS_NAM.map((n) => ({ value: n, label: `Năm ${n}` }))}
            onChange={(v) => handler.executeEvent("doiNamLoc", { nam: v })}
          />
          {canCreate && (
            <Button
              type="primary"
              loading={dangXuLy}
              onClick={() => handler.executeEvent("moXemTruoc", { loai: "cap_dau_nam", nam: namLoc })}
            >
              Cấp phép đầu năm
            </Button>
          )}
          {canEdit && (
            <Button
              danger
              loading={dangXuLy}
              onClick={() => handler.executeEvent("moXemTruoc", { loai: "dong_quy", nam: namLoc })}
            >
              Đóng quỹ năm {namLoc}
            </Button>
          )}
        </Space>
      </div>

      <Table<LeaveBalance>
        columns={columns}
        dataSource={danhSach}
        rowKey="id"
        loading={dangTai}
        pagination={{ pageSize: 15 }}
        bordered
        scroll={{ x: "max-content" }}
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
    </div>
  );
}
