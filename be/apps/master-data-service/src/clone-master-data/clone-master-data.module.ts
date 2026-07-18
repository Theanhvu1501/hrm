import { Module } from '@nestjs/common';
import {
  TaiKhoan, HoSoChungTu, KhoanMuc, NhomKhoanMuc,
  LoaiChungTuMaster, LoaiGiaoDich, QuyChuan,
} from '@app/entities';
import { DatabaseModule, RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { CloneMasterDataController } from './clone-master-data.controller';
import { CloneMasterDataService } from './clone-master-data.service';

const RAW_ENTITIES = [TaiKhoan, HoSoChungTu, KhoanMuc, NhomKhoanMuc, LoaiChungTuMaster, LoaiGiaoDich, QuyChuan];
const rawTokens = RAW_ENTITIES.map((e) => `${RAW_REPOSITORY_TOKEN_PREFIX}${e.name}`);

@Module({
  imports: [
    DatabaseModule.forFeatureRaw(RAW_ENTITIES),
    // Removed: DatabaseModule.forFeatureIdentity([Tenant]) — tenant validation now done
    // format-only (ObjectId parse). Tenant existence is implicitly validated by entity queries.
  ],
  controllers: [CloneMasterDataController],
  providers: [
    {
      provide: CloneMasterDataService,
      useFactory: (...rawRepos: any[]) => {
        const repos: Record<string, any> = {};
        RAW_ENTITIES.forEach((e, i) => { repos[e.name] = rawRepos[i]; });
        return new CloneMasterDataService(repos);
      },
      inject: [...rawTokens],
    },
  ],
})
export class CloneMasterDataModule {}
