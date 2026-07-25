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

  // Cùng bẫy đúng như trên, cho công tắc "Cho phép chấm công ngoài khu vực"
  // (ChamCongTab). Đây là phép kiểm mạnh nhất trong cả bộ: nó gọi thẳng hàm
  // dựng DTO thật sự chạy khi bấm "Cập nhật"/"Thêm" (xem
  // HoSoNhanVienForm.tsx#onSubmit), không phải một hàm phụ trợ tách riêng.
  it("bỏ tick 'chấm công ngoài khu vực' thì KHOÁ choPhepChamNgoaiVung vẫn nằm trong body gửi đi (giá trị false)", () => {
    const body = bodyThucGui(
      toCreateEmployeeDto(values({ choPhepChamNgoaiVung: false }))
    );

    expect("choPhepChamNgoaiVung" in body).toBe(true);
    expect(body.choPhepChamNgoaiVung).toBe(false);
  });

  it("hồ sơ chưa từng có trường này (undefined) vẫn gửi false, không gửi undefined", () => {
    const body = bodyThucGui(
      toCreateEmployeeDto(values({ choPhepChamNgoaiVung: undefined }))
    );

    expect("choPhepChamNgoaiVung" in body).toBe(true);
    expect(body.choPhepChamNgoaiVung).toBe(false);
  });

  it("bật công tắc 'chấm công ngoài khu vực' thì gửi true", () => {
    const body = bodyThucGui(
      toCreateEmployeeDto(values({ choPhepChamNgoaiVung: true }))
    );

    expect(body.choPhepChamNgoaiVung).toBe(true);
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

  it("tab Lương: gửi đúng giá trị số/cờ, mucKhaiBao trống thì không bị ép thành 0", () => {
    const body = bodyThucGui(
      toCreateEmployeeDto(
        values({
          luongThoaThuan: 15000000,
          dongBH: true,
          soNguoiPhuThuoc: 2,
          mucKhaiBao: undefined,
        })
      )
    );

    expect(body.luongThoaThuan).toBe(15000000);
    expect(body.dongBH).toBe(true);
    expect(body.soNguoiPhuThuoc).toBe(2);
    expect("mucKhaiBao" in body).toBe(false);
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

describe("toCreateEmployeeDto — cấu hình lương riêng (P4.1)", () => {
  it("gộp cấu hình riêng + hopDongThu2 vào DTO", () => {
    const dto = toCreateEmployeeDto(
      values({ hopDongThu2: true, orCongChuan: 26, orThuViecPhanTram: 90 })
    );

    expect(dto.hopDongThu2).toBe(true);
    expect(dto.cauHinhLuongRieng).toEqual({ congChuan: 26, thuViecTyLe: 0.9 });
  });

  it("không nhập cấu hình riêng → gửi {} để xoá được cấu hình cũ", () => {
    const dto = toCreateEmployeeDto(values());

    expect(dto.cauHinhLuongRieng).toEqual({});
    expect(dto.hopDongThu2).toBe(false);
  });

  it("khoá cauHinhLuongRieng/hopDongThu2 vẫn nằm trong body sau JSON.stringify", () => {
    const body = bodyThucGui(toCreateEmployeeDto(values()));

    expect("cauHinhLuongRieng" in body).toBe(true);
    expect("hopDongThu2" in body).toBe(true);
  });
});
