import { Controller, useFormContext } from "react-hook-form";
import { AutoComplete, Input, Select, Row, Col, Divider } from "antd";
import { FieldLabel, FieldError } from "@/components/form/FieldLabel";
import { OChonNgay } from "@/components/form/OChonNgay";
import { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";
import { GIOI_TINH_OPTIONS, NOI_CAP_CCCD_OPTIONS } from "../../../constants";
import { DinhKemO } from "@/components/form/DinhKemO";
import { useHoSoDinhKemId } from "../HoSoDinhKemContext";

export function CaNhanTab() {
  const {
    control,
    formState: { errors },
  } = useFormContext<HoSoNhanVienFormValues>();
  const idDinhKem = useHoSoDinhKemId();

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
            // AutoComplete chứ không Select: hai cơ quan cấp dưới là 99% các
            // trường hợp, nhưng CCCD/CMND cũ còn ghi công an tỉnh — khoá cứng
            // danh sách là hồ sơ cũ không lưu lại được đúng chữ trên giấy tờ.
            <AutoComplete
              {...field}
              options={NOI_CAP_CCCD_OPTIONS.map((o) => ({ value: o }))}
              filterOption={(nhap, o) =>
                (o?.value ?? "")
                  .toString()
                  .toLowerCase()
                  .includes(nhap.toLowerCase())
              }
              placeholder="Chọn hoặc nhập nơi cấp"
              className="w-full"
            />
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
        <FieldLabel>Số sổ BHXH</FieldLabel>
        <Controller
          name="soSoBH"
          control={control}
          render={({ field }) => (
            <Input {...field} placeholder="Nhập số sổ BHXH" />
          )}
        />
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

      <Col span={24}>
        <Divider titlePlacement="left" className="!mb-2 !mt-4">
          Hồ sơ giấy tờ
        </Divider>
        <div className="space-y-2.5">
          <DinhKemO
            nhan="Ảnh CCCD — mặt trước"
            doiTuong="nhan_vien"
            doiTuongId={idDinhKem}
            nhom="cccd_truoc"
          />
          <DinhKemO
            nhan="Ảnh CCCD — mặt sau"
            doiTuong="nhan_vien"
            doiTuongId={idDinhKem}
            nhom="cccd_sau"
          />
          <DinhKemO
            nhan="Sơ yếu lý lịch"
            doiTuong="nhan_vien"
            doiTuongId={idDinhKem}
            nhom="so_yeu_ly_lich"
            nhieu
            goiY="Tải được nhiều tệp: sơ yếu lý lịch, giấy khám sức khoẻ, ảnh thẻ…"
          />
        </div>
      </Col>
    </Row>
  );
}
