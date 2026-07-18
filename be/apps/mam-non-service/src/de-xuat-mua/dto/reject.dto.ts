import { IsString, IsNotEmpty } from 'class-validator';

export class RejectDeXuatDto {
  @IsString() @IsNotEmpty() lyDoTuChoi: string;
}
