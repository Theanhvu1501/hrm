import { Controller, useFormContext } from "react-hook-form";
import { Input, Select, Row, Col } from "antd";
import { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";
import { LOAI_HOP_DONG_OPTIONS, TRANG_THAI_OPTIONS } from "../../../constants";

export function CongViecTab() {
  const { control } = useFormContext<HoSoNhanVienFormValues>();

  return (
    <Row gutter={16}>
      <Col span={12}>
        <label className="block mb-1 text-sm font-medium">Phòng ban</label>
        <Controller
          name="phongBan"
          control={control}
          render={({ field }) => <Input {...field} placeholder="Nhập phòng ban" />}
        />
      </Col>
      <Col span={12}>
        <label className="block mb-1 text-sm font-medium">Chức danh</label>
        <Controller
          name="chucDanh"
          control={control}
          render={({ field }) => <Input {...field} placeholder="Nhập chức danh" />}
        />
      </Col>
      <Col span={12} className="mt-3">
        <label className="block mb-1 text-sm font-medium">Ngày vào làm</label>
        <Controller
          name="ngayVaoLam"
          control={control}
          render={({ field }) => (
            <Input {...field} type="date" className="w-full" />
          )}
        />
      </Col>
      <Col span={12} className="mt-3">
        <label className="block mb-1 text-sm font-medium">Loại hợp đồng</label>
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
      <Col span={12} className="mt-3">
        <label className="block mb-1 text-sm font-medium">Trạng thái</label>
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
