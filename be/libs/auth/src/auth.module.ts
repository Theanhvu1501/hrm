import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppUserRole, PhanQuyen, TenantAppConfig } from '@app/entities';
import { JwksService } from './services/jwks.service';
import { JwtService } from './services/jwt.service';
import { AuthzLoaderService } from './services/authz-loader.service';
import { JwtGuard } from './guards/jwt.guard';
import { RoleGuard } from './guards/role.guard';
import { PermissionGuard } from './guards/permission.guard';
import { TenantActiveGuard } from './guards/tenant-active.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AppUserRole, PhanQuyen, TenantAppConfig])],
  providers: [JwksService, JwtService, AuthzLoaderService, JwtGuard, RoleGuard, PermissionGuard, TenantActiveGuard],
  exports: [JwksService, JwtService, AuthzLoaderService, JwtGuard, RoleGuard, PermissionGuard, TenantActiveGuard],
})
export class AuthModule {}
