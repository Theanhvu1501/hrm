import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  InputNumber,
  Checkbox,
  Row,
  Col,
  Form,
  Select,
  Divider,
} from "antd";
import {
  cauHinhLuongService,
  type CauHinhLuong,
} from "@/services/cauHinhLuongService";
import type { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";

const tien = {
  style: { width: "100%" } as const,
  min: 0,
  step: 100000,
  formatter: (v?: number | string) =>
    `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  parser: (v?: string) => Number((v ?? "").replace(/,/g, "")) as unknown as number,
};

const phanTram = {
  style: { width: "100%" } as const,
  min: 0,
  max: 100,
  addonAfter: "%",
};

export function LuongTab() {
  const { control } = useFormContext<HoSoNhanVienFormValues>();

  // Chỉ dùng để hiện placeholder "đang áp số nào" cho các ô cấu hình riêng.
  // Lỗi tải / chưa xong thì placeholder trống, KHÔNG chặn form lưu.
  const [chung, setChung] = useState<CauHinhLuong | null>(null);
  useEffect(() => {
    cauHinhLuongService
      .get()
      .then(setChung)
      .catch(() => setChung(null));
  }, []);

  const ph = (v?: number) => (v === undefined ? "" : `${v} (theo cấu hình)`);

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
      <Col span={24} style={{ marginTop: 8 }}>
        <Controller
          name="hopDongThu2"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            >
              HĐLĐ thứ 2 (công ty chỉ đóng 0,5% BHTNLĐ-BNN; không giảm trừ gia
              cảnh tại đây)
            </Checkbox>
          )}
        />
      </Col>

      <Col span={24}>
        <Divider orientation="left" plain style={{ marginBottom: 8 }}>
          Cấu hình riêng — để trống là theo Cấu hình lương
        </Divider>
      </Col>
      <Col span={6}>
        <Form.Item label="Công chuẩn / tháng">
          <Controller
            name="orCongChuan"
            control={control}
            render={({ field }) => (
              <InputNumber
                style={{ width: "100%" }}
                min={1}
                placeholder={ph(chung?.congChuan)}
                {...field}
              />
            )}
          />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item label="Tỷ lệ thử việc">
          <Controller
            name="orThuViecPhanTram"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...phanTram}
                placeholder={ph(chung ? chung.thuViec.tyLe * 100 : undefined)}
                {...field}
              />
            )}
          />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item label="Tỷ lệ BHXH (NLĐ đóng)">
          <Controller
            name="orBhxhPhanTram"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...phanTram}
                placeholder={ph(chung ? chung.bhxh.tyLe * 100 : undefined)}
                {...field}
              />
            )}
          />
        </Form.Item>
      </Col>
      <Col span={6}>
        <Form.Item label="Căn cứ đóng BH">
          <Controller
            name="orBhxhCanCu"
            control={control}
            render={({ field }) => (
              <Select
                style={{ width: "100%" }}
                allowClear
                placeholder={
                  chung?.bhxh.canCu === "LUONG_THOA_THUAN"
                    ? "Lương thoả thuận (theo cấu hình)"
                    : "Mức khai báo (theo cấu hình)"
                }
                options={[
                  { value: "MUC_KHAI_BAO", label: "Mức khai báo" },
                  { value: "LUONG_THOA_THUAN", label: "Lương thoả thuận" },
                ]}
                {...field}
              />
            )}
          />
        </Form.Item>
      </Col>
    </Row>
  );
}
