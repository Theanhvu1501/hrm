import { describe, it, expect } from "vitest";
import { toCreateThoiViecDto } from "./thoiViecForm.convert";
import { ThoiViecFormValues } from "./ThoiViecForm.state";

const values = (
  over: Partial<ThoiViecFormValues> = {}
): ThoiViecFormValues => ({
  employeeId: "nv-1",
  ngayNopDon: "2026-07-31",
  loaiThoiViec: "tu_nguyen",
  checklistBanGiao: [],
  ...over,
});

// Danh sách này PHẢI khớp `CreateThoiViecDto` ở
// be/apps/config-service/src/thoi-viec/dto/create-thoi-viec.dto.ts.
// config-service bật `forbidNonWhitelisted: true` (main.ts), nên một khoá lạ
// không bị bỏ qua mà làm hỏng CẢ request — 400 "Bad Request Exception" không
// kèm tên trường.
const KHOA_BE_CHAP_NHAN = [
  "employeeId",
  "ngayNopDon",
  "loaiThoiViec",
  "ngayLamViecCuoi",
  "lyDo",
  "viPham",
  "checklistBanGiao",
  "soQuyetDinh",
  "ghiChu",
];

describe("toCreateThoiViecDto", () => {
  it("không gửi khoá nào ngoài whitelist của BE", () => {
    const dto = toCreateThoiViecDto(
      values({
        ngayLamViecCuoi: "2026-08-15",
        lyDo: "Chuyển công tác",
        viPham: "",
        soQuyetDinh: "QD-01",
        ghiChu: "ghi chú",
        checklistBanGiao: [{ noiDung: "Bàn giao laptop", hoanThanh: false }],
      })
    );

    expect(Object.keys(dto).sort()).toEqual(
      Object.keys(dto)
        .filter((k) => KHOA_BE_CHAP_NHAN.includes(k))
        .sort()
    );
  });

  // Hồi quy: FE từng denormalize sẵn tên/mã nhân viên rồi gửi kèm, khiến MỌI
  // lần lập đơn thôi việc trả 400. BE tự tra hồ sơ và tự điền hai trường này
  // (thoi-viec.service.ts), nên FE gửi lên vừa thừa vừa làm chết request.
  //
  // Ép kiểu là CỐ Ý: `ThoiViecFormValues` đã bỏ hẳn hai trường nên TypeScript
  // chặn được đường tái phát thông thường. Test này canh nốt trường hợp giá
  // trị thừa lọt vào form lúc chạy thật (state cũ trong localStorage, dữ liệu
  // BE trả về được nạp thẳng vào form) — lúc đó TS không giúp được.
  it("không gửi employeeName/employeeCode kể cả khi form có sẵn giá trị", () => {
    const dto = toCreateThoiViecDto({
      ...values(),
      employeeName: "Nguyễn Văn Hải",
      employeeCode: "NV0001",
    } as ThoiViecFormValues);

    expect(dto).not.toHaveProperty("employeeName");
    expect(dto).not.toHaveProperty("employeeCode");
  });

  it("giữ nguyên các trường BE chấp nhận", () => {
    const dto = toCreateThoiViecDto(
      values({ ngayLamViecCuoi: "2026-08-15", lyDo: "Chuyển công tác" })
    );

    expect(dto.employeeId).toBe("nv-1");
    expect(dto.ngayNopDon).toBe("2026-07-31");
    expect(dto.loaiThoiViec).toBe("tu_nguyen");
    expect(dto.ngayLamViecCuoi).toBe("2026-08-15");
    expect(dto.lyDo).toBe("Chuyển công tác");
  });

  it("chuyển chuỗi rỗng và checklist rỗng thành undefined", () => {
    const dto = toCreateThoiViecDto(
      values({ lyDo: "", viPham: "", soQuyetDinh: "", ghiChu: "" })
    );

    expect(dto.lyDo).toBeUndefined();
    expect(dto.viPham).toBeUndefined();
    expect(dto.soQuyetDinh).toBeUndefined();
    expect(dto.ghiChu).toBeUndefined();
    expect(dto.checklistBanGiao).toBeUndefined();
  });
});
