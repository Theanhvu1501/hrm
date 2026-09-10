import { useEffect } from "react";
import { Modal, Button, Input, Select, TimePicker, Row, Col } from "antd";
import { FieldLabel, FieldError } from "@/components/form/FieldLabel";
import { OChonNgay } from "@/components/form/OChonNgay";
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
      <Row gutter={12}>
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
          <FieldError>{errors.employeeId?.message}</FieldError>
        </Col>

        <Col span={12} className="mt-2">
          <FieldLabel required>Ngày</FieldLabel>
          <Controller
            name="ngay"
            control={control}
            rules={{ required: "Vui lòng chọn ngày" }}
            render={({ field }) => (
              <OChonNgay
                value={field.value}
                onBlur={field.onBlur}
                disabledDate={(current) => !!current && ngayTuongLaiBiChan(current)}
                // OChonNgay xoá trắng trả '' — đổi về null cho khớp kiểu
                // `ngay: string | null` của form này.
                onChange={(ngay) => field.onChange(ngay || null)}
              />
            )}
          />
          <FieldError>{errors.ngay?.message}</FieldError>
        </Col>

        <Col span={12} className="mt-2">
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
          <FieldError>{errors.gio?.message}</FieldError>
          <div className="mt-[2px] text-[10.5px] text-[hsl(var(--ink-2))]">
            Không thể nhập bù cho thời điểm ở tương lai.
          </div>
        </Col>

        <Col span={24} className="mt-2">
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

        <Col span={24} className="mt-2">
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
