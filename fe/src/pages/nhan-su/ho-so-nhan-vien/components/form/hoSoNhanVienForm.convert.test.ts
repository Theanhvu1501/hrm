import { describe, it, expect } from "vitest";
import { toCreateEmployeeDto } from "./hoSoNhanVienForm.convert";
import { HoSoNhanVienFormValues } from "./HoSoNhanVienForm.state";

const values = (
  over: Partial<HoSoNhanVienFormValues> = {}
): HoSoNhanVienFormValues => ({
  hoTen: "Nguyễn Văn Hải",
  cccd: "001111111111",
  bangCap: [],
  nguoiPhuThuoc: [],
  loaiHopDong: "thu_viec",
  trangThai: "dang_lam_viec",
  ...over,
});

/**
 * `ServiceBase` dùng `transformRequest: JSON.stringify`, và `JSON.stringify`
 * LOẠI HẲN khoá mang `undefined` khỏi body. `NhanVien_Service.update` lại là
 * `Object.assign(item, dto)` nên khoá vắng mặt = "giữ nguyên giá trị cũ".
 *
 * Vì vậy phép kiểm quyết định ở đây KHÔNG phải `expect(dto.userId).toBe("")`
 * mà là: sau khi qua `JSON.stringify`, khoá `userId` có còn trong body
 * không. Đó đúng là thứ chạy trên đường truyền thật.
 */
const bodyThucGui = (dto: unknown): Record<string, unknown> =>
  JSON.parse(JSON.stringify(dto));

describe("toCreateEmployeeDto — trường gỡ được liên kết", () => {
  it("bỏ trống tài khoản thì KHOÁ userId vẫn nằm trong body gửi đi (chuỗi rỗng)", () => {
    const dto = toCreateEmployeeDto(values({ userId: undefined }));
    const body = bodyThucGui(dto);

    expect("userId" in body).toBe(true);
    expect(body.userId).toBe("");
  });

  it("bỏ trống ca làm việc thì KHOÁ workShiftId vẫn nằm trong body gửi đi", () => {
    const dto = toCreateEmployeeDto(values({ workShiftId: undefined }));
    const body = bodyThucGui(dto);

    expect("workShiftId" in body).toBe(true);
    expect(body.workShiftId).toBe("");
  });

  it("xoá ô đang có giá trị (chuỗi rỗng từ allowClear) cũng gửi chuỗi rỗng", () => {
    const body = bodyThucGui(
      toCreateEmployeeDto(values({ userId: "", workShiftId: "" }))
    );

    expect(body.userId).toBe("");
    expect(body.workShiftId).toBe("");
  });

  it("có chọn tài khoản/ca thì gửi nguyên giá trị", () => {
    const body = bodyThucGui(
      toCreateEmployeeDto(
        values({ userId: "sso-sub-123", workShiftId: "shift-1" })
      )
    );

    expect(body.userId).toBe("sso-sub-123");
    expect(body.workShiftId).toBe("shift-1");
  });

  it("bỏ tick hết ngày làm việc vẫn gửi mảng rỗng (không bị JSON.stringify nuốt)", () => {
    const body = bodyThucGui(
      toCreateEmployeeDto(values({ ngayLamViecTrongTuan: undefined }))
    );

    expect("ngayLamViecTrongTuan" in body).toBe(true);
    expect(body.ngayLamViecTrongTuan).toEqual([]);
  });
});

describe("toCreateEmployeeDto — các trường tuỳ chọn khác giữ nguyên hành vi cũ", () => {
  it("trường mô tả bỏ trống vẫn được lược khỏi body (không cần ghi đè)", () => {
    // Các trường này không có nhu cầu "xoá trắng có chủ đích" như userId /
    // workShiftId, nên giữ nguyên `undefined` — thay đổi phạm vi này sẽ
    // ghi đè dữ liệu ở những tab mà người dùng không hề mở.
    const body = bodyThucGui(toCreateEmployeeDto(values()));

    expect("mst" in body).toBe(false);
    expect("diaChi" in body).toBe(false);
    expect("soDienThoai" in body).toBe(false);
  });

  it("lọc bằng cấp / người phụ thuộc rỗng như trước", () => {
    const body = bodyThucGui(
      toCreateEmployeeDto(
        values({
          bangCap: [{ ten: "  " }, { ten: "Cử nhân" }] as never,
          nguoiPhuThuoc: [{ hoTen: "" }] as never,
        })
      )
    );

    expect(body.bangCap).toEqual([{ ten: "Cử nhân" }]);
    expect(body.nguoiPhuThuoc).toEqual([]);
  });
});
