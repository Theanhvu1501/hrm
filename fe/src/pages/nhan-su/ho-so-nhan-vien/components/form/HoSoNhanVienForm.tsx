import { useEffect } from "react";
import { Modal, Tabs, Button } from "antd";
import { FormProvider, useForm } from "react-hook-form";
import {
  useHoSoNhanVienHandler,
  useHoSoNhanVienState,
} from "../../HoSoNhanVienHandlerContext";
import { CreateEmployeeDto, Employee } from "@/services/employeeService";
import { CaNhanTab } from "./tabs/CaNhanTab";
import { BangCapGiaCanhTab } from "./tabs/BangCapGiaCanhTab";
import { CongViecTab } from "./tabs/CongViecTab";
import { ChamCongTab } from "./tabs/ChamCongTab";
import { LuongTab } from "./tabs/LuongTab";
import { HoSoNhanVienFormValues } from "./HoSoNhanVienForm.state";
import { cauHinhLuongRiengToForm } from "./tabs/luongTab.convert";
import { toCreateEmployeeDto } from "./hoSoNhanVienForm.convert";
import "./HoSoNhanVienForm.state";

const DEFAULT_VALUES: HoSoNhanVienFormValues = {
  hoTen: "",
  cccd: "",
  ngaySinh: "",
  gioiTinh: undefined,
  mst: "",
  soDienThoai: "",
  email: "",
  diaChi: "",
  bangCap: [],
  nguoiPhuThuoc: [],
  phongBan: "",
  chucDanh: "",
  ngayVaoLam: "",
  ngayChinhThuc: "",
  loaiHopDong: "thu_viec",
  trangThai: "dang_lam_viec",
  userId: undefined,
  workShiftId: undefined,
  ngayLamViecTrongTuan: [],
  // Mặc định an toàn: nhân viên mới chưa được phép chấm công ngoài khu vực
  // cho tới khi HR chủ động bật (xem chamCongTab.convert.ts).
  choPhepChamNgoaiVung: false,
  luongThoaThuan: 0,
  mucKhaiBao: undefined,
  // Vắng khoá = ăn mức chung công ty; đừng khởi tạo 0 cho từng khoản, 0 mang
  // nghĩa khác hẳn ("người này không có khoản đó").
  giaTriKhoan: {},
  phuCapCoDinh: 0,
  soNguoiPhuThuoc: 0,
  dongBH: false,
  thoiVu: false,
  camKet: false,
  hopDongThu2: false,
  orCongChuan: undefined,
  orThuViecPhanTram: undefined,
  orBhxhPhanTram: undefined,
  orBhxhCanCu: undefined,
};

// Xuất ra để test được trực tiếp chiều "nạp NV có sẵn vào form" — cùng lý do
// `toCreateEmployeeDto` được tách ra file convert.ts riêng: lỗi ở đây vô hình
// trên màn hình (modal vẫn mở, chỉ có ô là trống/sai), chỉ test mới bắt được.
export function toFormValues(employee: Employee | null): HoSoNhanVienFormValues {
  if (!employee) return DEFAULT_VALUES;

  return {
    hoTen: employee.hoTen || "",
    cccd: employee.cccd || "",
    ngaySinh: employee.ngaySinh || "",
    gioiTinh: employee.gioiTinh,
    mst: employee.mst || "",
    soDienThoai: employee.soDienThoai || "",
    email: employee.email || "",
    diaChi: employee.diaChi || "",
    bangCap: employee.bangCap || [],
    nguoiPhuThuoc: employee.nguoiPhuThuoc || [],
    phongBan: employee.phongBan || "",
    chucDanh: employee.chucDanh || "",
    ngayVaoLam: employee.ngayVaoLam || "",
    ngayChinhThuc: employee.ngayChinhThuc || "",
    loaiHopDong: employee.loaiHopDong || "thu_viec",
    trangThai: employee.trangThai || "dang_lam_viec",
    userId: employee.userId,
    workShiftId: employee.workShiftId,
    ngayLamViecTrongTuan: employee.ngayLamViecTrongTuan || [],
    // `??` (không phải `||`): hồ sơ có thể đã được lưu `false` một cách
    // tường minh — không được đảo ngược nó về mặc định. Hồ sơ cũ chưa từng
    // có trường này (undefined) mới rơi vào mặc định an toàn `false`.
    choPhepChamNgoaiVung: employee.choPhepChamNgoaiVung ?? false,
    // Cùng quy tắc `??`: 0/false đọc từ BE là giá trị hợp lệ, không phải
    // "chưa có". `mucKhaiBao` là ngoại lệ — để `undefined` khi vắng mặt vì
    // nó có nghĩa "dùng mức mặc định trong Cấu hình lương", khác với 0.
    luongThoaThuan: employee.luongThoaThuan ?? 0,
    mucKhaiBao: employee.mucKhaiBao,
    giaTriKhoan: employee.giaTriKhoan ?? {},
    phuCapCoDinh: employee.phuCapCoDinh ?? 0,
    soNguoiPhuThuoc: employee.soNguoiPhuThuoc ?? 0,
    dongBH: employee.dongBH ?? false,
    thoiVu: employee.thoiVu ?? false,
    camKet: employee.camKet ?? false,
    hopDongThu2: employee.hopDongThu2 ?? false,
    ...cauHinhLuongRiengToForm(employee.cauHinhLuongRieng),
  };
}

export function HoSoNhanVienForm() {
  const handler = useHoSoNhanVienHandler();
  const [formVisible] = useHoSoNhanVienState("formVisible", false);
  const [editingEmployee] = useHoSoNhanVienState(
    "editingEmployee",
    null as Employee | null
  );
  const [saving] = useHoSoNhanVienState("saving", false);

  const methods = useForm<HoSoNhanVienFormValues>({
    defaultValues: DEFAULT_VALUES,
  });
  const { handleSubmit, reset } = methods;

  const isEditing = !!editingEmployee;

  useEffect(() => {
    if (formVisible) {
      reset(toFormValues(editingEmployee));
    }
  }, [formVisible, editingEmployee, reset]);

  const handleCancel = () => {
    handler.executeEvent("closeForm", {});
  };

  const onSubmit = (values: HoSoNhanVienFormValues) => {
    // Việc dựng DTO nằm ở `hoSoNhanVienForm.convert.ts` để test được — quy
    // tắc "trường xoá trắng phải gửi giá trị rỗng thật, không `undefined`"
    // hoàn toàn vô hình trên màn hình nếu làm sai.
    const dto: CreateEmployeeDto = toCreateEmployeeDto(values);

    if (isEditing && editingEmployee) {
      handler.executeEvent("updateEmployee", { id: editingEmployee.id, dto });
    } else {
      handler.executeEvent("createEmployee", dto);
    }
  };

  const items = [
    { key: "ca-nhan", label: "Cá nhân", children: <CaNhanTab /> },
    {
      key: "bang-cap-gia-canh",
      label: "Bằng cấp & Gia cảnh",
      children: <BangCapGiaCanhTab />,
    },
    { key: "cong-viec", label: "Công việc", children: <CongViecTab /> },
    { key: "cham-cong", label: "Chấm công", children: <ChamCongTab /> },
    { key: "luong", label: "Lương", children: <LuongTab /> },
  ];

  return (
    <Modal
      title={isEditing ? "Sửa hồ sơ nhân viên" : "Thêm nhân viên"}
      open={formVisible}
      onCancel={handleCancel}
      width={800}
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
      <FormProvider {...methods}>
        <Tabs items={items} />
      </FormProvider>
    </Modal>
  );
}
