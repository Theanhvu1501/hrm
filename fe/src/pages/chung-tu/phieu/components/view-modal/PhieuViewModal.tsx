import dayjs from "dayjs";
import { Modal, Descriptions, Button } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import { usePhieuState } from "../../PhieuHandlerContext";
import { formatCurrency } from "../../lib/format";
import { usePrintPhieu } from "../../lib/usePrintPhieu";

export function PhieuViewModal() {
  const [phieu, setPhieu] = usePhieuState("viewModalPhieu", null);
  const print = usePrintPhieu();

  const tk = (
    t?: { ma: string; ten: string } | null
  ): string => (t ? `${t.ma} - ${t.ten}` : "-");

  return (
    <Modal
      title="Chi tiết phiếu"
      open={!!phieu}
      onCancel={() => setPhieu(null)}
      width={680}
      footer={[
        <Button key="close" onClick={() => setPhieu(null)}>
          Đóng
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={() => phieu && print(phieu)}
        >
          In / Xuất PDF
        </Button>,
      ]}
    >
      {phieu && (
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Số phiếu">{phieu.soPhieu}</Descriptions.Item>
          <Descriptions.Item label="Ngày">
            {dayjs(phieu.ngay).format("DD/MM/YYYY")}
          </Descriptions.Item>
          <Descriptions.Item label="Số tiền" span={2}>
            {formatCurrency(phieu.soTien)}
          </Descriptions.Item>
          <Descriptions.Item label="Nội dung" span={2}>
            {phieu.noiDung || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Người giao dịch">
            {phieu.nguoiGiaoDich || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Địa chỉ">
            {phieu.diaChi || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="TK Nợ">
            {tk(phieu.danhMuc?.taiKhoanNo)}
          </Descriptions.Item>
          <Descriptions.Item label="TK Có">
            {tk(phieu.danhMuc?.taiKhoanCo)}
          </Descriptions.Item>
          <Descriptions.Item label="Đối tượng">
            {phieu.danhMuc?.doiTuong?.ten || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Dự án">
            {phieu.danhMuc?.duAn?.ten || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Bộ phận">
            {phieu.danhMuc?.boPhan?.ten || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Sản phẩm">
            {phieu.danhMuc?.sanPham?.ten || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Dòng tiền">
            {phieu.danhMuc?.dongTien?.ten || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Ghi chú">
            {phieu.ghiChu || "-"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  );
}
