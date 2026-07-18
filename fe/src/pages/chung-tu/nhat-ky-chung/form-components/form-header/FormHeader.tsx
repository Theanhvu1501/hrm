import {
  DatePicker,
  Select,
  Input,
} from "antd";
import {
  useNhatKyChungFormState,
  useNhatKyChungFormHandler,
} from "../../NhatKyChungFormHandlerContext";
import { ChungTuHeader } from "../../form-handler/sub-handler/init/init.state";
import { LoaiGiaoDich } from "@/types";

export function FormHeader() {
  const handler = useNhatKyChungFormHandler();
  const [header] = useNhatKyChungFormState("header", null);
  const [isEditing] = useNhatKyChungFormState("isEditing", false);
  const [loaiGiaoDichList] = useNhatKyChungFormState("loaiGiaoDichList", [] as LoaiGiaoDich[]);

  // Convert loaiGiaoDichList to options format
  const loaiGiaoDichOptions = loaiGiaoDichList.map((lgd: LoaiGiaoDich) => ({
    value: lgd.ma,
    label: lgd.ten,
  }));

  const handleFieldChange = (field: keyof ChungTuHeader, value: unknown) => {
    handler.executeEvent("updateHeader", { field, value });
  };

  const handleLoaiGiaoDichChange = (value: string) => {
    handler.executeEvent("handleLoaiGiaoDichChange", { loaiGiaoDich: value });
  };

  return (
    <div className="nkc-header-form">
      {/* Row 1: Các field cơ bản */}
      <div className="flex flex-wrap gap-3 items-end mb-2">
        {isEditing && header?.soPhieu && (
          <div className="nkc-field flex-1" style={{ minWidth: 80 }}>
            <label className="nkc-label">Số phiếu</label>
            <Input value={header.soPhieu} disabled className="font-semibold w-full" size="small" />
          </div>
        )}
        <div className="nkc-field flex-1" style={{ minWidth: 100 }}>
          <label className="nkc-label">
            Ngày Phát Sinh CT <span className="text-red-500">*</span>
          </label>
          <DatePicker
            format="DD/MM/YYYY"
            className="w-full"
            value={header?.ngay}
            onChange={(date) => handleFieldChange("ngay", date)}
            placeholder="Chọn ngày"
            size="small"
          />
        </div>
        <div className="nkc-field flex-1" style={{ minWidth: 100 }}>
          <label className="nkc-label">Ngày ghi sổ</label>
          <DatePicker
            format="DD/MM/YYYY"
            className="w-full"
            value={header?.ngayGhiSo}
            onChange={(date) => handleFieldChange("ngayGhiSo", date)}
            placeholder="Mặc định = ngày phát sinh"
            size="small"
          />
        </div>
        <div className="nkc-field flex-1" style={{ minWidth: 120 }}>
          <label className="nkc-label">
            Loại GD <span className="text-red-500">*</span>
          </label>
          <Select
            placeholder="Chọn loại"
            disabled={isEditing}
            value={header?.loaiGiaoDich}
            onChange={handleLoaiGiaoDichChange}
            options={loaiGiaoDichOptions}
            size="small"
            className="w-full"
          />
        </div>
        <div className="nkc-field flex-[2]" style={{ minWidth: 150 }}>
          <label className="nkc-label">Người GD</label>
          <Input
            placeholder="Người giao dịch"
            value={header?.nguoiGiaoDich || ""}
            onChange={(e) => handleFieldChange("nguoiGiaoDich", e.target.value)}
            size="small"
            className="w-full"
          />
        </div>
        <div className="nkc-field flex-[2]" style={{ minWidth: 150 }}>
          <label className="nkc-label">Địa chỉ</label>
          <Input
            placeholder="Địa chỉ"
            value={header?.diaChi || ""}
            onChange={(e) => handleFieldChange("diaChi", e.target.value)}
            size="small"
            className="w-full"
          />
        </div>
      </div>
      {/* Row 2: Diễn giải chung - full width */}
      <div className="nkc-field w-full">
        <label className="nkc-label">Diễn giải chung</label>
        <Input.TextArea
          placeholder="Nhập diễn giải chung cho chứng từ"
          value={header?.dienGiaiChung || ""}
          onChange={(e) => handleFieldChange("dienGiaiChung", e.target.value)}
          autoSize={{ minRows: 2, maxRows: 5 }}
          className="nkc-textarea"
        />
      </div>
    </div>
  );
}
