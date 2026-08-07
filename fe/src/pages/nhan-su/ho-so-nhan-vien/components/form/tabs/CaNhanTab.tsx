import { Controller, useFormContext } from "react-hook-form";
import { Input, Select, Row, Col } from "antd";
import { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";
import { GIOI_TINH_OPTIONS } from "../../../constants";

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block mb-1 text-sm font-medium">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

export function CaNhanTab() {
  const {
    control,
    formState: { errors },
  } = useFormContext<HoSoNhanVienFormValues>();

  return (
    <Row gutter={16}>
      <Col span={12}>
        <FieldLabel required>Họ tên</FieldLabel>
        <Controller
          name="hoTen"
          control={control}
          rules={{ required: "Vui lòng nhập họ tên" }}
          render={({ field }) => <Input {...field} placeholder="Nhập họ tên" />}
        />
        {errors.hoTen && (
          <div className="text-red-500 text-xs mt-1">{errors.hoTen.message}</div>
        )}
      </Col>
      <Col span={12}>
        <FieldLabel required>Số CCCD</FieldLabel>
        <Controller
          name="cccd"
          control={control}
          rules={{ required: "Vui lòng nhập số CCCD" }}
          render={({ field }) => <Input {...field} placeholder="Nhập số CCCD" />}
        />
        {errors.cccd && (
          <div className="text-red-500 text-xs mt-1">{errors.cccd.message}</div>
        )}
      </Col>
      {/* Hai ô này in thẳng lên hợp đồng lao động. Thiếu thì bản in để trống
          và HR phải điền tay mỗi lần in — modal In có cảnh báo trước. */}
      <Col span={12} className="mt-3">
        <FieldLabel required>Ngày cấp CCCD</FieldLabel>
        <Controller
          name="ngayCapCccd"
          control={control}
          rules={{ required: "Vui lòng nhập ngày cấp CCCD" }}
          render={({ field }) => (
            <Input {...field} type="date" className="w-full" />
          )}
        />
        {errors.ngayCapCccd && (
          <div className="text-red-500 text-xs mt-1">{errors.ngayCapCccd.message}</div>
        )}
      </Col>
      <Col span={12} className="mt-3">
        <FieldLabel required>Nơi cấp CCCD</FieldLabel>
        <Controller
          name="noiCapCccd"
          control={control}
          rules={{ required: "Vui lòng nhập nơi cấp CCCD" }}
          render={({ field }) => (
            <Input {...field} placeholder="Cục Cảnh sát QLHC về TTXH" />
          )}
        />
        {errors.noiCapCccd && (
          <div className="text-red-500 text-xs mt-1">{errors.noiCapCccd.message}</div>
        )}
      </Col>
      <Col span={12} className="mt-3">
        <FieldLabel required>Ngày sinh</FieldLabel>
        <Controller
          name="ngaySinh"
          control={control}
          rules={{ required: "Vui lòng nhập ngày sinh" }}
          render={({ field }) => (
            <Input {...field} type="date" className="w-full" />
          )}
        />
        {errors.ngaySinh && (
          <div className="text-red-500 text-xs mt-1">{errors.ngaySinh.message}</div>
        )}
      </Col>
      <Col span={12} className="mt-3">
        <FieldLabel required>Giới tính</FieldLabel>
        <Controller
          name="gioiTinh"
          control={control}
          rules={{ required: "Vui lòng chọn giới tính" }}
          render={({ field }) => (
            <Select
              {...field}
              allowClear
              placeholder="Chọn giới tính"
              className="w-full"
              options={GIOI_TINH_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
          )}
        />
        {errors.gioiTinh && (
          <div className="text-red-500 text-xs mt-1">{errors.gioiTinh.message}</div>
        )}
      </Col>
      <Col span={12} className="mt-3">
        <FieldLabel required>Mã số thuế</FieldLabel>
        <Controller
          name="mst"
          control={control}
          rules={{ required: "Vui lòng nhập mã số thuế" }}
          render={({ field }) => <Input {...field} placeholder="Nhập MST" />}
        />
        {errors.mst && (
          <div className="text-red-500 text-xs mt-1">{errors.mst.message}</div>
        )}
      </Col>
      <Col span={12} className="mt-3">
        <FieldLabel required>Số điện thoại</FieldLabel>
        <Controller
          name="soDienThoai"
          control={control}
          rules={{ required: "Vui lòng nhập số điện thoại" }}
          render={({ field }) => (
            <Input {...field} placeholder="Nhập số điện thoại" />
          )}
        />
        {errors.soDienThoai && (
          <div className="text-red-500 text-xs mt-1">{errors.soDienThoai.message}</div>
        )}
      </Col>
      <Col span={12} className="mt-3">
        <FieldLabel required>Email</FieldLabel>
        <Controller
          name="email"
          control={control}
          rules={{ required: "Vui lòng nhập email" }}
          render={({ field }) => <Input {...field} placeholder="Nhập email" />}
        />
        {errors.email && (
          <div className="text-red-500 text-xs mt-1">{errors.email.message}</div>
        )}
      </Col>
      <Col span={24} className="mt-3">
        <FieldLabel required>Địa chỉ</FieldLabel>
        <Controller
          name="diaChi"
          control={control}
          rules={{ required: "Vui lòng nhập địa chỉ" }}
          render={({ field }) => (
            <Input.TextArea {...field} rows={2} placeholder="Nhập địa chỉ" />
          )}
        />
        {errors.diaChi && (
          <div className="text-red-500 text-xs mt-1">{errors.diaChi.message}</div>
        )}
      </Col>
    </Row>
  );
}
