import { useEffect, useMemo, useState } from "react";
import { Modal, Button, Input, Select, DatePicker, TimePicker, Row, Col } from "antd";
import { Controller, useForm } from "react-hook-form";
import dayjs from "dayjs";
import {
  useDonChamCongHandler,
  useDonChamCongState,
} from "../../DonChamCongHandlerContext";
import { AttendanceRequest } from "@/services/attendanceRequestService";
import { Employee } from "@/services/employeeService";
import { leaveBalanceService, LeaveBalance } from "@/services/leaveBalanceService";
import { BUOI_OPTIONS, LOAI_DON_OPTIONS, LOAI_NGHI_OPTIONS } from "../../constants";
import { TruongDon, hienTruong } from "../../truongTheoLoaiDon";
import { DonChamCongFormValues } from "./DonChamCongForm.state";
import {
  GIA_TRI_MAC_DINH,
  dungDtoQuanTri,
  toFormValues,
} from "./donChamCongForm.convert";
import { KhoiSoDuPhep } from "@/pages/toi/don-tu/components/KhoiSoDuPhep";
import { homNayVN } from "@/ultils/thoiGianVN";
import "./DonChamCongForm.state";

const TIME_FORMAT = "HH:mm";
const DATE_FORMAT = "YYYY-MM-DD";

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
    defaultValues: GIA_TRI_MAC_DINH,
  });

  const isEditing = !!editingRequest;
  const loaiDon = watch("loaiDon");
  const ngay = watch("ngay");
  const denNgay = watch("denNgay");
  const loaiNghi = watch("loaiNghi");
  const employeeId = watch("employeeId");

  /**
   * Cùng một cơ chế "đổi trường theo loại đơn" như trước (điều kiện dựng trên
   * `loaiDon` đang watch), chỉ khác là điều kiện không còn viết tay từng chỗ
   * mà tra bảng luật dùng chung với màn nhân viên — xem truongTheoLoaiDon.ts.
   *
   * `buoi` phụ thuộc thêm vào ngay/denNgay (nửa buổi chỉ có nghĩa với đơn nghỉ
   * đúng một ngày) nên phải watch cả hai, nếu không ô Buổi sẽ không tự ẩn đi
   * khi HR kéo khoảng nghỉ dài ra.
   */
  const co = (truong: TruongDon) =>
    hienTruong({ loaiDon, ngay, denNgay }, truong);

  // Chỉ đơn phép năm mới trừ quỹ — nghỉ bù/không lương/ốm đau... không liên
  // quan tới KhoiSoDuPhep.
  const laDonPhepNam = loaiDon === "nghi_phep" && loaiNghi === "phep_nam";

  // Số dư phép của NHÂN VIÊN ĐANG CHỌN, không phải `getCuaToi()` (đó là "của
  // chính người đăng nhập" — ở đây người đăng nhập là HR, không phải chủ
  // đơn). Nạp lại mỗi khi đổi nhân viên hoặc bật loại nghỉ phép năm.
  const [soDuPhepForm, setSoDuPhepForm] = useState<LeaveBalance[]>([]);
  useEffect(() => {
    if (!formVisible || !laDonPhepNam || !employeeId) {
      setSoDuPhepForm([]);
      return;
    }
    let huy = false;
    leaveBalanceService
      .getList(employeeId)
      .then((ds) => {
        if (!huy) setSoDuPhepForm(ds);
      })
      .catch((error) => {
        // Không chặn form vì lỗi tải số dư (vd HR nhập liệu không có quyền
        // xem `/cham-cong/quy-phep:xem`) — KhoiSoDuPhep tự hiện "chưa có quỹ"
        // khi mảng rỗng, form vẫn tạo/sửa đơn được bình thường.
        console.error("Tải số dư phép (form HR) lỗi:", error);
        if (!huy) setSoDuPhepForm([]);
      });
    return () => {
      huy = true;
    };
  }, [formVisible, laDonPhepNam, employeeId]);

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
    const dto = dungDtoQuanTri(values);

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
      // antd v6: `destroyOnClose` đã deprecated, đổi tên thành `destroyOnHidden`.
      destroyOnHidden
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
          <FieldLabel required>{co("denNgay") ? "Từ ngày" : "Ngày"}</FieldLabel>
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
        {co("denNgay") && (
          <Col span={12} className="mt-3">
            <FieldLabel>Đến ngày</FieldLabel>
            <Controller
              name="denNgay"
              control={control}
              rules={{
                // Guard `co("denNgay")` là lớp phòng thủ thứ hai, KHÔNG thừa
                // dù react-hook-form hiện đã tự bỏ qua luật của ô đã unmount:
                // giá trị cũ vẫn nằm nguyên trong state (đó là lý do
                // `dungDtoQuanTri` phải lọc theo loại đơn), nên chỉ cần một
                // ngày nào đó ô này được giữ mount rồi ẩn bằng CSS, hoặc luật
                // được gom về một hàm thuần kiểu `kiemTraDon()` của màn nhân
                // viên, là HR bị chặn bởi câu lỗi trỏ tới ô không còn trên
                // màn hình — không có cách nào tự gỡ ngoài đóng form.
                validate: (value: string) =>
                  !co("denNgay") ||
                  !value ||
                  // So chuỗi "YYYY-MM-DD" là so đúng thứ tự thời gian, không
                  // cần dựng Date (và không dính múi giờ máy người dùng).
                  value >= ngay ||
                  "Đến ngày phải bằng hoặc sau ngày bắt đầu",
              }}
              render={({ field }) => (
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  placeholder="Để trống nếu nghỉ một ngày"
                  value={field.value ? dayjs(field.value, DATE_FORMAT) : null}
                  onChange={(date) =>
                    field.onChange(date ? date.format(DATE_FORMAT) : "")
                  }
                />
              )}
            />
            {errors.denNgay && (
              <div className="text-red-500 text-xs mt-1">
                {errors.denNgay.message}
              </div>
            )}
          </Col>
        )}
        {/* Ngay dưới ô chọn ngày (Từ ngày/Đến ngày ở trên), TRƯỚC khi HR bấm
            Tạo/Cập nhật — cùng vị trí và cùng lý do như form nhân viên: số dư
            phải thấy được lúc còn đang chọn ngày. */}
        {laDonPhepNam && (
          <Col span={24} className="mt-3">
            <KhoiSoDuPhep danhSach={soDuPhepForm} homNay={homNayVN()} />
          </Col>
        )}
        {co("buoi") && (
          <Col span={12} className="mt-3">
            <FieldLabel>Buổi</FieldLabel>
            <Controller
              name="buoi"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  className="w-full"
                  options={BUOI_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                />
              )}
            />
          </Col>
        )}
        {co("loaiNghi") && (
          <Col span={12} className="mt-3">
            <FieldLabel required>Loại nghỉ</FieldLabel>
            <Controller
              name="loaiNghi"
              control={control}
              rules={{
                // Guard `co("loaiNghi")` — cùng lý do như denNgay ở trên.
                validate: (value: string) =>
                  !co("loaiNghi") || !!value || "Vui lòng chọn loại nghỉ",
              }}
              render={({ field }) => (
                <Select
                  {...field}
                  className="w-full"
                  placeholder="Chọn loại nghỉ"
                  options={LOAI_NGHI_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                />
              )}
            />
            {errors.loaiNghi && (
              <div className="text-red-500 text-xs mt-1">
                {errors.loaiNghi.message}
              </div>
            )}
          </Col>
        )}
        {co("gioTu") && (
          <>
            <Col span={12} className="mt-3">
              <FieldLabel required={loaiDon === "lam_them_gio"}>Giờ từ</FieldLabel>
              <Controller
                name="gioTu"
                control={control}
                rules={{
                  // CHỈ đơn OT bắt buộc: backend tính số giờ OT bằng
                  // `tinhSoGioOt(dto.gioTu!, dto.gioDen!)` — thiếu giờ là nổ
                  // TypeError ở server chứ không phải 400 có thông điệp.
                  validate: (value: string) =>
                    loaiDon !== "lam_them_gio" ||
                    !!value ||
                    "Vui lòng chọn giờ từ",
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
              <FieldLabel required={loaiDon === "lam_them_gio"}>Giờ đến</FieldLabel>
              <Controller
                name="gioDen"
                control={control}
                rules={{
                  validate: (value: string) =>
                    loaiDon !== "lam_them_gio" ||
                    !!value ||
                    "Vui lòng chọn giờ đến",
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
