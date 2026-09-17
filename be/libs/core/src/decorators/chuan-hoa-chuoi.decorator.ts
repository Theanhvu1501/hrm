import { Transform } from 'class-transformer';

/**
 * Các loại dấu cách KHÔNG phải U+0020 mà `String.prototype.trim()` có cắt,
 * nhưng `@IsEmail`/`@IsNotEmpty` vẫn coi là ký tự thường: dấu cách cứng
 * (U+00A0 — Word/Excel sinh ra rất nhiều), dấu cách theo em/en (U+2000–200A),
 * dấu cách hẹp không ngắt (U+202F), dấu cách toán học (U+205F), dấu cách
 * tiếng Nhật (U+3000) và U+1680.
 *
 * Quy về dấu cách thường TRƯỚC khi `trim()` — nếu không, "a@b.com " sẽ
 * sống sót qua `trim()` và vẫn trượt `@IsEmail`.
 */
const KHOANG_TRANG_LA = /[   -   　]/g;

/**
 * Ký tự rộng-không: nối/không-nối rộng-không (U+200B–U+200D) và BOM (U+FEFF).
 * Mắt thường hoàn toàn không thấy, hay lẫn vào khi dán từ trình duyệt/Word.
 * Xoá hẳn chứ không đổi thành dấu cách — chúng không phải khoảng trắng.
 */
const KY_TU_RONG_KHONG = /[​-‍﻿]/g;

/**
 * Dọn chuỗi người dùng DÁN VÀO trước khi class-validator soi tới: quy mọi
 * loại dấu cách lạ về dấu cách thường, xoá ký tự rộng-không, rồi cắt hai đầu.
 *
 * Vì sao phải có: sự cố production 2026-09-17 — HR dán hồ sơ từ Excel sang
 * form "Thêm nhân viên", ô Email nhận `"ddthuyanh@gmail.com "` (dư một dấu
 * cách ở cuối). `@IsEmail` từ chối ⇒ cả `POST /nhan-vien` trả 400 ⇒ không
 * thêm được nhân viên nào, mà nhìn trên màn hình thì mọi ô đều đúng. Dán từ
 * Excel là cách nhập liệu chính của HR, nên đây là đường đi thường ngày chứ
 * không phải tình huống hiếm.
 *
 * Đặt ở tầng DTO (không phải FE) để mọi client — form, import Excel, script
 * ops — đều được dọn như nhau, và dữ liệu ghi xuống Mongo luôn sạch.
 *
 * LƯU Ý: chỉ cắt HAI ĐẦU. Dấu cách giữa các từ ("Đinh Đặng Thuỳ Anh") là dữ
 * liệu thật, không được đụng tới.
 *
 * Giá trị không phải chuỗi được trả nguyên vẹn để `@IsString` còn báo đúng
 * lỗi kiểu của nó, thay vì bị hàm này nuốt mất.
 */
export function ChuanHoaChuoi(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .replace(KHOANG_TRANG_LA, ' ')
          .replace(KY_TU_RONG_KHONG, '')
          .trim()
      : value,
  );
}
