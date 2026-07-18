import { useEffect, useMemo } from "react";
import {
  Modal,
  Button,
  Input,
  Select,
  DatePicker,
  Checkbox,
  Row,
  Col,
  Space,
  Divider,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import dayjs from "dayjs";
import {
  useThoiViecHandler,
  useThoiViecState,
} from "../../ThoiViecHandlerContext";
import { CreateResignationDto, Resignation } from "@/services/resignationService";
import { Employee } from "@/services/employeeService";
import { LOAI_THOI_VIEC_OPTIONS } from "../../constants";
import { ThoiViecFormValues } from "./ThoiViecForm.state";
import "./ThoiViecForm.state";

const DEFAULT_VALUES: ThoiViecFormValues = {
  employeeId: "",
  employeeName: "",
  employeeCode: "",
  ngayNopDon: "",
  ngayLamViecCuoi: "",
  loaiThoiViec: "tu_nguyen",
  lyDo: "",
  viPham: "",
  checklistBanGiao: [],
  soQuyetDinh: "",
  ghiChu: "",
};

function toFormValues(record: Resignation | null): ThoiViecFormValues {
  if (!record) return DEFAULT_VALUES;

  return {
    employeeId: record.employeeId || "",
    employeeName: record.employeeName || "",
    employeeCode: record.employeeCode || "",
    ngayNopDon: record.ngayNopDon || "",
    ngayLamViecCuoi: record.ngayLamViecCuoi || "",
    loaiThoiViec: record.loaiThoiViec || "tu_nguyen",
    lyDo: record.lyDo || "",
    viPham: record.viPham || "",
    checklistBanGiao: record.checklistBanGiao || [],
    soQuyetDinh: record.soQuyetDinh || "",
    ghiChu: record.ghiChu || "",
  };
}

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

export function ThoiViecForm() {
  const handler = useThoiViecHandler();
  const [formVisible] = useThoiViecState("formVisible", false);
  const [editingResignation] = useThoiViecState(
    "editingResignation",
    null as Resignation | null
  );
  const [saving] = useThoiViecState("saving", false);
  const [employeeList] = useThoiViecState("employeeList", [] as Employee[]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ThoiViecFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const checklistArray = useFieldArray({ control, name: "checklistBanGiao" });

  const isEditing = !!editingResignation;

  useEffect(() => {
    if (formVisible) {
      reset(toFormValues(editingResignation));
    }
  }, [formVisible, editingResignation, reset]);

  const employeeOptions = useMemo(
    () =>
      employeeList.map((e) => ({
        value: e.id,
        label: `${e.hoTen} (${e.employeeId})`,
      })),
    [employeeList]
  );

  const handleCancel = () => {
    handler.executeEvent("closeForm", {});
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employeeList.find((e) => e.id === employeeId);
    setValue("employeeId", employeeId);
    // Denormalize employeeName/employeeCode ngay khi chọn nhân viên, để BE
    // lưu kèm đơn thôi việc (phục vụ hiển thị danh sách mà không cần join).
    setValue("employeeName", employee?.hoTen || "");
    setValue("employeeCode", employee?.employeeId || "");
  };

  const onSubmit = (values: ThoiViecFormValues) => {
    const dto: CreateResignationDto = {
      employeeId: values.employeeId,
      employeeName: values.employeeName || undefined,
      employeeCode: values.employeeCode || undefined,
      ngayNopDon: values.ngayNopDon,
      ngayLamViecCuoi: values.ngayLamViecCuoi || undefined,
      loaiThoiViec: values.loaiThoiViec,
      lyDo: values.lyDo || undefined,
      viPham: values.viPham || undefined,
      checklistBanGiao:
        values.checklistBanGiao && values.checklistBanGiao.length > 0
          ? values.checklistBanGiao
          : undefined,
      soQuyetDinh: values.soQuyetDinh || undefined,
      ghiChu: values.ghiChu || undefined,
    };

    if (isEditing && editingResignation) {
      handler.executeEvent("updateResignation", { id: editingResignation.id, dto });
    } else {
      handler.executeEvent("createResignation", dto);
    }
  };

  return (
    <Modal
      title={isEditing ? "Sửa đơn thôi việc" : "Tạo đơn thôi việc"}
      open={formVisible}
      onCancel={handleCancel}
      width={720}
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
          {isEditing ? "Cập nhật" : "Tạo đơn"}
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
                showSearch
                className="w-full"
                placeholder="Chọn nhân viên"
                options={employeeOptions}
                optionFilterProp="label"
                disabled={isEditing}
                onChange={handleEmployeeChange}
              />
            )}
          />
          {errors.employeeId && (
            <div className="text-red-500 text-xs mt-1">
              {errors.employeeId.message}
            </div>
          )}
        </Col>

        <Col span={12} className="mt-3">
          <FieldLabel required>Ngày nộp đơn</FieldLabel>
          <Controller
            name="ngayNopDon"
            control={control}
            rules={{ required: "Vui lòng chọn ngày nộp đơn" }}
            render={({ field }) => (
              <DatePicker
                className="w-full"
                format="DD/MM/YYYY"
                value={field.value ? dayjs(field.value) : null}
                onChange={(date) =>
                  field.onChange(date ? date.format("YYYY-MM-DD") : "")
                }
              />
            )}
          />
          {errors.ngayNopDon && (
            <div className="text-red-500 text-xs mt-1">
              {errors.ngayNopDon.message}
            </div>
          )}
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Ngày làm việc cuối</FieldLabel>
          <Controller
            name="ngayLamViecCuoi"
            control={control}
            render={({ field }) => (
              <DatePicker
                className="w-full"
                format="DD/MM/YYYY"
                value={field.value ? dayjs(field.value) : null}
                onChange={(date) =>
                  field.onChange(date ? date.format("YYYY-MM-DD") : "")
                }
              />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel required>Loại thôi việc</FieldLabel>
          <Controller
            name="loaiThoiViec"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                className="w-full"
                options={LOAI_THOI_VIEC_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Số quyết định</FieldLabel>
          <Controller
            name="soQuyetDinh"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Nhập số quyết định" />
            )}
          />
        </Col>
        <Col span={24} className="mt-3">
          <FieldLabel>Lý do</FieldLabel>
          <Controller
            name="lyDo"
            control={control}
            render={({ field }) => (
              <Input.TextArea {...field} rows={2} placeholder="Nhập lý do thôi việc" />
            )}
          />
        </Col>
        <Col span={24} className="mt-3">
          <FieldLabel>Vi phạm (nếu có)</FieldLabel>
          <Controller
            name="viPham"
            control={control}
            render={({ field }) => (
              <Input.TextArea
                {...field}
                rows={2}
                placeholder="Mô tả vi phạm dẫn đến kỷ luật (nếu có)"
              />
            )}
          />
        </Col>

        <Col span={24} className="mt-3">
          <Divider titlePlacement="left">Checklist bàn giao</Divider>
          <Space direction="vertical" className="w-full" size="small">
            {checklistArray.fields.map((field, index) => (
              <Space key={field.id} align="baseline" wrap>
                <Controller
                  name={`checklistBanGiao.${index}.noiDung`}
                  control={control}
                  render={({ field: f }) => (
                    <Input
                      {...f}
                      placeholder="Nội dung bàn giao"
                      style={{ width: 360 }}
                    />
                  )}
                />
                <Controller
                  name={`checklistBanGiao.${index}.hoanThanh`}
                  control={control}
                  render={({ field: f }) => (
                    <Checkbox
                      checked={f.value}
                      onChange={(e) => f.onChange(e.target.checked)}
                    >
                      Hoàn thành
                    </Checkbox>
                  )}
                />
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => checklistArray.remove(index)}
                />
              </Space>
            ))}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() =>
                checklistArray.append({ noiDung: "", hoanThanh: false })
              }
            >
              Thêm mục bàn giao
            </Button>
          </Space>
        </Col>

        <Col span={24} className="mt-3">
          <FieldLabel>Ghi chú</FieldLabel>
          <Controller
            name="ghiChu"
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
