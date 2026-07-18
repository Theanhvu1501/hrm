import { Popover, Descriptions, Typography } from "antd";
import { useState } from "react";

const { Text } = Typography;

type DetailType =
  | "doiTuong"
  | "duAn"
  | "boPhan"
  | "sanPham"
  | "dongTien"
  | "nhanVien"
  | "nhomKhuyenMai"
  | "nhomQuanLy"
  | "taiKhoan"
  | "khoanMuc"
  | "hopDong";

interface DetailData {
  ma?: string;
  ten?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDetailData = DetailData & Record<string, any>;

interface DetailPopoverProps {
  type: DetailType;
  data?: AnyDetailData | null;
  children: React.ReactNode;
}

const typeLabels: Record<DetailType, string> = {
  doiTuong: "Đối tượng",
  duAn: "Dự án",
  boPhan: "Bộ phận",
  sanPham: "Sản phẩm",
  dongTien: "Dòng tiền",
  nhanVien: "Nhân viên",
  nhomKhuyenMai: "Nhóm khuyến mại",
  nhomQuanLy: "Nhóm quản lý",
  taiKhoan: "Tài khoản",
  khoanMuc: "Khoản mục",
  hopDong: "Hợp đồng",
};

// Render specific fields based on type
const renderDetailContent = (type: DetailType, data: AnyDetailData) => {
  const commonItems = [
    { label: "Mã", value: data.ma },
    { label: "Tên", value: data.ten },
  ];

  const specificItems: Record<DetailType, Array<{ label: string; value: unknown }>> = {
    doiTuong: [
      { label: "Loại", value: data.loai },
      { label: "Điện thoại", value: data.dienThoai },
      { label: "Email", value: data.email },
      { label: "Địa chỉ", value: data.diaChi },
      { label: "Mã số thuế", value: data.maSoThue },
    ],
    duAn: [
      { label: "Chủ đầu tư", value: data.chuDuAn || data.chuDauTuTen },
      { label: "Mã CĐT", value: data.chuDuAnMa || data.chuDauTuMa },
      { label: "Địa điểm", value: data.diaDiem },
      { label: "Trạng thái", value: data.trangThai },
    ],
    boPhan: [
      { label: "Mô tả", value: data.moTa },
    ],
    sanPham: [
      { label: "Đơn vị", value: data.donVi },
      { label: "Giá bán", value: data.giaBan ? new Intl.NumberFormat('vi-VN').format(data.giaBan as number) + ' đ' : undefined },
      { label: "Mô tả", value: data.moTa },
    ],
    dongTien: [
      { label: "Loại", value: data.loai },
      { label: "Mô tả", value: data.moTa },
    ],
    nhanVien: [
      { label: "Điện thoại", value: data.dienThoai },
      { label: "Email", value: data.email },
      { label: "Bộ phận", value: data.boPhan },
    ],
    nhomKhuyenMai: [
      { label: "Mô tả", value: data.moTa },
    ],
    nhomQuanLy: [
      { label: "Mô tả", value: data.moTa },
    ],
    taiKhoan: [
      { label: "Loại", value: data.loai },
      { label: "Nhóm", value: data.nhom },
    ],
    khoanMuc: [
      { label: "Loại", value: data.loai },
      { label: "Nhóm", value: data.nhom },
    ],
    hopDong: [
      { label: "Số HĐ", value: data.soHopDong },
      { label: "Công trình", value: data.tenCongTrinh },
      { label: "Giá trị sau thuế", value: data.giaTriSauThue ? new Intl.NumberFormat('vi-VN').format(data.giaTriSauThue as number) + ' đ' : undefined },
      { label: "Ngày ký", value: data.ngayKy },
      { label: "Phụ lục 1 - Giá trị", value: data.phuLuc1GiaTri ? new Intl.NumberFormat('vi-VN').format(data.phuLuc1GiaTri as number) + ' đ' : undefined },
      { label: "Phụ lục 1 - Ngày ký", value: data.phuLuc1NgayKy },
      { label: "Phụ lục 2 - Giá trị", value: data.phuLuc2GiaTri ? new Intl.NumberFormat('vi-VN').format(data.phuLuc2GiaTri as number) + ' đ' : undefined },
      { label: "Phụ lục 2 - Ngày ký", value: data.phuLuc2NgayKy },
      { label: "Chủ đầu tư", value: data.chuDauTuTen },
      { label: "Người ký", value: data.nguoiKy },
      { label: "Chức vụ", value: data.chucVu },
      { label: "Người giao dịch", value: data.nguoiGiaoDich },
      { label: "Tạm ứng", value: data.tamUng },
      { label: "Thanh toán giai đoạn", value: data.thanhToanGiaiDoan },
      { label: "Quyết toán", value: data.quyetToan },
      { label: "Bảo hành - Giá trị", value: data.baoHanhGiaTri ? new Intl.NumberFormat('vi-VN').format(data.baoHanhGiaTri as number) + ' đ' : undefined },
      { label: "Bảo hành - Thời gian", value: data.baoHanhThoiGian },
      { label: "Bảo hành - Hình thức", value: data.baoHanhHinhThuc },
      { label: "Tiến độ - Số ngày", value: data.tienDoSoNgay },
      { label: "Tiến độ - Từ ngày", value: data.tienDoTuNgay },
      { label: "Tiến độ - Đến ngày", value: data.tienDoDenNgay },
      { label: "Trạng thái", value: data.trangThai },
      { label: "Số lượng lưu", value: data.soLuongLuu },
    ],
  };

  const items = [...commonItems, ...specificItems[type]].filter(item => item.value);

  return (
    <Descriptions 
      column={1} 
      size="small" 
      bordered
      style={{ minWidth: 250 }}
    >
      {items.map((item, index) => (
        <Descriptions.Item key={index} label={item.label}>
          {String(item.value)}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
};

export function DetailPopover({ type, data, children }: DetailPopoverProps) {
  const [open, setOpen] = useState(false);

  if (!data || (!data.ma && !data.ten && !data.soHopDong)) {
    return <>{children}</>;
  }

  const content = (
    <div style={{ maxWidth: 350 }}>
      {renderDetailContent(type, data)}
    </div>
  );

  return (
    <Popover
      content={content}
      title={
        <Text strong className="text-primary">
          {typeLabels[type]}: {data.ten || data.tenCongTrinh || data.ma || data.soHopDong}
        </Text>
      }
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="right"
    >
      <span 
        className="cursor-pointer hover:text-primary hover:underline transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </span>
    </Popover>
  );
}
