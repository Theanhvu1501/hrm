import { useEffect, useState } from "react";
import { Card, Descriptions, Spin, Avatar, Tag, Empty, Divider } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { apiErrorMessage } from "@/config/api";
import { employeeService } from "@/services/employeeService";

interface Employee {
  _id: string;
  employeeId: string;
  hoTen: string;
  ngaySinh?: string;
  gioiTinh?: string;
  cccd?: string;
  ngayCapCccd?: string;
  noiCapCccd?: string;
  soDienThoai?: string;
  email?: string;
  diaChi?: string;
  chucDanh?: string;
  departmentName?: string;
  trangThai?: string;
  ngayVaoLam?: string;
  luongThoaThuan?: number;
  luongDongBH?: number;
  soNguoiPhuThuoc?: number;
  dongBH?: boolean;
  maSoThue?: string;
  soTaiKhoan?: string;
  nganHang?: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function formatMoney(value?: number): string {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString("vi-VN") + " đ";
}

/**
 * Trang Hồ sơ cá nhân trong PWA "Chấm công của tôi".
 * Mỗi nhân viên chỉ xem được hồ sơ của chính mình.
 * Điều chỉnh 20/9 #2.
 */
export function HoSoCaNhanPage() {
  const [data, setData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await employeeService.me();
        setData(res);
      } catch (err) {
        setError(apiErrorMessage(err, "Không tải được hồ sơ cá nhân"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Empty description={error} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4">
        <Empty description="Không tìm thấy hồ sơ nhân viên liên kết với tài khoản của bạn" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card>
        {/* Header với avatar và tên */}
        <div className="text-center mb-6">
          <Avatar size={80} icon={<UserOutlined />} className="mb-3" />
          <h2 className="text-xl font-semibold m-0">{data.hoTen}</h2>
          <div className="text-sm text-gray-500 mb-2">
            {data.employeeId && <span className="mr-2">Mã NV: {data.employeeId}</span>}
          </div>
          <div className="space-x-2">
            {data.chucDanh && <Tag color="blue">{data.chucDanh}</Tag>}
            {data.trangThai && (
              <Tag color={data.trangThai === "dang_lam" ? "green" : "default"}>
                {data.trangThai === "dang_lam" ? "Đang làm việc" : data.trangThai}
              </Tag>
            )}
          </div>
        </div>

        <Divider>Thông tin cá nhân</Divider>
        <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
          <Descriptions.Item label="Ngày sinh">{formatDate(data.ngaySinh)}</Descriptions.Item>
          <Descriptions.Item label="Giới tính">{data.gioiTinh || "-"}</Descriptions.Item>
          <Descriptions.Item label="CCCD/CMND">{data.cccd || "-"}</Descriptions.Item>
          <Descriptions.Item label="Ngày cấp">{formatDate(data.ngayCapCccd)}</Descriptions.Item>
          <Descriptions.Item label="Nơi cấp" span={2}>{data.noiCapCccd || "-"}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{data.soDienThoai || "-"}</Descriptions.Item>
          <Descriptions.Item label="Email">{data.email || "-"}</Descriptions.Item>
          <Descriptions.Item label="Địa chỉ" span={2}>{data.diaChi || "-"}</Descriptions.Item>
        </Descriptions>

        <Divider>Thông tin công việc</Divider>
        <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
          <Descriptions.Item label="Phòng ban">{data.departmentName || "-"}</Descriptions.Item>
          <Descriptions.Item label="Ngày vào làm">{formatDate(data.ngayVaoLam)}</Descriptions.Item>
          <Descriptions.Item label="Mã số thuế">{data.maSoThue || "-"}</Descriptions.Item>
          <Descriptions.Item label="Số người phụ thuộc">{data.soNguoiPhuThuoc ?? "-"}</Descriptions.Item>
        </Descriptions>

        <Divider>Thông tin lương & BHXH</Divider>
        <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
          <Descriptions.Item label="Lương thỏa thuận">{formatMoney(data.luongThoaThuan)}</Descriptions.Item>
          <Descriptions.Item label="Lương đóng BHXH">{formatMoney(data.luongDongBH)}</Descriptions.Item>
          <Descriptions.Item label="Đóng BHXH">
            {data.dongBH ? <Tag color="green">Có</Tag> : <Tag>Không</Tag>}
          </Descriptions.Item>
        </Descriptions>

        <Divider>Tài khoản ngân hàng</Divider>
        <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
          <Descriptions.Item label="Số tài khoản">{data.soTaiKhoan || "-"}</Descriptions.Item>
          <Descriptions.Item label="Ngân hàng">{data.nganHang || "-"}</Descriptions.Item>
        </Descriptions>

        <div className="mt-4 text-center text-xs text-gray-400">
          Liên hệ phòng Nhân sự nếu thông tin không chính xác
        </div>
      </Card>
    </div>
  );
}

export default HoSoCaNhanPage;
