import { useEffect } from "react";
import { Modal, Button, Input, Checkbox, InputNumber, TimePicker, Row, Col } from "antd";
import { FieldLabel, FieldError } from "@/components/form/FieldLabel";
import { Controller, useForm } from "react-hook-form";
import dayjs from "dayjs";
import {
  useCaLamViecHandler,
  useCaLamViecState,
} from "../../CaLamViecHandlerContext";
import { CreateWorkShiftDto, WorkShift } from "@/services/workShiftService";
import { CaLamViecFormValues } from "./CaLamViecForm.state";
import "./CaLamViecForm.state";

const TIME_FORMAT = "HH:mm";

const DEFAULT_VALUES: CaLamViecFormValues = {
  ten: "",
  gioBatDau: "",
  gioKetThuc: "",
  gioNghiTu: "",
  gioNghiDen: "",
  laLinhHoat: false,
  soPhutLinhHoat: undefined,
  moTa: "",
};

function toFormValues(shift: WorkShift | null): CaLamViecFormValues {
  if (!shift) return DEFAULT_VALUES;

  return {
    ten: shift.ten || "",
    gioBatDau: shift.gioBatDau || "",
    gioKetThuc: shift.gioKetThuc || "",
    gioNghiTu: shift.gioNghiTu || "",
    gioNghiDen: shift.gioNghiDen || "",
    laLinhHoat: shift.laLinhHoat || false,
    soPhutLinhHoat: shift.soPhutLinhHoat,
    moTa: shift.moTa || "",
  };
}

export function CaLamViecForm() {
  const handler = useCaLamViecHandler();
  const [formVisible] = useCaLamViecState("formVisible", false);
  const [editingShift] = useCaLamViecState(
    "editingShift",
    null as WorkShift | null
  );
  const [saving] = useCaLamViecState("saving", false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CaLamViecFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const isEditing = !!editingShift;
  const laLinhHoat = watch("laLinhHoat");

  useEffect(() => {
    if (formVisible) {
      reset(toFormValues(editingShift));
    }
  }, [formVisible, editingShift, reset]);

  const handleCancel = () => {
    handler.executeEvent("closeForm", {});
  };

  const onSubmit = (values: CaLamViecFormValues) => {
    const dto: CreateWorkShiftDto = {
      ten: values.ten,
      gioBatDau: values.gioBatDau,
      gioKetThuc: values.gioKetThuc,
      gioNghiTu: values.gioNghiTu || undefined,
      gioNghiDen: values.gioNghiDen || undefined,
      laLinhHoat: values.laLinhHoat,
      soPhutLinhHoat: values.laLinhHoat ? values.soPhutLinhHoat : undefined,
      moTa: values.moTa || undefined,
    };

    if (isEditing && editingShift) {
      handler.executeEvent("updateShift", { id: editingShift.id, dto });
    } else {
      handler.executeEvent("createShift", dto);
    }
  };

  return (
    <Modal
      title={isEditing ? "Sửa ca làm việc" : "Thêm ca làm việc"}
      open={formVisible}
      onCancel={handleCancel}
      width={640}
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
          {isEditing ? "Cập nhật" : "Thêm"}
        </Button>,
      ]}
    >
      <Row gutter={12}>
        <Col span={24}>
          <FieldLabel required>Tên ca</FieldLabel>
          <Controller
            name="ten"
            control={control}
            rules={{ required: "Vui lòng nhập tên ca" }}
            render={({ field }) => (
              <Input {...field} placeholder="Vd: Ca hành chính" />
            )}
          />
          <FieldError>{errors.ten?.message}</FieldError>
        </Col>
        <Col span={12} className="mt-2">
          <FieldLabel required>Giờ bắt đầu</FieldLabel>
          <Controller
            name="gioBatDau"
            control={control}
            rules={{ required: "Vui lòng chọn giờ bắt đầu" }}
            render={({ field }) => (
              <TimePicker
                className="w-full"
                format={TIME_FORMAT}
                value={field.value ? dayjs(field.value, TIME_FORMAT) : null}
                onChange={(time) =>
                  field.onChange(time ? time.format(TIME_FORMAT) : "")
                }
              />
            )}
          />
          <FieldError>{errors.gioBatDau?.message}</FieldError>
        </Col>
        <Col span={12} className="mt-2">
          <FieldLabel required>Giờ kết thúc</FieldLabel>
          <Controller
            name="gioKetThuc"
            control={control}
            rules={{ required: "Vui lòng chọn giờ kết thúc" }}
            render={({ field }) => (
              <TimePicker
                className="w-full"
                format={TIME_FORMAT}
                value={field.value ? dayjs(field.value, TIME_FORMAT) : null}
                onChange={(time) =>
                  field.onChange(time ? time.format(TIME_FORMAT) : "")
                }
              />
            )}
          />
          <FieldError>{errors.gioKetThuc?.message}</FieldError>
          <div className="mt-[2px] text-[10.5px] text-[hsl(var(--ink-2))]">
            Giờ kết thúc ≤ giờ bắt đầu sẽ tự động tính là ca qua đêm.
          </div>
        </Col>
        <Col span={12} className="mt-2">
          <FieldLabel>Giờ nghỉ (từ)</FieldLabel>
          <Controller
            name="gioNghiTu"
            control={control}
            render={({ field }) => (
              <TimePicker
                className="w-full"
                format={TIME_FORMAT}
                allowClear
                value={field.value ? dayjs(field.value, TIME_FORMAT) : null}
                onChange={(time) =>
                  field.onChange(time ? time.format(TIME_FORMAT) : "")
                }
              />
            )}
          />
        </Col>
        <Col span={12} className="mt-2">
          <FieldLabel>Giờ nghỉ (đến)</FieldLabel>
          <Controller
            name="gioNghiDen"
            control={control}
            render={({ field }) => (
              <TimePicker
                className="w-full"
                format={TIME_FORMAT}
                allowClear
                value={field.value ? dayjs(field.value, TIME_FORMAT) : null}
                onChange={(time) =>
                  field.onChange(time ? time.format(TIME_FORMAT) : "")
                }
              />
            )}
          />
        </Col>
        <Col span={laLinhHoat ? 12 : 24} className="mt-2">
          <Controller
            name="laLinhHoat"
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              >
                Ca linh hoạt
              </Checkbox>
            )}
          />
        </Col>
        {laLinhHoat && (
          <Col span={12} className="mt-2">
            <FieldLabel>Số phút linh hoạt</FieldLabel>
            <Controller
              name="soPhutLinhHoat"
              control={control}
              render={({ field }) => (
                <InputNumber {...field} className="w-full" min={0} />
              )}
            />
          </Col>
        )}
        <Col span={24} className="mt-2">
          <FieldLabel>Mô tả</FieldLabel>
          <Controller
            name="moTa"
            control={control}
            render={({ field }) => (
              <Input.TextArea {...field} rows={2} placeholder="Nhập mô tả" />
            )}
          />
        </Col>
      </Row>
    </Modal>
  );
}
