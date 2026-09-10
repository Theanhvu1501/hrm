import { Controller, useFormContext } from "react-hook-form";
import { Input, Select, Row, Col } from "antd";
import { FieldLabel } from "@/components/form/FieldLabel";
import { OChonNgay } from "@/components/form/OChonNgay";
import { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";
import { LOAI_HOP_DONG_OPTIONS, TRANG_THAI_OPTIONS } from "../../../constants";
import { usePhongBanOptions } from "@/hooks/usePhongBanOptions";

export function CongViecTab() {
  const { control } = useFormContext<HoSoNhanVienFormValues>();
  const { options, loading } = usePhongBanOptions();

  return (
    <Row gutter={12}>
      <Col span={12}>
        <FieldLabel>Phòng ban</FieldLabel>
        <Controller
          name="departmentId"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              allowClear
              showSearch
              optionFilterProp="label"
              loading={loading}
              placeholder="Chọn phòng ban"
              options={options}
              className="w-full"
            />
          )}
        />
      </Col>
      <Col span={12}>
        <FieldLabel>Chức danh</FieldLabel>
        <Controller
          name="chucDanh"
          control={control}
          render={({ field }) => <Input {...field} placeholder="Nhập chức danh" />}
        />
      </Col>
      <Col span={12} className="mt-2">
        <FieldLabel>Ngày vào làm</FieldLabel>
        <Controller
          name="ngayVaoLam"
          control={control}
          render={({ field }) => (
            <OChonNgay
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      </Col>
      <Col span={12} className="mt-2">
        <FieldLabel>Ngày lên chính thức</FieldLabel>
        <Controller
          name="ngayChinhThuc"
          control={control}
          render={({ field }) => (
            <OChonNgay
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <div className="mt-[2px] text-[10.5px] text-[hsl(var(--ink-2))]">
          Để trống = đang thử việc: chưa có quỹ phép năm. Số ngày phép vẫn
          tính từ Ngày vào làm.
        </div>
      </Col>
      <Col span={12} className="mt-2">
        <FieldLabel>Loại hợp đồng</FieldLabel>
        <Controller
          name="loaiHopDong"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              className="w-full"
              options={LOAI_HOP_DONG_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
          )}
        />
      </Col>
      <Col span={12} className="mt-2">
        <FieldLabel>Trạng thái</FieldLabel>
        <Controller
          name="trangThai"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              className="w-full"
              options={TRANG_THAI_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
          )}
        />
      </Col>
    </Row>
  );
}
