import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Button,
  Input,
  Select,
  InputNumber,
  Row,
  Col,
  AutoComplete,
  Divider,
} from "antd";
import { FieldLabel, FieldError } from "@/components/form/FieldLabel";
import { OChonNgay } from "@/components/form/OChonNgay";
import { Controller, useForm } from "react-hook-form";
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
import { useChucDanhOptions } from "@/hooks/useChucDanhOptions";
import { DinhKemO } from "@/components/form/DinhKemO";
import { idNhap } from "@/services/dinhKemService";
import {
  cauHinhLuongService,
  type CauHinhLuong,
} from "@/services/cauHinhLuongService";
import "./QuaTrinhCongTacForm.state";

const DEFAULT_VALUES: QuaTrinhCongTacFormValues = {
  employeeId: "",
  loaiThayDoi: "dieu_chuyen",
  ngayHieuLuc: "",
  departmentIdMoi: "",
  chucDanhMoi: "",
  trangThaiMoi: undefined,
  mucLuongMoi: undefined,
  phuCapMoi: {},
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
    phuCapMoi: record.phuCapMoi ?? {},
    soQuyetDinh: record.soQuyetDinh || "",
    lyDo: record.lyDo || "",
    ghiChu: record.ghiChu || "",
  };
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

  const { options: chucDanhOptions } = useChucDanhOptions();

  /**
   * Chứng từ là BẮT BUỘC (yêu cầu d13) nhưng bản ghi chưa tồn tại lúc đính
   * kèm — tệp bám id nháp, BE đếm theo id đó trước khi ghi rồi mới gán sang
   * id thật. Sinh lại mỗi lần mở form: dùng lại id cũ là quyết định vừa nhập
   * dở mang theo chứng từ của lần trước.
   */
  const [idNhapQt, setIdNhapQt] = useState("");

  const [cauHinh, setCauHinh] = useState<CauHinhLuong | null>(null);
  useEffect(() => {
    cauHinhLuongService
      .get()
      .then(setCauHinh)
      .catch(() => setCauHinh(null));
  }, []);
  /** Khoản được đặt riêng theo người — cùng bộ với tab Lương của hồ sơ. */
  const khoanRieng = (cauHinh?.khoanLuong ?? []).filter((k) => k.choPhepRieng);

  useEffect(() => {
    if (formVisible) {
      reset(toFormValues(editingHistory));
      if (!editingHistory) setIdNhapQt(idNhap());
    }
  }, [formVisible, editingHistory, reset]);

  const idDinhKem = editingHistory?.id ?? idNhapQt;

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
      // Chỉ gửi khoản THỰC SỰ có số: gửi cả khoá rỗng là ghi đè mức riêng của
      // người ta bằng `undefined` rồi rơi về mức chung công ty.
      phuCapMoi: Object.fromEntries(
        Object.entries(values.phuCapMoi ?? {}).filter(
          ([, v]) => typeof v === "number",
        ),
      ) as Record<string, number>,
      soQuyetDinh: values.soQuyetDinh || undefined,
      lyDo: values.lyDo || undefined,
      ghiChu: values.ghiChu || undefined,
    };

    if (isEditing && editingHistory) {
      handler.executeEvent("updateHistory", { id: editingHistory.id, dto });
    } else {
      handler.executeEvent("createHistory", { ...dto, idNhap: idNhapQt });
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
              />
            )}
          />
          <FieldError>{errors.employeeId?.message}</FieldError>
        </Col>

        {referenceInfo && (
          <Col span={24} className="mt-2">
            <div className="rounded bg-muted/50 border border-border px-3 py-2 text-[10.5px] text-[hsl(var(--ink-2))]">
              Hiện tại — Phòng ban: <strong>{referenceInfo.phongBan || "-"}</strong>{" "}
              &nbsp;|&nbsp; Chức danh: <strong>{referenceInfo.chucDanh || "-"}</strong>{" "}
              &nbsp;|&nbsp; Trạng thái:{" "}
              <strong>{labelFor(TRANG_THAI_MOI_OPTIONS, referenceInfo.trangThai)}</strong>
            </div>
          </Col>
        )}

        <Col span={12} className="mt-2">
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
        <Col span={12} className="mt-2">
          <FieldLabel required>Ngày hiệu lực</FieldLabel>
          <Controller
            name="ngayHieuLuc"
            control={control}
            rules={{ required: "Vui lòng chọn ngày hiệu lực" }}
            render={({ field }) => (
              <OChonNgay
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <FieldError>{errors.ngayHieuLuc?.message}</FieldError>
        </Col>
        <Col span={12} className="mt-2">
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
        <Col span={12} className="mt-2">
          <FieldLabel>Chức danh mới</FieldLabel>
          <Controller
            name="chucDanhMoi"
            control={control}
            render={({ field }) => (
              <AutoComplete
                {...field}
                options={chucDanhOptions}
                filterOption={(nhap, o) =>
                  (o?.label ?? "")
                    .toString()
                    .toLowerCase()
                    .includes(nhap.toLowerCase())
                }
                placeholder="Chọn theo sơ đồ tổ chức (nếu có)"
                className="w-full"
              />
            )}
          />
        </Col>
        {/* Ô "Trạng thái mới" đã bỏ (yêu cầu d13): đổi trạng thái sang đã
            nghỉ là việc của màn Thôi việc, để cả hai nơi cùng sửa thì không
            ai biết bên nào đúng. Màn Thôi việc tự ghi một dòng "Thôi việc"
            vào chính bảng này khi duyệt. */}
        <Col span={12} className="mt-2">
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
        {khoanRieng.length > 0 && (
          <Col span={24}>
            <Divider titlePlacement="left" className="!mb-2 !mt-3">
              Phụ cấp / KPI mới
            </Divider>
            <div className="mb-2 text-[10.5px] text-[hsl(var(--ink-2))]">
              Để trống = giữ nguyên mức đang áp dụng. Điền số = ghi đè mức
              riêng của người này kể từ quyết định này.
            </div>
            <Row gutter={[12, 8]}>
              {khoanRieng.map((k) => (
                <Col span={12} key={k.ma}>
                  <FieldLabel>{k.ten}</FieldLabel>
                  <Controller
                    name={`phuCapMoi.${k.ma}` as never}
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        value={(field.value as number | null | undefined) ?? null}
                        className="w-full"
                        min={0}
                        placeholder="Giữ nguyên"
                        formatter={(v) =>
                          `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) =>
                          Number((v ?? "").replace(/,/g, "")) as unknown as number
                        }
                      />
                    )}
                  />
                </Col>
              ))}
            </Row>
          </Col>
        )}

        <Col span={24}>
          <Divider titlePlacement="left" className="!mb-2 !mt-3">
            Chứng từ
          </Divider>
          {/* Bắt buộc theo yêu cầu d13 — BE từ chối ghi nếu không có tệp nào. */}
          <DinhKemO
            nhan="Quyết định / chứng từ kèm theo (bắt buộc)"
            doiTuong="qua_trinh_cong_tac"
            doiTuongId={idDinhKem}
            nhom="quyet_dinh"
            nhieu
            goiY="Quyết định bổ nhiệm, quyết định điều chuyển, biên bản thoả thuận…"
          />
        </Col>

        <Col span={24} className="mt-2">
          <FieldLabel>Lý do</FieldLabel>
          <Controller
            name="lyDo"
            control={control}
            render={({ field }) => (
              <Input.TextArea {...field} rows={2} placeholder="Nhập lý do" />
            )}
          />
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
