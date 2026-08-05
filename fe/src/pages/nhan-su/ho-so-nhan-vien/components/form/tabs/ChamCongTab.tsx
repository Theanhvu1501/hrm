import { useEffect, useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Select, Checkbox, Alert } from "antd";
import { workShiftService, WorkShift } from "@/services/workShiftService";
import { nguoiDungService } from "@/services/nguoiDungService";
import { cauHinhChamCongService } from "@/services/cauHinhChamCongService";
import type { NguoiDung } from "@/types";
import { HoSoNhanVienFormValues } from "../HoSoNhanVienForm.state";
import {
  NGAY_TRONG_TUAN_OPTIONS,
  nguoiDungToUserOptions,
  workShiftToOptions,
} from "./chamCongTab.convert";

const TEN_THU: Record<number, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
};

/** [1,2,3,4,5] → "T2, T3, T4, T5, T6". Rỗng/lỗi mạng → null (ẩn phần trong ngoặc). */
function moTaLich(lich: number[] | null): string | null {
  if (!lich || lich.length === 0) return null;
  return [...lich]
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((t) => TEN_THU[t])
    .join(", ");
}

export function ChamCongTab() {
  const { control } = useFormContext<HoSoNhanVienFormValues>();

  const [shiftList, setShiftList] = useState<WorkShift[]>([]);
  const [userList, setUserList] = useState<NguoiDung[]>([]);
  const [lichChung, setLichChung] = useState<number[] | null>(null);

  useEffect(() => {
    workShiftService
      .getList()
      .then(setShiftList)
      .catch((e) => {
        console.error("Tải ca làm việc lỗi:", e);
        setShiftList([]);
      });

    // Không có API "lấy tất cả tài khoản" — lấy một trang lớn để phủ hầu hết
    // công ty vừa và nhỏ. Nếu công ty vượt quá con số này, ô chọn cần thêm
    // tìm kiếm phía server ở một task sau.
    nguoiDungService
      .getAll({ limit: 500 })
      .then((res) => setUserList(res.data))
      .catch((e) => {
        console.error("Tải danh sách tài khoản lỗi:", e);
        setUserList([]);
      });

    cauHinhChamCongService
      .get()
      .then((ch) => setLichChung(ch.ngayLamViecTrongTuan ?? []))
      .catch((e) => {
        console.error("Tải cấu hình chấm công lỗi:", e);
        setLichChung(null);
      });
  }, []);

  const userOptions = useMemo(() => nguoiDungToUserOptions(userList), [userList]);
  const shiftOptions = useMemo(() => workShiftToOptions(shiftList), [shiftList]);

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className="mb-3"
        message="Thiếu một trong ba mục dưới đây thì nhân viên sẽ không chấm công được."
      />

      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">Tài khoản đăng nhập</label>
        <Controller
          name="userId"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              allowClear
              showSearch
              optionFilterProp="label"
              className="w-full"
              placeholder="Chọn tài khoản trong công ty"
              options={userOptions}
              value={field.value || undefined}
            />
          )}
        />
        <div className="mt-1 text-xs text-gray-500">
          Bắt buộc để nhân viên tự chấm công và xem bảng công của mình. Hệ thống
          không tự khớp theo email — phải gán tay. Không gán tài khoản thì nhân
          viên không tự chấm công được.
        </div>
      </div>

      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">Ca làm việc</label>
        <Controller
          name="workShiftId"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              allowClear
              className="w-full"
              placeholder="Chọn ca"
              options={shiftOptions}
              value={field.value || undefined}
            />
          )}
        />
        <div className="mt-1 text-xs text-gray-500">
          Không gán ca thì vẫn chấm công được nhưng hệ thống không tính đi muộn
          / về sớm.
        </div>
      </div>

      <div className="mb-3">
        <label className="block mb-1 text-sm font-medium">
          Ngày làm việc trong tuần
        </label>
        <Controller
          name="ngayLamViecTrongTuan"
          control={control}
          render={({ field }) => (
            <Checkbox.Group
              options={NGAY_TRONG_TUAN_OPTIONS}
              value={field.value || []}
              onChange={field.onChange}
            />
          )}
        />
        <div className="mt-1 text-xs text-gray-500">
          Bỏ trống = theo lịch chung của công ty
          {moTaLich(lichChung) ? ` (${moTaLich(lichChung)})` : ""}. Chỉ khai ở
          đây khi người này làm khác lịch chung.
        </div>
      </div>

      <div className="mb-3">
        <Controller
          name="choPhepChamNgoaiVung"
          control={control}
          render={({ field }) => (
            <Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)}>
              Cho phép chấm công ngoài khu vực
            </Checkbox>
          )}
        />
        <div className="mt-1 text-xs text-gray-500">
          Mặc định nhân viên đứng ngoài bán kính địa điểm sẽ KHÔNG chấm công
          được. Bật ô này cho người làm thị trường, đi công trình hoặc làm tại
          nhà. Bản ghi của họ vẫn được đánh dấu "ngoài vùng" để HR đối chiếu.
        </div>
      </div>
    </div>
  );
}
