import { useEffect } from "react";
import { Modal, Button, Input, Select, DatePicker, TimePicker, Row, Col } from "antd";
import { Controller, useForm } from "react-hook-form";
import dayjs from "dayjs";
import { useBanGhiHandler, useBanGhiState } from "../../BanGhiHandlerContext";
import { Employee } from "@/services/employeeService";
import { DINH_DANG_NGAY, DINH_DANG_GIO } from "@/ultils/thoiGianVN";
import {
  NHAP_BU_FORM_DEFAULT_VALUES,
  NhapBuFormValues,
  formValuesToHrNhapDto,
  ngayTuongLaiBiChan,
  gioTuongLaiBiChan,
} from "./nhapBuForm.convert";
import "./NhapBuForm.state";

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

export function NhapBuForm() {
  const handler = useBanGhiHandler();
  const [formVisible] = useBanGhiState("formVisible", false);
  const [saving] = useBanGhiState("saving", false);
  const [employeeList] = useBanGhiState("employeeList", [] as Employee[]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<NhapBuFormValues>({
    defaultValues: NHAP_BU_FORM_DEFAULT_VALUES,
  });

  const ngayDangChon = watch("ngay");

  useEffect(() => {
    if (formVisible) {
      // Mở form -> mặc định về hôm nay (giờ VN) cho tiện, người dùng vẫn có
      // thể đổi sang ngày trong quá khứ. Ngày tương lai không chọn được nhờ
      // `disabledDate` bên dưới.
      reset({
        ...NHAP_BU_FORM_DEFAULT_VALUES,
        ngay: dayjs().format(DINH_DANG_NGAY),
      });
    }
  }, [formVisible, reset]);

  const handleCancel = () => {
    handler.executeEvent("closeNhapBu", {});
  };

  const onSubmit = (values: NhapBuFormValues) => {
    handler.executeEvent("luuNhapBu", formValuesToHrNhapDto(values));
  };

  const employeeOptions = employeeList.map((e) => ({
    value: e.id,
    label: `${e.hoTen} (${e.employeeId})`,
  }));

  const gioBiChan = gioTuongLaiBiChan(ngayDangChon ?? null);

  return (
    <Modal
      title="Nhập bù bản ghi chấm công"
      open={formVisible}
      onCancel={handleCancel}
      width={520}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Huỷ
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={saving}
          onClick={handleSubmit(onSubmit)}
        >
          Lưu
        </Button>,
      ]}
    >
      <Row gutter={16}>
        <Col span={24}>
          <FieldLabel required>Nhân viên</FieldLabel>
          <Controller
            name="employeeId"
            control={control}
            rules={{ required: "Vui lòng chọn nhân viên" }}
            render={({ field }) => (
              <Select
                {...field}
                className="w-full"
                showSearch
                optionFilterProp="label"
                placeholder="Chọn nhân viên"
                options={employeeOptions}
              />
            )}
          />
          {errors.employeeId && (
            <div className="text-red-500 text-xs mt-1">{errors.employeeId.message}</div>
          )}
        </Col>

        <Col span={12} className="mt-3">
          <FieldLabel required>Ngày</FieldLabel>
          <Controller
            name="ngay"
            control={control}
            rules={{ required: "Vui lòng chọn ngày" }}
            render={({ field }) => (
              <DatePicker
                className="w-full"
                format={DINH_DANG_NGAY}
                value={field.value ? dayjs(field.value, DINH_DANG_NGAY) : null}
                disabledDate={(current) => !!current && ngayTuongLaiBiChan(current)}
                onChange={(date) =>
                  field.onChange(date ? date.format(DINH_DANG_NGAY) : null)
                }
              />
            )}
          />
          {errors.ngay && (
            <div className="text-red-500 text-xs mt-1">{errors.ngay.message}</div>
          )}
        </Col>

        <Col span={12} className="mt-3">
          <FieldLabel required>Giờ</FieldLabel>
          <Controller
            name="gio"
            control={control}
            rules={{ required: "Vui lòng chọn giờ" }}
            render={({ field }) => (
              <TimePicker
                className="w-full"
                format={DINH_DANG_GIO}
                minuteStep={1}
                value={field.value ? dayjs(field.value, DINH_DANG_GIO) : null}
                disabledTime={() => gioBiChan}
                onChange={(time) =>
                  field.onChange(time ? time.format(DINH_DANG_GIO) : null)
                }
              />
            )}
          />
          {errors.gio && (
            <div className="text-red-500 text-xs mt-1">{errors.gio.message}</div>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            Không thể nhập bù cho thời điểm ở tương lai.
          </div>
        </Col>

        <Col span={24} className="mt-3">
          <FieldLabel required>Vào hay ra</FieldLabel>
          <Controller
            name="loai"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                className="w-full"
                options={[
                  { value: "vao", label: "Giờ vào" },
                  { value: "ra", label: "Giờ ra" },
                ]}
              />
            )}
          />
        </Col>

        <Col span={24} className="mt-3">
          <FieldLabel>Lý do nhập bù</FieldLabel>
          <Controller
            name="ghiChu"
            control={control}
            render={({ field }) => (
              <Input.TextArea
                {...field}
                rows={2}
                placeholder="Ví dụ: NV quên chấm, có xác nhận của quản lý"
              />
            )}
          />
        </Col>
      </Row>
    </Modal>
  );
}
