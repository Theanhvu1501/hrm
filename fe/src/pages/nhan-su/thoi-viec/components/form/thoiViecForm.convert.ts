import { CreateResignationDto } from "@/services/resignationService";
import { ThoiViecFormValues } from "./ThoiViecForm.state";

/**
 * Dựng DTO gửi lên BE từ giá trị form đơn thôi việc.
 *
 * Tách khỏi component để test được — xem `thoiViecForm.convert.test.ts`.
 *
 * QUY TẮC: chỉ gửi các khoá có khai trong `CreateThoiViecDto` ở
 * be/apps/config-service/src/thoi-viec/dto/create-thoi-viec.dto.ts.
 * config-service bật `forbidNonWhitelisted: true` (main.ts), nên MỘT khoá lạ
 * không bị bỏ qua mà làm hỏng CẢ request: BE trả 400 "Bad Request Exception"
 * trống trơn, không kèm tên trường, và log server cũng chỉ ghi đúng chừng đó.
 *
 * Cụ thể KHÔNG gửi `employeeName`/`employeeCode`: BE tự tra hồ sơ nhân viên
 * theo `employeeId` rồi tự điền hai trường denormalize đó
 * (`ThoiViec_Service.create`). FE gửi kèm thì vừa thừa vừa làm chết request —
 * đúng lỗi đã khiến mọi lần lập đơn thôi việc trả 400.
 */
export function toCreateThoiViecDto(
  values: ThoiViecFormValues
): CreateResignationDto {
  return {
    employeeId: values.employeeId,
    ngayNopDon: values.ngayNopDon,
    loaiThoiViec: values.loaiThoiViec,
    ngayLamViecCuoi: values.ngayLamViecCuoi || undefined,
    lyDo: values.lyDo || undefined,
    viPham: values.viPham || undefined,
    checklistBanGiao:
      values.checklistBanGiao && values.checklistBanGiao.length > 0
        ? values.checklistBanGiao
        : undefined,
    soQuyetDinh: values.soQuyetDinh || undefined,
    ghiChu: values.ghiChu || undefined,
  };
}
