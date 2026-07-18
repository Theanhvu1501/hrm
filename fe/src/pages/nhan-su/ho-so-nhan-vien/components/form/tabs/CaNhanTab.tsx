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
      <Col span={12} className="mt-3">
        <FieldLabel>Ngày sinh</FieldLabel>
        <Controller
          name="ngaySinh"
          control={control}
          render={({ field }) => (
            <Input {...field} type="date" className="w-full" />
          )}
        />
      </Col>
      <Col span={12} className="mt-3">
        <FieldLabel>Giới tính</FieldLabel>
        <Controller
          name="gioiTinh"
          control={control}
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
      </Col>
      <Col span={12} className="mt-3">
        <FieldLabel>Mã số thuế</FieldLabel>
        <Controller
          name="mst"
          control={control}
          render={({ field }) => <Input {...field} placeholder="Nhập MST" />}
        />
      </Col>
      <Col span={12} className="mt-3">
        <FieldLabel>Số điện thoại</FieldLabel>
        <Controller
          name="soDienThoai"
          control={control}
          render={({ field }) => (
            <Input {...field} placeholder="Nhập số điện thoại" />
          )}
        />
      </Col>
      <Col span={12} className="mt-3">
        <FieldLabel>Email</FieldLabel>
        <Controller
          name="email"
          control={control}
          render={({ field }) => <Input {...field} placeholder="Nhập email" />}
        />
      </Col>
      <Col span={24} className="mt-3">
        <FieldLabel>Địa chỉ</FieldLabel>
        <Controller
          name="diaChi"
          control={control}
          render={({ field }) => (
            <Input.TextArea {...field} rows={2} placeholder="Nhập địa chỉ" />
          )}
        />
      </Col>
    </Row>
  );
}
