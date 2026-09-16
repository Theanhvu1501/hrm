import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Button,
  Input,
  Select,
  Checkbox,
  Row,
  Col,
  Space,
  Divider,
} from "antd";
import { FieldLabel, FieldError } from "@/components/form/FieldLabel";
import { OChonNgay } from "@/components/form/OChonNgay";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
  useThoiViecHandler,
  useThoiViecState,
} from "../../ThoiViecHandlerContext";
import { Resignation } from "@/services/resignationService";
import { Employee } from "@/services/employeeService";
import { LOAI_THOI_VIEC_OPTIONS } from "../../constants";
import { DinhKemO } from "@/components/form/DinhKemO";
import { idNhap } from "@/services/dinhKemService";
import { toCreateThoiViecDto } from "./thoiViecForm.convert";
import { ThoiViecFormValues } from "./ThoiViecForm.state";
import "./ThoiViecForm.state";

const DEFAULT_VALUES: ThoiViecFormValues = {
  canTuyenThayThe: false,
  ghiChuTuyenDung: "",
  employeeId: "",
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
    ngayNopDon: record.ngayNopDon || "",
    ngayLamViecCuoi: record.ngayLamViecCuoi || "",
    loaiThoiViec: record.loaiThoiViec || "tu_nguyen",
    lyDo: record.lyDo || "",
    viPham: record.viPham || "",
    checklistBanGiao: record.checklistBanGiao || [],
    soQuyetDinh: record.soQuyetDinh || "",
    ghiChu: record.ghiChu || "",
    canTuyenThayThe: record.canTuyenThayThe ?? false,
    ghiChuTuyenDung: record.ghiChuTuyenDung || "",
  };
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

  /** Tệp đính kèm bám id nháp khi hồ sơ chưa lưu; BE gán lại sau khi tạo. */
  const [idNhapTv, setIdNhapTv] = useState("");

  useEffect(() => {
    if (formVisible) {
      reset(toFormValues(editingResignation));
      if (!editingResignation) setIdNhapTv(idNhap());
    }
  }, [formVisible, editingResignation, reset]);

  const idDinhKem = editingResignation?.id ?? idNhapTv;

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
    // CHỈ đặt employeeId. Tên và mã nhân viên là hai trường denormalize do BE
    // tự tra từ hồ sơ (`ThoiViec_Service.create`) — xem `toCreateThoiViecDto`.
    setValue("employeeId", employeeId);
  };

  const onSubmit = (values: ThoiViecFormValues) => {
    const dto = toCreateThoiViecDto(values);

    if (isEditing && editingResignation) {
      handler.executeEvent("updateResignation", { id: editingResignation.id, dto });
    } else {
      handler.executeEvent("createResignation", { ...dto, idNhap: idNhapTv });
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
          <FieldError>{errors.employeeId?.message}</FieldError>
        </Col>

        <Col span={12} className="mt-2">
          <FieldLabel required>Ngày nộp đơn</FieldLabel>
          <Controller
            name="ngayNopDon"
            control={control}
            rules={{ required: "Vui lòng chọn ngày nộp đơn" }}
            render={({ field }) => (
              <OChonNgay
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <FieldError>{errors.ngayNopDon?.message}</FieldError>
        </Col>
        <Col span={12} className="mt-2">
          <FieldLabel>Ngày làm việc cuối</FieldLabel>
          <Controller
            name="ngayLamViecCuoi"
            control={control}
            render={({ field }) => (
              <OChonNgay
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </Col>
        <Col span={12} className="mt-2">
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
        <Col span={12} className="mt-2">
          <FieldLabel>Số quyết định</FieldLabel>
          <Controller
            name="soQuyetDinh"
            control={control}
            render={({ field }) => (
              <Input {...field} placeholder="Nhập số quyết định" />
            )}
          />
        </Col>
        <Col span={24} className="mt-2">
          <FieldLabel>Lý do</FieldLabel>
          <Controller
            name="lyDo"
            control={control}
            render={({ field }) => (
              <Input.TextArea {...field} rows={2} placeholder="Nhập lý do thôi việc" />
            )}
          />
        </Col>
        <Col span={24} className="mt-2">
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

        <Col span={24} className="mt-2">
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

        <Col span={24}>
          <Divider titlePlacement="left" className="!mb-2 !mt-3">
            Hồ sơ đính kèm
          </Divider>
          {/* Yêu cầu d14. Biên bản bàn giao và thanh lý hợp đồng là ĐIỀU KIỆN
              để chuyển hồ sơ sang "Hoàn thành" — BE chặn nếu thiếu. Đơn xin
              nghỉ không bắt buộc vì thôi việc do hết hạn HĐ hoặc kỷ luật thì
              không có đơn nào cả. */}
          <div className="space-y-2.5">
            <DinhKemO
              nhan="Đơn xin nghỉ việc"
              doiTuong="thoi_viec"
              doiTuongId={idDinhKem}
              nhom="don_xin_nghi"
              nhieu
            />
            <DinhKemO
              nhan="Biên bản bàn giao (bắt buộc khi hoàn thành)"
              doiTuong="thoi_viec"
              doiTuongId={idDinhKem}
              nhom="ban_giao"
              nhieu
            />
            <DinhKemO
              nhan="Thanh lý hợp đồng (bắt buộc khi hoàn thành)"
              doiTuong="thoi_viec"
              doiTuongId={idDinhKem}
              nhom="thanh_ly"
              nhieu
            />
          </div>
        </Col>

        <Col span={24}>
          <Divider titlePlacement="left" className="!mb-2 !mt-3">
            Tuyển thay thế
          </Divider>
          <Controller
            name="canTuyenThayThe"
            control={control}
            render={({ field }) => (
              <div>
                <Checkbox
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                >
                  Vị trí này cần tuyển người thay
                </Checkbox>
                <div className="ml-6 text-[10.5px] text-[hsl(var(--ink-2))]">
                  Ghi nhận nhu cầu để phân hệ Tuyển dụng lập kế hoạch — chưa
                  tạo kế hoạch ngay tại đây.
                </div>
              </div>
            )}
          />
          <div className="mt-2">
            <Controller
              name="ghiChuTuyenDung"
              control={control}
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  rows={2}
                  placeholder="Yêu cầu tuyển thay thế: thời hạn, số lượng, yêu cầu chuyên môn…"
                />
              )}
            />
          </div>
        </Col>

        <Col span={24} className="mt-2">
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
