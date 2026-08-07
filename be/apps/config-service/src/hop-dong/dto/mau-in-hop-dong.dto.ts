import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Mẫu in hợp đồng lao động (HTML, có placeholder `{{...}}`) — nhiều mẫu mỗi
 * tenant, phân biệt bằng `ten`.
 *
 * Mọi trường FE gửi lên PHẢI khai ở đây: `main.ts` bật
 * `forbidNonWhitelisted`, nên một trường thừa không khai là cả form 400 chứ
 * không phải bị bỏ qua im lặng.
 */
export class CreateMauInHopDongDto {
  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsString()
  @IsNotEmpty()
  html: string;
}

/** Sửa mẫu: cho phép đổi riêng tên, riêng nội dung, hoặc cả hai. */
export class UpdateMauInHopDongDto {
  @IsOptional()
  @IsString()
  ten?: string;

  @IsOptional()
  @IsString()
  html?: string;
}
