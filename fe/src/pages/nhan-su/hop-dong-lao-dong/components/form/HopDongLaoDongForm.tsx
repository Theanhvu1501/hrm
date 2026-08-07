import { useEffect, useMemo, useState } from "react";
import { Modal, Button, Input, Select, InputNumber, Row, Col } from "antd";
import { Controller, useForm } from "react-hook-form";
import {
  useHopDongLaoDongHandler,
  useHopDongLaoDongState,
} from "../../HopDongLaoDongHandlerContext";
import { CreateLaborContractDto, LaborContract } from "@/services/laborContractService";
import { Employee } from "@/services/employeeService";
import {
  cauHinhLuongService,
  type CauHinhLuong,
} from "@/services/cauHinhLuongService";
import { mucLuongInTrenHopDong } from "../../lib/mucLuongHopDong";
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
  chucDanh: "",
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
    chucDanh: contract.chucDanh || "",
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

  // Mức khai báo mặc định của công ty, dùng khi hồ sơ nhân viên chưa khai.
  const [chungLuong, setChungLuong] = useState<CauHinhLuong | null>(null);
  useEffect(() => {
    cauHinhLuongService
      .get()
      .then(setChungLuong)
      // Hỏng cấu hình KHÔNG được chặn việc tạo hợp đồng: mất gợi ý thôi, HR
      // vẫn gõ tay được.
      .catch(() => setChungLuong(null));
  }, []);

  const handleCancel = () => {
    handler.executeEvent("closeForm", {});
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employeeList.find((e) => e.id === employeeId);
    setValue("employeeId", employeeId);
    // Hợp đồng lao động ghi MỨC KHAI BÁO (số đăng ký BHXH), không phải lương
    // thoả thuận. Trước bản này ô "Mức lương" là trường tự do nên quy tắc đó
    // chỉ nằm trong đầu người nhập — và trên production đã có hợp đồng in
    // đúng lương thoả thuận. Điền sẵn ở đây; HR vẫn sửa đè được.
    const goiY = mucLuongInTrenHopDong(employee, chungLuong?.mucKhaiBaoMacDinh);
    if (goiY !== undefined) setValue("mucLuong", goiY);
    // Denormalize employeeName/employeeCode/chucDanh ngay khi chọn nhân
    // viên, để BE lưu kèm hợp đồng. chucDanh đặc biệt quan trọng: đây là
    // SNAPSHOT tại thời điểm ký — in lại hợp đồng cũ sau này phải ra đúng
    // chức danh lúc ký, không phải chức danh hiện tại (nhân viên có thể đã
    // được thăng chức) — xem hop-dong.service.ts renderHopDong().
    setValue("employeeName", employee?.hoTen || "");
    setValue("employeeCode", employee?.employeeId || "");
    setValue("chucDanh", employee?.chucDanh || "");
  };

  const onSubmit = (values: HopDongLaoDongFormValues) => {
    const dto: CreateLaborContractDto = {
      employeeId: values.employeeId,
      employeeName: values.employeeName || undefined,
      employeeCode: values.employeeCode || undefined,
      chucDanh: values.chucDanh || undefined,
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
          <FieldLabel>Mức lương khai báo</FieldLabel>
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
          {/* Nhãn "Mức lương" trống trơn chính là lý do trên production có
              hợp đồng in đúng lương thoả thuận. Nói thẳng đây là số nào. */}
          <div className="mt-1 text-xs text-muted-foreground">
            Số ghi trên hợp đồng và đăng ký BHXH — không phải lương thực nhận.
            Tự điền theo hồ sơ khi chọn nhân viên, sửa được nếu cần.
          </div>
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
