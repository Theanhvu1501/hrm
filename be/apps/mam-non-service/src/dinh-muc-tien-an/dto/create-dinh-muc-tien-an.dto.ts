import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateDinhMucTienAnDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  ten: string;

  @IsString()
  @IsOptional()
  @IsIn(['LOP', 'DO_TUOI', 'GOI_AN', 'CHUNG'])
  phamVi?: string;

  @IsString()
  @IsOptional()
  doiTuongMa?: string;

  @IsNumber()
  mucTien: number;

  @IsDateString()
  @IsOptional()
  hieuLucTu?: string;

  @IsDateString()
  @IsOptional()
  hieuLucDen?: string;
}
