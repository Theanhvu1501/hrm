import { useEffect, useMemo } from "react";
import { Modal, Button, Input, Select, InputNumber, DatePicker, Row, Col } from "antd";
import { Controller, useForm } from "react-hook-form";
import dayjs from "dayjs";
import {
  useQuaTrinhCongTacHandler,
  useQuaTrinhCongTacState,
} from "../../QuaTrinhCongTacHandlerContext";
import {
  CreateEmploymentHistoryDto,
  EmploymentHistory,
} from "@/services/employmentHistoryService";
import { Employee } from "@/services/employeeService";
import {
  LOAI_THAY_DOI_OPTIONS,
  TRANG_THAI_MOI_OPTIONS,
  labelFor,
} from "../../constants";
import { QuaTrinhCongTacFormValues } from "./QuaTrinhCongTacForm.state";
import { usePhongBanOptions } from "@/hooks/usePhongBanOptions";
import "./QuaTrinhCongTacForm.state";

const DEFAULT_VALUES: QuaTrinhCongTacFormValues = {
  employeeId: "",
  loaiThayDoi: "dieu_chuyen",
  ngayHieuLuc: "",
  departmentIdMoi: "",
  chucDanhMoi: "",
  trangThaiMoi: undefined,
  mucLuongMoi: undefined,
  soQuyetDinh: "",
  lyDo: "",
  ghiChu: "",
};

