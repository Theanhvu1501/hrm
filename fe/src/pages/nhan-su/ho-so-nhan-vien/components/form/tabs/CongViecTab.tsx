import { Controller, useFormContext, useWatch } from "react-hook-form";
import { AutoComplete, Input, Select, Row, Col } from "antd";
import { FieldLabel } from "@/components/form/FieldLabel";
import { OChonNgay } from "@/components/form/OChonNgay";
import { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";
import {
  LOAI_HOP_DONG_OPTIONS,
  TRANG_THAI_OPTIONS,
  labelFor,
} from "../../../constants";
import { usePhongBanOptions } from "@/hooks/usePhongBanOptions";
import { useChucDanhOptions } from "@/hooks/useChucDanhOptions";

export function CongViecTab() {
  const { control } = useFormContext<HoSoNhanVienFormValues>();
  const { options, loading } = usePhongBanOptions();
  const trangThai = useWatch({ control, name: "trangThai" });
  const { options: chucDanhOptions } = useChucDanhOptions();

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
          render={({ field }) => (
            // AutoComplete chứ không Select: chức danh lấy theo Sơ đồ tổ chức
            // (yêu cầu d13), nhưng hồ sơ cũ đang giữ chuỗi tự do và công ty
            // chưa dựng sơ đồ thì vẫn phải nhập hồ sơ được.
            <AutoComplete
              {...field}
              options={chucDanhOptions}
              filterOption={(nhap, o) =>
                (o?.label ?? "")
                  .toString()
                  .toLowerCase()
                  .includes(nhap.toLowerCase())
              }
              placeholder="Chọn theo sơ đồ tổ chức hoặc nhập"
              className="w-full"
            />
          )}
        />
        <div className="mt-[2px] text-[10.5px] text-[hsl(var(--ink-2))]">
          Danh sách lấy từ màn Sơ đồ tổ chức.
        </div>
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
      {/* Ô "Trạng thái" đã bỏ khỏi đây (yêu cầu d8): trạng thái làm việc là
          KẾT QUẢ của Quá trình công tác / Thôi việc, không phải thứ sửa tay
          song song. Sửa được ở hai nơi thì hồ sơ ghi "đang làm việc" trong
          khi đã có quyết định thôi việc, và không ai biết bên nào đúng. */}
      <Col span={12} className="mt-2">
        <FieldLabel>Trạng thái làm việc</FieldLabel>
        <div className="flex h-[32px] items-center text-[12px]">
          {labelFor(TRANG_THAI_OPTIONS, trangThai)}
        </div>
        <div className="mt-[2px] text-[10.5px] text-[hsl(var(--ink-2))]">
          Đổi ở màn Quá trình công tác hoặc Thôi việc.
        </div>
      </Col>
    </Row>
  );
}
