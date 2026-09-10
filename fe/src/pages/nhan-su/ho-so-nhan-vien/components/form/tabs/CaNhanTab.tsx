import { Controller, useFormContext } from "react-hook-form";
import { Input, Select, Row, Col } from "antd";
import { FieldLabel, FieldError } from "@/components/form/FieldLabel";
import { OChonNgay } from "@/components/form/OChonNgay";
import { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";
import { GIOI_TINH_OPTIONS } from "../../../constants";

export function CaNhanTab() {
  const {
    control,
    formState: { errors },
  } = useFormContext<HoSoNhanVienFormValues>();

  return (
    <Row gutter={12}>
      <Col span={12}>
        <FieldLabel required>Họ tên</FieldLabel>
        <Controller
          name="hoTen"
          control={control}
          rules={{ required: "Vui lòng nhập họ tên" }}
          render={({ field }) => <Input {...field} placeholder="Nhập họ tên" />}
        />
        <FieldError>{errors.hoTen?.message}</FieldError>
      </Col>
      <Col span={12}>
        <FieldLabel required>Số CCCD</FieldLabel>
        <Controller
          name="cccd"
          control={control}
          rules={{ required: "Vui lòng nhập số CCCD" }}
          render={({ field }) => <Input {...field} placeholder="Nhập số CCCD" />}
        />
        <FieldError>{errors.cccd?.message}</FieldError>
      </Col>
      {/* Hai ô này in thẳng lên hợp đồng lao động. Thiếu thì bản in để trống
          và HR phải điền tay mỗi lần in — modal In có cảnh báo trước. */}
      <Col span={12} className="mt-2">
        <FieldLabel required>Ngày cấp CCCD</FieldLabel>
        <Controller
          name="ngayCapCccd"
          control={control}
          rules={{ required: "Vui lòng nhập ngày cấp CCCD" }}
          render={({ field }) => (
            <OChonNgay
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <FieldError>{errors.ngayCapCccd?.message}</FieldError>
      </Col>
      <Col span={12} className="mt-2">
        <FieldLabel required>Nơi cấp CCCD</FieldLabel>
        <Controller
          name="noiCapCccd"
          control={control}
          rules={{ required: "Vui lòng nhập nơi cấp CCCD" }}
          render={({ field }) => (
            <Input {...field} placeholder="Cục Cảnh sát QLHC về TTXH" />
          )}
        />
        <FieldError>{errors.noiCapCccd?.message}</FieldError>
      </Col>
      <Col span={12} className="mt-2">
        <FieldLabel required>Ngày sinh</FieldLabel>
        <Controller
          name="ngaySinh"
          control={control}
          rules={{ required: "Vui lòng nhập ngày sinh" }}
          render={({ field }) => (
            <OChonNgay
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <FieldError>{errors.ngaySinh?.message}</FieldError>
      </Col>
      <Col span={12} className="mt-2">
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
        <FieldError>{errors.gioiTinh?.message}</FieldError>
      </Col>
      <Col span={12} className="mt-2">
        <FieldLabel required>Mã số thuế</FieldLabel>
        <Controller
          name="mst"
          control={control}
          rules={{ required: "Vui lòng nhập mã số thuế" }}
          render={({ field }) => <Input {...field} placeholder="Nhập MST" />}
        />
        <FieldError>{errors.mst?.message}</FieldError>
      </Col>
      <Col span={12} className="mt-2">
        <FieldLabel required>Số điện thoại</FieldLabel>
        <Controller
          name="soDienThoai"
          control={control}
          rules={{ required: "Vui lòng nhập số điện thoại" }}
          render={({ field }) => (
            <Input {...field} placeholder="Nhập số điện thoại" />
          )}
        />
        <FieldError>{errors.soDienThoai?.message}</FieldError>
      </Col>
      <Col span={12} className="mt-2">
        <FieldLabel required>Email</FieldLabel>
        <Controller
          name="email"
          control={control}
          rules={{ required: "Vui lòng nhập email" }}
          render={({ field }) => <Input {...field} placeholder="Nhập email" />}
        />
        <FieldError>{errors.email?.message}</FieldError>
      </Col>
      <Col span={24} className="mt-2">
        <FieldLabel required>Địa chỉ</FieldLabel>
        <Controller
          name="diaChi"
          control={control}
          rules={{ required: "Vui lòng nhập địa chỉ" }}
          render={({ field }) => (
            <Input.TextArea {...field} rows={2} placeholder="Nhập địa chỉ" />
          )}
        />
        <FieldError>{errors.diaChi?.message}</FieldError>
      </Col>
    </Row>
  );
}