function toFormValues(record: EmploymentHistory | null): QuaTrinhCongTacFormValues {
  if (!record) return DEFAULT_VALUES;

  return {
    employeeId: record.employeeId || "",
    loaiThayDoi: record.loaiThayDoi || "dieu_chuyen",
    ngayHieuLuc: record.ngayHieuLuc || "",
    // Bản ghi lịch sử chỉ lưu TÊN (`phongBanMoi`), không suy ngược ra id
    // được — sửa một bản ghi cũ thì phải chọn lại phòng từ danh mục.
    departmentIdMoi: "",
    chucDanhMoi: record.chucDanhMoi || "",
    trangThaiMoi: record.trangThaiMoi || undefined,
    mucLuongMoi: record.mucLuongMoi,
    soQuyetDinh: record.soQuyetDinh || "",
    lyDo: record.lyDo || "",
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

export function QuaTrinhCongTacForm() {
  const handler = useQuaTrinhCongTacHandler();
  const [formVisible] = useQuaTrinhCongTacState("formVisible", false);
  const [editingHistory] = useQuaTrinhCongTacState(
    "editingHistory",
    null as EmploymentHistory | null
  );
  const [saving] = useQuaTrinhCongTacState("saving", false);
  const [employeeList] = useQuaTrinhCongTacState("employeeList", [] as Employee[]);
  const { options: phongBanOptions, tenTheoId, loading: dangTaiPhongBan } = usePhongBanOptions();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<QuaTrinhCongTacFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const isEditing = !!editingHistory;
  const selectedEmployeeId = watch("employeeId");

  useEffect(() => {
    if (formVisible) {
      reset(toFormValues(editingHistory));
    }
  }, [formVisible, editingHistory, reset]);

  const employeeOptions = useMemo(
    () =>
      employeeList.map((e) => ({
        value: e.id,
        label: `${e.hoTen} (${e.employeeId})`,
      })),
    [employeeList]
  );

  // Tham chiếu giá trị HIỆN TẠI để người dùng thấy sẽ đổi TỪ đâu — BE tự
  // snapshot các giá trị này khi tạo mới, người dùng không nhập trực tiếp.
  // Khi sửa một bản ghi đã có, dùng chính giá trị *Cu đã được lưu (đại diện
  // cho trạng thái tại thời điểm ghi nhận); khi tạo mới, lấy từ hồ sơ nhân
  // viên đang chọn.
  const referenceInfo = useMemo(() => {
    if (isEditing && editingHistory) {
      return {
        phongBan: editingHistory.phongBanCu,
        chucDanh: editingHistory.chucDanhCu,
        trangThai: editingHistory.trangThaiCu,
      };
    }

    const employee = employeeList.find((e) => e.id === selectedEmployeeId);
    if (!employee) return null;

    return {
      phongBan: tenTheoId(employee.departmentId),
      chucDanh: employee.chucDanh,
      trangThai: employee.trangThai,
    };
  }, [isEditing, editingHistory, employeeList, selectedEmployeeId, tenTheoId]);

  const handleCancel = () => {
    handler.executeEvent("closeForm", {});
  };

  const onSubmit = (values: QuaTrinhCongTacFormValues) => {
    const dto: CreateEmploymentHistoryDto = {
      employeeId: values.employeeId,
      loaiThayDoi: values.loaiThayDoi,
      ngayHieuLuc: values.ngayHieuLuc,
      departmentIdMoi: values.departmentIdMoi || undefined,
      chucDanhMoi: values.chucDanhMoi || undefined,
      trangThaiMoi: values.trangThaiMoi || undefined,
      mucLuongMoi: values.mucLuongMoi,
      soQuyetDinh: values.soQuyetDinh || undefined,
      lyDo: values.lyDo || undefined,
      ghiChu: values.ghiChu || undefined,
    };

    if (isEditing && editingHistory) {
      handler.executeEvent("updateHistory", { id: editingHistory.id, dto });
    } else {
      handler.executeEvent("createHistory", dto);
    }
  };

  return (
    <Modal
      title={isEditing ? "Sửa quá trình công tác" : "Ghi nhận thay đổi"}
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
          {isEditing ? "Cập nhật" : "Ghi nhận"}
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
              />
            )}
          />
          {errors.employeeId && (
            <div className="text-red-500 text-xs mt-1">
              {errors.employeeId.message}
            </div>
          )}
        </Col>

        {referenceInfo && (
          <Col span={24} className="mt-2">
            <div className="rounded bg-muted/50 border border-border px-3 py-2 text-xs text-muted-foreground">
              Hiện tại — Phòng ban: <strong>{referenceInfo.phongBan || "-"}</strong>{" "}
              &nbsp;|&nbsp; Chức danh: <strong>{referenceInfo.chucDanh || "-"}</strong>{" "}
              &nbsp;|&nbsp; Trạng thái:{" "}
              <strong>{labelFor(TRANG_THAI_MOI_OPTIONS, referenceInfo.trangThai)}</strong>
            </div>
          </Col>
        )}

        <Col span={12} className="mt-3">
          <FieldLabel required>Loại thay đổi</FieldLabel>
          <Controller
            name="loaiThayDoi"
            control={control}
            rules={{ required: "Vui lòng chọn loại thay đổi" }}
            render={({ field }) => (
              <Select
                {...field}
                className="w-full"
                options={LOAI_THAY_DOI_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel required>Ngày hiệu lực</FieldLabel>
          <Controller
            name="ngayHieuLuc"
            control={control}
            rules={{ required: "Vui lòng chọn ngày hiệu lực" }}
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
          {errors.ngayHieuLuc && (
            <div className="text-red-500 text-xs mt-1">
              {errors.ngayHieuLuc.message}
            </div>
          )}
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Phòng ban mới</FieldLabel>
          <Controller
            name="departmentIdMoi"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                showSearch
                optionFilterProp="label"
                loading={dangTaiPhongBan}
                placeholder="Chọn phòng ban mới"
                options={phongBanOptions}
                className="w-full"
              />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Chức danh mới</FieldLabel>
          <Controller
            name="chucDanhMoi"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Nhập chức danh mới (nếu có)" />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Trạng thái mới</FieldLabel>
          <Controller
            name="trangThaiMoi"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                className="w-full"
                placeholder="Chọn trạng thái mới (nếu có)"
                options={TRANG_THAI_MOI_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
            )}
          />
        </Col>
        <Col span={12} className="mt-3">
          <FieldLabel>Mức lương mới</FieldLabel>
          <Controller
            name="mucLuongMoi"
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
              <Input.TextArea {...field} rows={2} placeholder="Nhập lý do" />
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
