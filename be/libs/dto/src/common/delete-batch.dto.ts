import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

/** Body của endpoint xóa hàng loạt: POST /<tài-nguyên>/delete-batch */
export class DeleteBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
