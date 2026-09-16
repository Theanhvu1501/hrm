import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { Employee, OrgUnit } from '@app/entities';
import { SoDoToChuc_Controller } from './so-do-to-chuc.controller';
import { SoDoToChuc_Service } from './so-do-to-chuc.service';

/**
 * `Employee` chỉ để ĐẾM người đang giữ một chức danh trước khi cho xoá nó —
 * lấy repo thẳng thay vì import `NhanVien_Module` để không thêm một vòng phụ
 * thuộc nữa (module đó đã có một vòng cố ý với QuyPhep_Module).
 */
@Module({
  imports: [DatabaseModule.forFeature([OrgUnit, Employee])],
  controllers: [SoDoToChuc_Controller],
  providers: [SoDoToChuc_Service],
  exports: [SoDoToChuc_Service],
})
export class SoDoToChuc_Module {}
