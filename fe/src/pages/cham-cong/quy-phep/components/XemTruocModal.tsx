import { Modal, Table, Alert, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQuyPhepHandler, useQuyPhepState } from "../QuyPhepHandlerContext";
import { DongXemTruocCap, DongXemTruocDong } from "@/services/leaveBalanceService";
import { XemTruocData } from "./XemTruocModal.state";

/**
 * Modal xem trước DÙNG CHUNG cho "Cấp phép đầu năm" và "Đóng quỹ năm N".
 * Đây là màn hình BẮT BUỘC người dùng phải đi qua trước khi ghi dữ liệu —
 * nút "Xác nhận" ở đây là nơi DUY NHẤT phát sự kiện `xacNhanXemTruoc`
 * (xem thao-tac.handler.ts), nên không có nút nào khác trong màn hình gọi
 * thẳng service với xemTruoc:false.
 */
export function XemTruocModal() {
  const handler = useQuyPhepHandler();
  const [xemTruoc] = useQuyPhepState("xemTruoc", null as XemTruocData | null);
  const [dangXuLy] = useQuyPhepState("dangXuLy", false);

  const dangMoCap = xemTruoc?.loai === "cap_dau_nam";
  const dangMoDong = xemTruoc?.loai === "dong_quy";

  const handleHuy = () => handler.executeEvent("huyXemTruoc", {});
  const handleXacNhan = () => handler.executeEvent("xacNhanXemTruoc", {});

  const capColumns: ColumnsType<DongXemTruocCap> = [
    { title: "Mã NV", dataIndex: "employeeCode", key: "employeeCode", width: 100 },
    { title: "Họ tên", dataIndex: "employeeName", key: "employeeName" },
    { title: "Số ngày dự kiến cấp", dataIndex: "soNgay", key: "soNgay", width: 160, align: "right" },
    {
      title: "Trạng thái",
      key: "trangThai",
      width: 160,
      render: (_: unknown, r: DongXemTruocCap) =>
        r.daCoQuy ? (
          <Tag color="default">Đã có quỹ — bỏ qua</Tag>
        ) : (
          <Tag color="success">Sẽ cấp</Tag>
        ),
    },
  ];

  const dongColumns: ColumnsType<DongXemTruocDong> = [
    { title: "Mã NV", dataIndex: "employeeCode", key: "employeeCode", width: 100 },
    { title: "Họ tên", dataIndex: "employeeName", key: "employeeName" },
    {
      title: "Số ngày sẽ mất",
      dataIndex: "soNgayMat",
      key: "soNgayMat",
      width: 140,
      align: "right",
      render: (v: number) => <span className="text-red-600 font-medium">-{v}</span>,
    },
  ];

  const soNguoiSeCap = xemTruoc?.capRows.filter((r) => !r.daCoQuy).length ?? 0;
  const soNguoiDaCo = xemTruoc?.capRows.filter((r) => r.daCoQuy).length ?? 0;
  const soNguoiMatPhep = xemTruoc?.dongRows.length ?? 0;
  const tongNgayMat = xemTruoc?.dongRows.reduce((sum, r) => sum + (r.soNgayMat ?? 0), 0) ?? 0;

  return (
    <Modal
      title={
        dangMoCap
          ? `Xem trước cấp phép đầu năm ${xemTruoc?.nam}`
          : `Xem trước đóng quỹ năm ${xemTruoc?.nam}`
      }
      open={!!xemTruoc}
      onCancel={handleHuy}
      width={720}
      okText="Xác nhận"
      cancelText="Huỷ"
      okButtonProps={{ danger: dangMoDong, loading: dangXuLy }}
      onOk={handleXacNhan}
      destroyOnClose
    >
      {dangMoCap && (
        <>
          <Alert
            className="mb-3"
            type="info"
            showIcon
            message={`Sẽ cấp phép cho ${soNguoiSeCap} nhân viên.${
              soNguoiDaCo > 0 ? ` ${soNguoiDaCo} người đã có quỹ năm ${xemTruoc?.nam} nên sẽ bỏ qua.` : ""
            }`}
          />
          <Table<DongXemTruocCap>
            columns={capColumns}
            dataSource={xemTruoc?.capRows}
            rowKey="employeeId"
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ x: "max-content" }}
          />
        </>
      )}

      {dangMoDong && (
        <>
          <Alert
            className="mb-3"
            type="warning"
            showIcon
            message={`${soNguoiMatPhep} nhân viên sẽ MẤT tổng ${tongNgayMat} ngày phép chưa dùng của năm ${xemTruoc?.nam}.`}
            description="Hành động này không thể hoàn tác. Chỉ đóng quỹ khi chắc chắn năm đã kết thúc và không còn đơn nghỉ nào chờ duyệt cho năm đó."
          />
          <Table<DongXemTruocDong>
            columns={dongColumns}
            dataSource={xemTruoc?.dongRows}
            rowKey="balanceId"
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ x: "max-content" }}
          />
        </>
      )}
    </Modal>
  );
}
