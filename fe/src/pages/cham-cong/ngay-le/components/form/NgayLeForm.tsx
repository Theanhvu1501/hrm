import { useEffect } from "react";
import { Modal, Button, Input, Select, Checkbox, DatePicker, Row, Col } from "antd";
import { FieldLabel, FieldError } from "@/components/form/FieldLabel";
import { Controller, useForm } from "react-hook-form";
import dayjs from "dayjs";
import {
  useNgayLeHandler,
  useNgayLeState,
} from "../../NgayLeHandlerContext";
import { Holiday } from "@/services/holidayService";
import { DINH_DANG_NGAY } from "@/ultils/thoiGianVN";
import {
  NGAY_LE_FORM_DEFAULT_VALUES,
  formValuesToCreateDto,
  holidayToFormValues,
  KhoangNgay,
  NgayLeFormValues,
} from "./ngayLeForm.convert";
import "./NgayLeForm.state";

const { RangePicker } = DatePicker;

export function NgayLeForm() {
  const handler = useNgayLeHandler();
  const [formVisible] = useNgayLeState("formVisible", false);
  const [editingHoliday] = useNgayLeState("editingHoliday", null as Holiday | null);
  const [saving] = useNgayLeState("saving", false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NgayLeFormValues>({
    defaultValues: NGAY_LE_FORM_DEFAULT_VALUES,
  });

  const isEditing = !!editingHoliday;

  useEffect(() => {
    if (formVisible) {
      reset(holidayToFormValues(editingHoliday));
    }
  }, [formVisible, editingHoliday, reset]);

  const handleCancel = () => {
    handler.executeEvent("closeForm", {});
  };

  const onSubmit = (values: NgayLeFormValues) => {
    const dto = formValuesToCreateDto(values);

    if (isEditing && editingHoliday) {
      handler.executeEvent("updateHoliday", { id: editingHoliday.id, dto });
    } else {
      handler.executeEvent("createHoliday", dto);
    }
  };

  return (
    <Modal
      title={isEditing ? "Sửa ngày lễ" : "Thêm ngày lễ"}
      open={formVisible}
      onCancel={handleCancel}
      width={560}
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
          <FieldLabel required>Tên ngày lễ</FieldLabel>
          <Controller
            name="ten"
            control={control}
            rules={{ required: "Vui lòng nhập tên ngày lễ" }}
            render={({ field }) => (
              <Input {...field} placeholder="Ví dụ: Tết Nguyên đán 2027" />
            )}
          />
          <FieldError>{errors.ten?.message}</FieldError>
        </Col>

        <Col span={24} className="mt-2">
          <FieldLabel required>Khoảng ngày nghỉ</FieldLabel>
          <Controller
            name="khoang"
            control={control}
            rules={{ required: "Vui lòng chọn khoảng ngày" }}
            render={({ field }) => (
              <RangePicker
                className="w-full"
                // Chỉ đổi cách HIỂN THỊ sang DD/MM/YYYY như OChonNgay; giá trị
                // lưu vẫn đọc/ghi theo DINH_DANG_NGAY (YYYY-MM-DD) bên dưới.
                format="DD/MM/YYYY"
                value={
                  field.value
                    ? [
                        dayjs(field.value[0], DINH_DANG_NGAY),
                        dayjs(field.value[1], DINH_DANG_NGAY),
                      ]
                    : null
                }
                onChange={(dates) => {
                  const khoang: KhoangNgay | null =
                    dates && dates[0] && dates[1]
                      ? [dates[0].format(DINH_DANG_NGAY), dates[1].format(DINH_DANG_NGAY)]
                      : null;
                  field.onChange(khoang);
                }}
              />
            )}
          />
          <FieldError>{errors.khoang?.message}</FieldError>
          <div className="mt-[2px] text-[10.5px] text-[hsl(var(--ink-2))]">
            Nghỉ một ngày thì chọn cùng ngày cho cả hai đầu.
          </div>
        </Col>

        <Col span={12} className="mt-2">
          <FieldLabel>Loại</FieldLabel>
          <Controller
            name="loai"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                className="w-full"
                options={[
                  { value: "le", label: "Lễ luật định" },
                  { value: "nghi_cty", label: "Công ty cho nghỉ" },
                ]}
              />
            )}
          />
        </Col>
        <Col span={12} className="mt-2 flex items-end">
          <Controller
            name="huongLuong"
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              >
                Hưởng lương
              </Checkbox>
            )}
          />
        </Col>

        <Col span={24} className="mt-2">
          <FieldLabel>Ghi chú</FieldLabel>
          <Controller
            name="moTa"
            control={control}
            render={({ field }) => (
              <Input.TextArea {...field} rows={2} placeholder="Nhập ghi chú" />
            )}
          />
        </Col>
      </Row>
    </Modal>
  );
}
