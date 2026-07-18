import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class AddExistingUserDto {
  @IsMongoId({ message: 'User ID không hợp lệ' })
  userId: string;

  @IsString()
  @IsNotEmpty({ message: 'Vai trò không được để trống' })
  vaiTro: string;
}
