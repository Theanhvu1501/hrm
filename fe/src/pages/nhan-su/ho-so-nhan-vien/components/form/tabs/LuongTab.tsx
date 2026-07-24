import { Controller, useFormContext } from "react-hook-form";
import { InputNumber, Checkbox, Row, Col, Form } from "antd";
import type { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";

const tien = {
  style: { width: "100%" } as const,
  min: 0,
  step: 100000,
  formatter: (v?: number | string) =>
    `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  parser: (v?: string) => Number((v ?? "").replace(/,/g, "")) as unknown as number,
};

export function LuongTab() {
  const { control } = useFormContext<HoSoNhanVienFormValues>();
  return (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Lương thỏa thuận (thực nhận)">
          <Controller
            name="luongThoaThuan"
            control={control}
            render={({ field }) => <InputNumber {...tien} {...field} />}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="Mức lương khai báo"
          tooltip="Bỏ trống = dùng mức mặc định trong Cấu hình lương (5.5tr)"
        >
          <Controller
            name="mucKhaiBao"
            control={control}
            render={({ field }) => <InputNumber {...tien} {...field} />}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="Phụ cấp cố định / tháng"
          tooltip="Xăng xe, điện thoại, chuyên cần… gộp một số"
        >
          <Controller
            name="phuCapCoDinh"
            control={control}
            render={({ field }) => <InputNumber {...tien} {...field} />}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Số người phụ thuộc">
          <Controller
            name="soNguoiPhuThuoc"
            control={control}
            render={({ field }) => (
              <InputNumber style={{ width: "100%" }} min={0} {...field} />
            )}
          />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Controller
          name="dongBH"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            >
              Đóng BHXH
            </Checkbox>
          )}
        />
        {"  "}
        <Controller
          name="thoiVu"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            >
              HĐ thời vụ (khấu trừ 10%)
            </Checkbox>
          )}
        />
        {"  "}
        <Controller
          name="camKet"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            >
              Có cam kết (miễn khấu trừ)
            </Checkbox>
          )}
        />
      </Col>
    </Row>
  );
}
