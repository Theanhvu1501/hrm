import { useEffect, useMemo } from "react";
import { Modal, Button, Input, Select, InputNumber, Row, Col } from "antd";
import { Controller, useForm } from "react-hook-form";
import {
  useHopDongLaoDongHandler,
  useHopDongLaoDongState,
} from "../../HopDongLaoDongHandlerContext";
import { CreateLaborContractDto, LaborContract } from "@/services/laborContractService";
import { Employee } from "@/services/employeeService";
import {
  LOAI_HOP_DONG_OPTIONS,
  TRANG_THAI_OPTIONS,
  HINH_THUC_TRA_LUONG_OPTIONS,
} from "../../constants";
import { HopDongLaoDongFormValues } from "./HopDongLaoDongForm.state";
import "./HopDongLaoDongForm.state";

const DEFAULT_VALUES: HopDongLaoDongFormValues = {
  employeeId: "",
  employeeName: "",
  employeeCode: "",
  loaiHopDong: "thu_viec",
  ngayBatDau: "",
  ngayKetThuc: "",
  mucLuong: undefined,
  phuCap: undefined,
  hinhThucTraLuong: "gross",
  trangThai: "du_thao",
  ghiChu: "",
};

function toFormValues(contract: LaborContract | null): HopDongLaoDongFormValues {
  if (!contract) return DEFAULT_VALUES;

  return {
    employeeId: contract.employeeId || "",
    employeeName: contract.employeeName || "",
    employeeCode: contract.employeeCode || "",
    loaiHopDong: contract.loaiHopDong || "thu_viec",
    ngayBatDau: contract.ngayBatDau || "",
    ngayKetThuc: contract.ngayKetThuc || "",
    mucLuong: contract.mucLuong,
    phuCap: contract.phuCap,
    hinhThucTraLuong: contract.hinhThucTraLuong || "gross",
    trangThai: contract.trangThai || "du_thao",
    ghiChu: contract.ghiChu || "",
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

export function HopDongLaoDongForm() {
  const handler = useHopDongLaoDongHandler();
  const [formVisible] = useHopDongLaoDongState("formVisible", false);
  const [editingContract] = useHopDongLaoDongState(
    "editingContract",
    null as LaborContract | null
  );
  const [saving] = useHopDongLaoDongState("saving", false);
  const [employeeList] = useHopDongLaoDongState("employeeList", [] as Employee[]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<HopDongLaoDongFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const isEditing = !!editingContract;
  const loaiHopDong = watch("loaiHopDong");
  const isKhongXacDinh = loaiHopDong === "khong_xac_dinh_thoi_han";

  useEffect(() => {
    if (formVisible) {
      reset(toFormValues(editingContract));
    }
  }, [formVisible, editingContract, reset]);

  useEffect(() => {
    if (isKhongXacDinh) {
      setValue("ngayKetThuc", "");
    }
  }, [isKhongXacDinh, setValue]);

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
    // lưu kèm hợp đồng (phục vụ hiển thị danh sách mà không cần join).
    setValue("employeeName", employee?.hoTen || "");
    setValue("employeeCode", employee?.employeeId || "");
  };

  const onSubmit = (values: HopDongLaoDongFormValues) => {
    const dto: CreateLaborContractDto = {
      employeeId: values.employeeId,
      employeeName: values.employeeName || undefined,
      employeeCode: values.employeeCode || undefined,
      loaiHopDong: values.loaiHopDong,
      ngayBatDau: values.ngayBatDau || undefined,
      ngayKetThuc:
        values.loaiHopDong === "khong_xac_dinh_thoi_han"
          ? undefined
          : values.ngayKetThuc || undefined,
      mucLuong: values.mucLuong,
      phuCap: values.phuCap,
      hinhThucTraLuong: values.hinhThucTraLuong,
      trangThai: values.trangThai,
      ghiChu: values.ghiChu || undefined,
    };

    if (isEditing && editingContract) {
      handler.executeEvent("updateContract", { id: editingContract.id, dto });
    } else {
      handler.executeEvent("createContract", dto);
    }
  };

  return (
    <Modal
      title={isEditing ? "Sửa hợp đồng lao động" : "Thêm hợp đồng"}
      open={formVisible}
      onCancel={handleCancel}
      width={700}
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
          <FieldLabel required>Loại hợp đồng</FieldLabel>
          <Controller
            name="loaiHopDong"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                className="w-full"
                options={LOAI_HOP_DONG_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Trạng thái</FieldLabel>
          <Controller
            name="trangThai"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                className="w-full"
                options={TRANG_THAI_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Ngày bắt đầu</FieldLabel>
          <Controller
            name="ngayBatDau"
            control={control}
            render={({ field }) => (
              <Input {...field} type="date" className="w-full" />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Ngày kết thúc</FieldLabel>
          <Controller
            name="ngayKetThuc"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="date"
                className="w-full"
                disabled={isKhongXacDinh}
                placeholder={
                  isKhongXacDinh ? "Không xác định thời hạn" : undefined
                }
              />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Mức lương</FieldLabel>
          <Controller
            name="mucLuong"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...field}
                className="w-full"
                min={0}
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => value?.replace(/,/g, "") as unknown as number}
              />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Phụ cấp</FieldLabel>
          <Controller
            name="phuCap"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...field}
                className="w-full"
                min={0}
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => value?.replace(/,/g, "") as unknown as number}
              />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Hình thức trả lương</FieldLabel>
          <Controller
            name="hinhThucTraLuong"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                className="w-full"
                options={HINH_THUC_TRA_LUONG_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
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
