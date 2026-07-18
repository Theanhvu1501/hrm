import { useEffect } from "react";
import { Modal, Button, Input, Select, InputNumber, Row, Col } from "antd";
import { Controller, useForm } from "react-hook-form";
import {
  useDiaDiemChamCongHandler,
  useDiaDiemChamCongState,
} from "../../DiaDiemChamCongHandlerContext";
import {
  AttendanceLocation,
  CreateAttendanceLocationDto,
} from "@/services/attendanceLocationService";
import { LOAI_DIA_DIEM_OPTIONS } from "../../constants";
import { DiaDiemChamCongFormValues } from "./DiaDiemChamCongForm.state";
import "./DiaDiemChamCongForm.state";

const DEFAULT_VALUES: DiaDiemChamCongFormValues = {
  ten: "",
  loai: "gps",
  latitude: undefined,
  longitude: undefined,
  banKinh: undefined,
  ipWifi: "",
  maQr: "",
  diaChi: "",
  chiNhanh: "",
  phongBan: "",
};

function toFormValues(
  location: AttendanceLocation | null
): DiaDiemChamCongFormValues {
  if (!location) return DEFAULT_VALUES;

  return {
    ten: location.ten || "",
    loai: location.loai || "gps",
    latitude: location.latitude,
    longitude: location.longitude,
    banKinh: location.banKinh,
    ipWifi: location.ipWifi || "",
    maQr: location.maQr || "",
    diaChi: location.diaChi || "",
    chiNhanh: location.chiNhanh || "",
    phongBan: location.phongBan || "",
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

export function DiaDiemChamCongForm() {
  const handler = useDiaDiemChamCongHandler();
  const [formVisible] = useDiaDiemChamCongState("formVisible", false);
  const [editingLocation] = useDiaDiemChamCongState(
    "editingLocation",
    null as AttendanceLocation | null
  );
  const [saving] = useDiaDiemChamCongState("saving", false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<DiaDiemChamCongFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const isEditing = !!editingLocation;
  const loai = watch("loai");

  useEffect(() => {
    if (formVisible) {
      reset(toFormValues(editingLocation));
    }
  }, [formVisible, editingLocation, reset]);

  const handleCancel = () => {
    handler.executeEvent("closeForm", {});
  };

  const onSubmit = (values: DiaDiemChamCongFormValues) => {
    const dto: CreateAttendanceLocationDto = {
      ten: values.ten,
      loai: values.loai,
      latitude: values.loai === "gps" ? values.latitude : undefined,
      longitude: values.loai === "gps" ? values.longitude : undefined,
      banKinh: values.loai === "gps" ? values.banKinh : undefined,
      ipWifi: values.loai === "wifi" ? values.ipWifi || undefined : undefined,
      maQr: values.loai === "qr" ? values.maQr || undefined : undefined,
      diaChi: values.diaChi || undefined,
      chiNhanh: values.chiNhanh || undefined,
      phongBan: values.phongBan || undefined,
    };

    if (isEditing && editingLocation) {
      handler.executeEvent("updateLocation", { id: editingLocation.id, dto });
    } else {
      handler.executeEvent("createLocation", dto);
    }
  };

  return (
    <Modal
      title={isEditing ? "Sửa địa điểm chấm công" : "Thêm địa điểm chấm công"}
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
      <Row gutter={16}>
        <Col span={24}>
          <FieldLabel required>Tên địa điểm</FieldLabel>
          <Controller
            name="ten"
            control={control}
            rules={{ required: "Vui lòng nhập tên địa điểm" }}
            render={({ field }) => (
              <Input {...field} placeholder="Vd: Văn phòng chính" />
            )}
          />
          {errors.ten && (
            <div className="text-red-500 text-xs mt-1">{errors.ten.message}</div>
          )}
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel required>Loại</FieldLabel>
          <Controller
            name="loai"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                className="w-full"
                options={LOAI_DIA_DIEM_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            )}
          />
        </Col>

        {loai === "gps" && (
          <>
            <Col span={12} className="mt-3">
              <FieldLabel required>Latitude</FieldLabel>
              <Controller
                name="latitude"
                control={control}
                rules={{ required: "Vui lòng nhập latitude" }}
                render={({ field }) => (
                  <InputNumber {...field} className="w-full" step={0.000001} />
                )}
              />
              {errors.latitude && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.latitude.message}
                </div>
              )}
            </Col>
            <Col span={12} className="mt-3">
              <FieldLabel required>Longitude</FieldLabel>
              <Controller
                name="longitude"
                control={control}
                rules={{ required: "Vui lòng nhập longitude" }}
                render={({ field }) => (
                  <InputNumber {...field} className="w-full" step={0.000001} />
                )}
              />
              {errors.longitude && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.longitude.message}
                </div>
              )}
            </Col>
            <Col span={12} className="mt-3">
              <FieldLabel required>Bán kính (m)</FieldLabel>
              <Controller
                name="banKinh"
                control={control}
                rules={{ required: "Vui lòng nhập bán kính" }}
                render={({ field }) => (
                  <InputNumber {...field} className="w-full" min={0} />
                )}
              />
              {errors.banKinh && (
                <div className="text-red-500 text-xs mt-1">
                  {errors.banKinh.message}
                </div>
              )}
            </Col>
          </>
        )}

        {loai === "wifi" && (
          <Col span={12} className="mt-3">
            <FieldLabel required>IP Wifi</FieldLabel>
            <Controller
              name="ipWifi"
              control={control}
              rules={{ required: "Vui lòng nhập IP Wifi" }}
              render={({ field }) => (
                <Input {...field} placeholder="Vd: 192.168.1.1" />
              )}
            />
            {errors.ipWifi && (
              <div className="text-red-500 text-xs mt-1">
                {errors.ipWifi.message}
              </div>
            )}
          </Col>
        )}

        {loai === "qr" && (
          <Col span={12} className="mt-3">
            <FieldLabel required>Mã QR</FieldLabel>
            <Controller
              name="maQr"
              control={control}
              rules={{ required: "Vui lòng nhập mã QR" }}
              render={({ field }) => (
                <Input {...field} placeholder="Nhập mã QR" />
              )}
            />
            {errors.maQr && (
              <div className="text-red-500 text-xs mt-1">
                {errors.maQr.message}
              </div>
            )}
          </Col>
        )}

        <Col span={24} className="mt-3">
          <FieldLabel>Địa chỉ</FieldLabel>
          <Controller
            name="diaChi"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Nhập địa chỉ" />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Chi nhánh</FieldLabel>
          <Controller
            name="chiNhanh"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Nhập chi nhánh" />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Phòng ban</FieldLabel>
          <Controller
            name="phongBan"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Nhập phòng ban" />
            )}
          />
        </Col>
      </Row>
    </Modal>
  );
}
