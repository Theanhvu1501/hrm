import { IsArray, ArrayNotEmpty, IsString } from 'class-validator';

export class DeleteBatchNhatKyChungDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
