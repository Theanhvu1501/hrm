import { IsArray, IsString, Matches } from 'class-validator';

export class UpsertPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  @Matches(/^\/[a-z0-9-]+(\/[a-z0-9-]+)*:(xem|them|sua|xoa|xuat)$/, {
    each: true,
    message:
      'Permission phải có format /module:action (vd: /danh-muc/tai-khoan:xem)',
  })
  permissions: string[];
}
