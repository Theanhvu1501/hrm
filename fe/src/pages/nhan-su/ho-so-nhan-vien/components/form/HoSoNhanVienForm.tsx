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
import { HoSoNhanVienFormValues } from "./HoSoNhanVienForm.state";
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
  loaiHopDong: "thu_viec",
  trangThai: "dang_lam_viec",
};

function toFormValues(employee: Employee | null): HoSoNhanVienFormValues {
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
    loaiHopDong: employee.loaiHopDong || "thu_viec",
    trangThai: employee.trangThai || "dang_lam_viec",
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
    const dto: CreateEmployeeDto = {
      hoTen: values.hoTen,
      cccd: values.cccd,
      ngaySinh: values.ngaySinh || undefined,
      gioiTinh: values.gioiTinh || undefined,
      mst: values.mst || undefined,
      soDienThoai: values.soDienThoai || undefined,
      email: values.email || undefined,
      diaChi: values.diaChi || undefined,
      phongBan: values.phongBan || undefined,
      chucDanh: values.chucDanh || undefined,
      ngayVaoLam: values.ngayVaoLam || undefined,
      loaiHopDong: values.loaiHopDong,
      trangThai: values.trangThai,
      bangCap: (values.bangCap || []).filter((b) => b.ten?.trim()),
      nguoiPhuThuoc: (values.nguoiPhuThuoc || []).filter((n) => n.hoTen?.trim()),
    };

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
