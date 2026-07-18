import { Modal, Descriptions, Tag, Typography, Button, Dropdown } from "antd";
import {
  EyeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import type { ChungTu, LoaiChungTu } from "@/types";
import { phieuTemplateService } from "@/services/phieuTemplateService";
import { printPhieu } from "../../../phieu/lib/printPhieu";
import { getDefaultTemplate } from "../../../phieu/lib/printTemplates";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import "./EntryViewModal.state";

const { Text } = Typography;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

export function EntryViewModal() {
  const handler = useNhatKyChungHandler();
  const isMobile = useIsMobile();
  const { currentTenant } = useAuth();
  const [visible] = useNhatKyChungState("viewModalVisible", false);
  const [entry] = useNhatKyChungState("viewingEntry", null);

  const handleClose = () => {
    handler.executeEvent("closeViewModal", {});
  };

  if (!entry) return null;

  const isPhieuThu = entry.loaiChungTu === "Phiếu thu";
  const danhMuc = entry.danhMuc;

  // In bút toán theo mẫu config của Phiếu thu / Phiếu chi (chọn loại khi in).
  const handlePrint = async (loai: LoaiChungTu) => {
    let template: string;
    try {
      const tpl = await phieuTemplateService.getByLoai(loai);
      template = tpl?.html || getDefaultTemplate(loai);
    } catch {
      template = getDefaultTemplate(loai);
    }
    const phieu = {
      soPhieu: entry.soPhieu,
      ngay: entry.ngay,
      nguoiGiaoDich: entry.nguoiGiaoDich,
      diaChi: entry.diaChi,
      noiDung: entry.dienGiai,
      soTien: entry.soTien,
      ghiChu: entry.ghiChu,
      danhMuc: {
        taiKhoanNo: { ma: entry.taiKhoanNo ?? danhMuc?.taiKhoanNo?.ma },
        taiKhoanCo: { ma: entry.taiKhoanCo ?? danhMuc?.taiKhoanCo?.ma },
      },
    } as unknown as ChungTu;
    printPhieu(phieu, template, {
      tenCongTy: currentTenant?.tenantName ?? "",
      diaChiCongTy: "",
    });
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <EyeOutlined className="text-primary" />
          <span className="text-sm sm:text-base">Chi tiết bút toán</span>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={
        <div style={{ textAlign: "right" }}>
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "PHIEU_THU", label: "In phiếu thu" },
                { key: "PHIEU_CHI", label: "In phiếu chi" },
              ],
              onClick: ({ key }) => handlePrint(key as LoaiChungTu),
            }}
          >
            <Button type="primary" icon={<PrinterOutlined />}>
              In phiếu
            </Button>
          </Dropdown>
        </div>
      }
      width={isMobile ? "95%" : 1040}
      style={{ top: isMobile ? 10 : 20 }}
      styles={{
        body: {
          maxHeight: isMobile ? "calc(100vh - 100px)" : "calc(100vh - 150px)",
          overflowY: "auto",
          padding: isMobile ? "8px 12px" : "12px 24px",
        },
      }}
      className="entry-view-modal"
    >
      <Descriptions
        bordered
        column={isMobile ? 1 : 4}
        size="small"
        className="mt-2 sm:mt-4"
        labelStyle={isMobile ? { width: "40%", padding: "6px 8px", fontSize: "12px" } : undefined}
        contentStyle={isMobile ? { padding: "6px 8px", fontSize: "12px" } : undefined}
      >
        <Descriptions.Item label="Số phiếu" span={1}>
          <Text
            strong
            className={isPhieuThu ? "text-green-600" : "text-red-600"}
          >
            {entry.soPhieu}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Ngày Phát Sinh CT" span={1}>
          {dayjs(entry.ngay).format("DD/MM/YYYY")}
        </Descriptions.Item>
        <Descriptions.Item label="Ngày ghi sổ" span={1}>
          {dayjs(entry.ngayGhiSo || entry.ngay).format("DD/MM/YYYY")}
        </Descriptions.Item>
        <Descriptions.Item label="Thu/Chi" span={1}>
          <Tag color={isPhieuThu ? "success" : "error"}>
            {isPhieuThu ? <ArrowDownOutlined /> : <ArrowUpOutlined />}{" "}
            {entry.loaiChungTu}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Số tiền" span={1}>
          <Text
            strong
            className={isPhieuThu ? "text-green-600" : "text-red-600"}
          >
            {formatCurrency(entry.soTien)}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Nội dung" span={4}>
          {entry.dienGiai}
        </Descriptions.Item>
        <Descriptions.Item label="Nghiệp vụ" span={4}>
          {danhMuc?.loaiGiaoDich?.ten ? (
            <Tag color="geekblue">{danhMuc.loaiGiaoDich.ten}</Tag>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="TK Nợ" span={1}>
          <Tag color="volcano">{entry.taiKhoanNo}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="TK Có" span={1}>
          <Tag color="green">{entry.taiKhoanCo}</Tag>
        </Descriptions.Item>

        {/* Đối tượng nợ */}
        <Descriptions.Item label="Mã ĐT nợ" span={1}>
          {danhMuc?.doiTuong?.ma ? (
            <Text code>{danhMuc.doiTuong.ma}</Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Đối tượng nợ" span={1}>
          {danhMuc?.doiTuong?.ten || entry.doiTuong || (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        {/* Đối tượng có */}
        <Descriptions.Item label="Mã ĐT có" span={1}>
          {danhMuc?.doiTuong2?.ma ? (
            <Text code>{danhMuc.doiTuong2.ma}</Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Đối tượng có" span={1}>
          {danhMuc?.doiTuong2?.ten || entry.doiTuong2 || (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        {/* Chủ đầu tư */}
        <Descriptions.Item label="Mã chủ đầu tư" span={1}>
          {danhMuc?.duAn?.chuDauTuMa ? (
            <Text code>{danhMuc.duAn.chuDauTuMa}</Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Tên chủ đầu tư" span={1}>
          {danhMuc?.duAn?.chuDauTuTen || entry.chuDauTu || (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        {/* Dự án */}
        <Descriptions.Item label="Mã dự án" span={1}>
          {danhMuc?.duAn?.ma ? (
            <Text code>{danhMuc.duAn.ma}</Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Tên dự án" span={1}>
          {danhMuc?.duAn?.ten || entry.duAn ? (
            <Tag color="blue">{danhMuc?.duAn?.ten || entry.duAn}</Tag>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        {/* Sản phẩm */}
        <Descriptions.Item label="Mã sản phẩm" span={1}>
          {danhMuc?.sanPham?.ma ? (
            <Text code>{danhMuc.sanPham.ma}</Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Tên sản phẩm" span={1}>
          {danhMuc?.sanPham?.ten || entry.sanPham || (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        {/* Bộ phận */}
        <Descriptions.Item label="Mã bộ phận" span={1}>
          {danhMuc?.boPhan?.ma ? (
            <Text code>{danhMuc.boPhan.ma}</Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Tên bộ phận" span={1}>
          {danhMuc?.boPhan?.ten || entry.boPhan || (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        {/* Đội */}
        <Descriptions.Item label="Mã đội" span={1}>
          {danhMuc?.doi?.ma ? (
            <Text code>{danhMuc.doi.ma}</Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Tên đội" span={1}>
          {danhMuc?.doi?.ten || entry.doi ? (
            <Tag color="purple">{danhMuc?.doi?.ten || entry.doi}</Tag>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        {/* Nhân viên */}
        <Descriptions.Item label="Mã nhân viên" span={1}>
          {danhMuc?.nhanVien?.ma ? (
            <Text code>{danhMuc.nhanVien.ma}</Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Tên nhân viên" span={1}>
          {danhMuc?.nhanVien?.ten || entry.nhanVien || (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        {/* Dòng tiền */}
        <Descriptions.Item label="Mã dòng tiền" span={1}>
          {danhMuc?.dongTien?.ma ? (
            <Text code>{danhMuc.dongTien.ma}</Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Tên dòng tiền" span={1}>
          {danhMuc?.dongTien?.ten || entry.dongTien ? (
            <Tag color="cyan">{danhMuc?.dongTien?.ten || entry.dongTien}</Tag>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        {/* Nhóm khuyến mại */}
        <Descriptions.Item label="Mã nhóm KM" span={1}>
          {danhMuc?.nhomKhuyenMai?.ma ? (
            <Text code>{danhMuc.nhomKhuyenMai.ma}</Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Nhóm khuyến mại" span={1}>
          {danhMuc?.nhomKhuyenMai?.ten ? (
            <Tag color="magenta">{danhMuc.nhomKhuyenMai.ten}</Tag>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        {/* Nhóm quản lý */}
        <Descriptions.Item label="Mã nhóm QL" span={1}>
          {danhMuc?.nhomQuanLy?.ma ? (
            <Text code>{danhMuc.nhomQuanLy.ma}</Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Nhóm quản lý" span={1}>
          {danhMuc?.nhomQuanLy?.ten ? (
            <Tag color="orange">{danhMuc.nhomQuanLy.ten}</Tag>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        {/* Khoản mục */}
        <Descriptions.Item label="Mã khoản mục" span={1}>
          {danhMuc?.khoanMuc?.ma ? (
            <Text code>{danhMuc.khoanMuc.ma}</Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Khoản mục" span={1}>
          {danhMuc?.khoanMuc?.ten ? (
            <Tag color="lime">{danhMuc.khoanMuc.ten}</Tag>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>

        {/* Thông tin bổ sung */}
        <Descriptions.Item label="Người giao dịch" span={4}>
          {entry.nguoiGiaoDich || <Text type="secondary">-</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Địa chỉ" span={4}>
          {entry.diaChi || <Text type="secondary">-</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="Ghi chú" span={4}>
          {entry.ghiChu || <Text type="secondary">-</Text>}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}
