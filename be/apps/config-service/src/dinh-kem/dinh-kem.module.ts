import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/auth';
import { DinhKem } from '@app/entities';
import { DinhKem_Controller } from './dinh-kem.controller';
import { DinhKem_Service } from './dinh-kem.service';
import { STORAGE_SERVICE } from '../tai-lieu/storage/storage.interface';
import { GridFsStorageService } from '../tai-lieu/storage/gridfs-storage.service';

/**
 * Dùng chung kho GridFS với Thư viện tài liệu (cùng bucket `tai_lieu_files`),
 * chỉ khác bảng metadata. `DinhKem_Service` được export để các module khác
 * (hồ sơ NV, thôi việc…) dọn đính kèm khi bản ghi chủ bị xoá.
 */
@Module({
  imports: [DatabaseModule.forFeature([DinhKem]), AuthModule],
  controllers: [DinhKem_Controller],
  providers: [
    DinhKem_Service,
    { provide: STORAGE_SERVICE, useClass: GridFsStorageService },
  ],
  exports: [DinhKem_Service],
})
export class DinhKem_Module {}
