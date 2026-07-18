import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/auth';
import { TaiLieu, PhanQuyen } from '@app/entities';
import { TaiLieu_Controller } from './tai-lieu.controller';
import { TaiLieu_Service } from './tai-lieu.service';
import { DocPermService } from './doc-perm.service';
import { STORAGE_SERVICE } from './storage/storage.interface';
import { GridFsStorageService } from './storage/gridfs-storage.service';

@Module({
  imports: [
    DatabaseModule.forFeature([TaiLieu]),
    DatabaseModule.forFeatureRaw([PhanQuyen]),
    AuthModule,
  ],
  controllers: [TaiLieu_Controller],
  providers: [
    TaiLieu_Service,
    DocPermService,
    { provide: STORAGE_SERVICE, useClass: GridFsStorageService },
  ],
})
export class TaiLieu_Module {}
