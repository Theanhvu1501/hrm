import { IsString, IsNotEmpty } from 'class-validator';

/** Lưu mẫu in hợp đồng lao động (HTML, có placeholder {{...}}) — 1 bản/tenant. */
export class UpsertMauInHopDongDto {
  @IsString()
  @IsNotEmpty()
  html: string;
}
