import { useEffect, useMemo } from "react";
import { Modal, Button, Input, Select, DatePicker, TimePicker, Row, Col } from "antd";
import { Controller, useForm } from "react-hook-form";
import dayjs from "dayjs";
import {
  useDonChamCongHandler,
  useDonChamCongState,
} from "../../DonChamCongHandlerContext";
import {
  AttendanceRequest,
  CreateAttendanceRequestDto,
} from "@/services/attendanceRequestService";
import { Employee } from "@/services/employeeService";
import { LOAI_DON_OPTIONS } from "../../constants";
import { DonChamCongFormValues } from "./DonChamCongForm.state";
import "./DonChamCongForm.state";

const TIME_FORMAT = "HH:mm";
const DATE_FORMAT = "YYYY-MM-DD";

const DEFAULT_VALUES: DonChamCongFormValues = {
  employeeId: "",
  loaiDon: "giai_trinh",
  ngay: "",
  lyDo: "",
  gioTu: "",
  gioDen: "",
  minhChung: "",
  ghiChu: "",
};

function toFormValues(request: AttendanceRequest | null): DonChamCongFormValues {
  if (!request) return DEFAULT_VALUES;

  return {
    employeeId: request.employeeId || "",
    loaiDon: request.loaiDon || "giai_trinh",
    ngay: request.ngay || "",
    lyDo: request.lyDo || "",
    gioTu: request.gioTu || "",
    gioDen: request.gioDen || "",
    minhChung: request.minhChung || "",
    ghiChu: request.ghiChu || "",
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

export function DonChamCongForm() {
  const handler = useDonChamCongHandler();
  const [formVisible] = useDonChamCongState("formVisible", false);
  const [editingRequest] = useDonChamCongState(
    "editingRequest",
    null as AttendanceRequest | null
  );
  const [saving] = useDonChamCongState("saving", false);
  const [employeeList] = useDonChamCongState("employeeList", [] as Employee[]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<DonChamCongFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const isEditing = !!editingRequest;
  const loaiDon = watch("loaiDon");
  const isLamThemGio = loaiDon === "lam_them_gio";

  useEffect(() => {
    if (formVisible) {
      reset(toFormValues(editingRequest));
    }
  }, [formVisible, editingRequest, reset]);

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

  const onSubmit = (values: DonChamCongFormValues) => {
    const dto: CreateAttendanceRequestDto = {
      employeeId: values.employeeId,
      loaiDon: values.loaiDon,
      ngay: values.ngay,
      lyDo: values.lyDo || undefined,
      gioTu: values.loaiDon === "lam_them_gio" ? values.gioTu || undefined : undefined,
      gioDen: values.loaiDon === "lam_them_gio" ? values.gioDen || undefined : undefined,
      minhChung: values.minhChung || undefined,
      ghiChu: values.ghiChu || undefined,
    };

    if (isEditing && editingRequest) {
      handler.executeEvent("updateRequest", { id: editingRequest.id, dto });
    } else {
      handler.executeEvent("createRequest", dto);
    }
  };

  return (
    <Modal
      title={isEditing ? "Sửa đơn chấm công" : "Tạo đơn chấm công"}
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
          <FieldLabel required>Loại đơn</FieldLabel>
          <Controller
            name="loaiDon"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                className="w-full"
                options={LOAI_DON_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            )}
          />
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
                format="DD/MM/YYYY"
                value={field.value ? dayjs(field.value, DATE_FORMAT) : null}
                onChange={(date) =>
                  field.onChange(date ? date.format(DATE_FORMAT) : "")
                }
              />
            )}
          />
          {errors.ngay && (
            <div className="text-red-500 text-xs mt-1">{errors.ngay.message}</div>
          )}
        </Col>
        {isLamThemGio && (
          <>
            <Col span={12} className="mt-3">
              <FieldLabel required>Giờ từ</FieldLabel>
              <Controller
                name="gioTu"
                control={control}
                rules={{
                  required: isLamThemGio ? "Vui lòng chọn giờ từ" : false,
                }}
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
              {errors.gioTu && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.gioTu.message}
                </div>
              )}
            </Col>
            <Col span={12} className="mt-3">
              <FieldLabel required>Giờ đến</FieldLabel>
              <Controller
                name="gioDen"
                control={control}
                rules={{
                  required: isLamThemGio ? "Vui lòng chọn giờ đến" : false,
                }}
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
              {errors.gioDen && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.gioDen.message}
                </div>
              )}
            </Col>
          </>
        )}
        <Col span={24} className="mt-3">
          <FieldLabel>Lý do</FieldLabel>
          <Controller
            name="lyDo"
            control={control}
            render={({ field }) => (
              <Input.TextArea {...field} rows={2} placeholder="Nhập lý do" />
            )}
          />
        </Col>
        <Col span={24} className="mt-3">
          <FieldLabel>Minh chứng</FieldLabel>
          <Controller
            name="minhChung"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Đường dẫn/URL minh chứng (nếu có)" />
            )}
          />
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
