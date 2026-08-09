# Phòng ban lấy từ identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay trường `phongBan` chuỗi tự do trong app nhân sự bằng `departmentId` trỏ tới danh mục phòng ban do identity-service sở hữu, để ba app dùng chung một cơ cấu tổ chức.

**Architecture:** identity-service là nguồn sự thật duy nhất của danh mục phòng ban (đã có `GET /api/me/departments`). hrm không sao chép danh mục: `IdentityClient` gọi sang identity, một endpoint mỏng `GET /phong-ban` của config-service chuyển tiếp cho FE, và `employees.departmentId` lưu id tham chiếu. Lịch sử điều chuyển **giữ nguyên dạng tên** (snapshot), không đổi sang id.

**Tech Stack:** NestJS (monorepo `apps/` + `libs/`), TypeORM/MongoDB, Jest (BE); React + antd + react-hook-form + Vitest (FE).

## Thiết kế — các quyết định ràng buộc mọi task

- **identity sở hữu danh mục.** hrm không có bảng phòng ban riêng, không cache vào DB. Mọi lần cần danh mục thì gọi identity qua `IdentityClient`.
- **`employees.phongBan: string` → `employees.departmentId: string | null`.** Trường cũ bị bỏ hẳn sau khi di trú.
- **Lịch sử điều chuyển giữ dạng TÊN, không đổi thành id.** `employment_histories.phongBanCu` / `phongBanMoi` là dữ liệu lịch sử: nếu lưu id thì đổi tên phòng sau này sẽ *viết lại quá khứ*, xóa phòng sẽ làm hỏng bản ghi cũ. Hai cột này giữ nguyên kiểu `string`; chỉ đổi **nguồn** của tên — từ gõ tay thành tên của phòng được chọn tại thời điểm điều chuyển.
- **`attendance_locations.phongBan` NGOÀI phạm vi.** Trên production cả 2 bản ghi đều là chuỗi rỗng, không có gì để di trú và không màn nào dùng. Không đụng vào.
- **Dữ liệu production đã khảo sát** (DB `nhan_su`, 08/08/2026): 9 nhân viên, **một** công ty `69a1018b0bf5104993e0c3c5` (MASTER CEO, slug `ceo`); `employment_histories` **0 bản ghi**. Bảy phòng ban tương ứng **đã được tạo sẵn** trong identity:

  | maPhong | tenPhong |
  |---|---|
  | BGD | Ban giám đốc |
  | GD | Giám đốc |
  | BHT | Ban hệ thống |
  | IT | Phòng IT & hệ thống |
  | DV | Phòng Dịch vụ |
  | HC | Hành chính |
  | TC | Tài chính |

## Global Constraints

- Thư mục làm việc: `/Users/os_anhvt/Documents/Dino/hrm`
- BE test: `cd be && npx jest <path>`; toàn bộ: `cd be && npm test`
- FE test: `cd fe && npx vitest run <path>`; toàn bộ: `cd fe && npm test`
- `node` nằm dưới nvm, không có trong PATH mặc định. Trước mọi lệnh npm/npx: `export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"`
- Mọi chuỗi hiển thị cho người dùng viết tiếng Việt có dấu
- Response BE bọc `{ success: true, data }` — controller làm, service trả dữ liệu thuần
- Gọi identity luôn kèm Bearer token của người dùng hiện tại, lấy bằng decorator `@AuthToken()` (`@app/auth`)
- Không tạo bảng/collection phòng ban nào trong DB của hrm
- Mỗi task kết thúc bằng test xanh + 1 commit

---

## File Structure

**BE — tạo mới:**
- `be/apps/config-service/src/phong-ban/phong-ban.module.ts`
- `be/apps/config-service/src/phong-ban/phong-ban.controller.ts`
- `be/apps/config-service/src/phong-ban/phong-ban.service.ts`
- `be/apps/config-service/src/phong-ban/phong-ban.service.spec.ts`
- `be/scripts/migrations/migrate-phongban-to-departmentid.ts`

**BE — sửa:**
- `be/libs/service-client/src/identity-client.ts` — thêm `listDepartments`
- `be/libs/entities/src/nhan-su/employee.entity.ts:23` — `phongBan` → `departmentId`
- `be/apps/config-service/src/nhan-vien/dto/create-employee.dto.ts:91`
- `be/apps/config-service/src/nhan-vien/nhan-vien.service.ts:17,175` — filter
- `be/apps/config-service/src/ban-ghi-cham-cong/ban-ghi-cham-cong.service.ts:548`
- `be/apps/config-service/src/qua-trinh-cong-tac/dto/create-qua-trinh-cong-tac.dto.ts:19`
- `be/apps/config-service/src/qua-trinh-cong-tac/qua-trinh-cong-tac.service.ts:51,52,70`
- `be/apps/config-service/src/config-service.module.ts` — đăng ký `PhongBanModule`

**FE — tạo mới:**
- `fe/src/services/phongBanService.ts`
- `fe/src/services/phongBanService.test.ts`
- `fe/src/hooks/usePhongBanOptions.ts`

**FE — sửa:**
- `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/tabs/CongViecTab.tsx`
- `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/HoSoNhanVienForm.state.ts`
- `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/HoSoNhanVienForm.tsx`
- `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/hoSoNhanVienForm.convert.ts`
- `fe/src/pages/nhan-su/ho-so-nhan-vien/components/table/HoSoNhanVienTable.tsx`
- `fe/src/components/layout/EmployeeLayout.tsx` (+ `.test.tsx`)
- `fe/src/pages/nhan-su/qua-trinh-cong-tac/components/form/QuaTrinhCongTacForm.tsx` (+ `.state.ts`)

Tách `usePhongBanOptions` thành hook riêng vì bốn màn khác nhau cùng cần danh sách options; nhét vào từng component sẽ lặp bốn lần.

---

### Task 1: `IdentityClient.listDepartments` và endpoint `GET /phong-ban`

**Files:**
- Modify: `be/libs/service-client/src/identity-client.ts`
- Create: `be/apps/config-service/src/phong-ban/phong-ban.service.ts`
- Create: `be/apps/config-service/src/phong-ban/phong-ban.controller.ts`
- Create: `be/apps/config-service/src/phong-ban/phong-ban.module.ts`
- Create: `be/apps/config-service/src/phong-ban/phong-ban.service.spec.ts`
- Modify: `be/apps/config-service/src/config-service.module.ts`

**Interfaces:**
- Produces:
  ```ts
  // identity-client.ts
  listDepartments(token: string): Promise<ServiceResponse<any>>
  // phong-ban.service.ts
  export interface PhongBanItem {
    id: string; maPhong: string; tenPhong: string;
    parentId: string | null; path: string[]; thuTu: number;
  }
  class PhongBanService { list(token: string): Promise<PhongBanItem[]> }
  ```
  Task 3 dùng `PhongBanService.list` để lấy tên phòng. Task 5 gọi `GET /phong-ban`.

- [ ] **Step 1: Viết test thất bại**

Tạo `be/apps/config-service/src/phong-ban/phong-ban.service.spec.ts`:

```ts
import { PhongBanService } from './phong-ban.service';

function makeService(data: unknown) {
  const identityClient = { listDepartments: jest.fn().mockResolvedValue({ data }) };
  return { svc: new PhongBanService(identityClient as any), identityClient };
}

describe('PhongBanService.list', () => {
  it('chuyển tiếp token và ánh xạ đúng các trường cần dùng', async () => {
    const { svc, identityClient } = makeService([
      { id: 'd1', tenantId: 't1', maPhong: 'KT', tenPhong: 'Kế toán', parentId: null, path: [], truongPhongUserId: null, thuTu: 0, isActive: true },
    ]);

    const rows = await svc.list('Bearer abc');

    expect(identityClient.listDepartments).toHaveBeenCalledWith('Bearer abc');
    expect(rows).toEqual([
      { id: 'd1', maPhong: 'KT', tenPhong: 'Kế toán', parentId: null, path: [], thuTu: 0 },
    ]);
  });

  it('identity trả rỗng thì trả mảng rỗng, không ném lỗi', async () => {
    const { svc } = makeService([]);
    await expect(svc.list('Bearer abc')).resolves.toEqual([]);
  });

  it('identity trả data không phải mảng thì trả mảng rỗng', async () => {
    const { svc } = makeService(null);
    await expect(svc.list('Bearer abc')).resolves.toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận nó fail**

Chạy: `export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd be && npx jest src/phong-ban --config ./package.json 2>/dev/null || npx jest apps/config-service/src/phong-ban`
Kỳ vọng: FAIL — không resolve được `./phong-ban.service`.

Nếu lệnh jest không tìm thấy test, dùng đường dẫn đầy đủ: `npx jest apps/config-service/src/phong-ban/phong-ban.service.spec.ts`.

- [ ] **Step 3: Thêm `listDepartments` vào IdentityClient**

Trong `be/libs/service-client/src/identity-client.ts`, thêm vào cuối class (trước dấu `}` đóng class):

```ts
  // -------- Departments (phòng ban) --------

  /** Danh mục phòng ban của công ty trong token. identity lấy tenantId từ token. */
  listDepartments(token: string): Promise<ServiceResponse<any>> {
    return this.request('identity', 'GET', '/api/me/departments', {
      headers: this.authed(token),
    });
  }
```

- [ ] **Step 4: Viết service**

Tạo `be/apps/config-service/src/phong-ban/phong-ban.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { IdentityClient } from '@app/service-client';

/** Phòng ban đọc từ identity. `path` = id tổ tiên, gốc → cha, KHÔNG gồm chính nó. */
export interface PhongBanItem {
  id: string;
  maPhong: string;
  tenPhong: string;
  parentId: string | null;
  path: string[];
  thuTu: number;
}

/**
 * hrm KHÔNG sở hữu danh mục phòng ban — identity mới là nguồn sự thật. Service
 * này chỉ chuyển tiếp và cắt bớt các trường hrm không dùng.
 */
@Injectable()
export class PhongBanService {
  constructor(private readonly identityClient: IdentityClient) {}

  async list(token: string): Promise<PhongBanItem[]> {
    const res = await this.identityClient.listDepartments(token);
    const rows = Array.isArray(res?.data) ? res.data : [];
    return rows.map((d: any) => ({
      id: String(d.id),
      maPhong: d.maPhong,
      tenPhong: d.tenPhong,
      parentId: d.parentId ?? null,
      path: Array.isArray(d.path) ? d.path : [],
      thuTu: d.thuTu ?? 0,
    }));
  }
}
```

- [ ] **Step 5: Viết controller và module**

Tạo `be/apps/config-service/src/phong-ban/phong-ban.controller.ts`:

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard, AuthToken } from '@app/auth';
import { PhongBanService } from './phong-ban.service';

@Controller('phong-ban')
@UseGuards(JwtGuard)
export class PhongBanController {
  constructor(private readonly phongBanService: PhongBanService) {}

  @Get()
  async findAll(@AuthToken() token: string) {
    const data = await this.phongBanService.list(token);
    return { success: true, data };
  }
}
```

Tạo `be/apps/config-service/src/phong-ban/phong-ban.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ServiceClientModule } from '@app/service-client';
import { PhongBanController } from './phong-ban.controller';
import { PhongBanService } from './phong-ban.service';

@Module({
  imports: [ServiceClientModule.register()],
  controllers: [PhongBanController],
  providers: [PhongBanService],
  exports: [PhongBanService],
})
export class PhongBanModule {}
```

**Trước khi viết:** mở `be/apps/config-service/src/tenant/tenant.module.ts` xem `ServiceClientModule` được import đúng cách nào (có `.register()` hay không) và làm y hệt. Nếu khác, sửa theo file đó.

- [ ] **Step 6: Đăng ký vào config-service.module.ts**

Mở `be/apps/config-service/src/config-service.module.ts`, thêm import `PhongBanModule` và đưa vào mảng `imports`, đặt cạnh các module nghiệp vụ khác.

- [ ] **Step 7: Chạy test để xác nhận nó pass**

Chạy: `cd be && npx jest apps/config-service/src/phong-ban/phong-ban.service.spec.ts`
Kỳ vọng: PASS, 3 test.

- [ ] **Step 8: Build để chắc DI không vỡ**

Chạy: `cd be && npm run build:config`
Kỳ vọng: thành công. Unit test dựng service bằng tay nên không phát hiện lỗi wiring.

- [ ] **Step 9: Commit**

```bash
git add be/libs/service-client/src/identity-client.ts be/apps/config-service/src/phong-ban be/apps/config-service/src/config-service.module.ts
git commit -m "feat(phong-ban): đọc danh mục phòng ban từ identity qua GET /phong-ban"
```

---

### Task 2: `Employee.phongBan` → `Employee.departmentId`

**Files:**
- Modify: `be/libs/entities/src/nhan-su/employee.entity.ts:23`
- Modify: `be/apps/config-service/src/nhan-vien/dto/create-employee.dto.ts:91`
- Modify: `be/apps/config-service/src/nhan-vien/nhan-vien.service.ts:17,175`
- Modify: `be/apps/config-service/src/ban-ghi-cham-cong/ban-ghi-cham-cong.service.ts:548`
- Test: `be/apps/config-service/src/nhan-vien/nhan-vien.service.spec.ts` (tạo nếu chưa có)

**Interfaces:**
- Produces: `Employee.departmentId?: string | null`; `CreateEmployeeDto.departmentId?: string`; `EmployeeFilter.departmentId?: string`. Task 4 (di trú) và Task 6 (FE form) đều dựa vào đúng tên này.

- [ ] **Step 1: Viết test thất bại**

Tạo (hoặc bổ sung) `be/apps/config-service/src/nhan-vien/nhan-vien.service.spec.ts`. Nếu file đã tồn tại, chỉ thêm khối `describe` dưới đây và tái dùng factory sẵn có:

```ts
import { NhanVien_Service } from './nhan-vien.service';

function makeService(rows: any[] = []) {
  const repo = {
    find: jest.fn(async ({ where }: any) =>
      rows.filter((r) =>
        Object.entries(where).every(([k, v]) => (v === undefined ? true : r[k] === v)),
      ),
    ),
  };
  const tenantContext = { getTenantId: jest.fn().mockReturnValue('t1') };
  const quyPhep = {} as any;
  const svc = new NhanVien_Service(repo as any, {} as any, tenantContext as any, quyPhep);
  return { svc, repo };
}

describe('NhanVien_Service.findAll — lọc theo phòng ban', () => {
  it('lọc theo departmentId chứ không phải chuỗi tên', async () => {
    const { svc, repo } = makeService([
      { hoTen: 'Lan', departmentId: 'd1', isActive: true },
      { hoTen: 'Nam', departmentId: 'd2', isActive: true },
    ]);

    const rows = await svc.findAll({ departmentId: 'd1' } as any);

    expect(repo.find).toHaveBeenCalledWith({ where: expect.objectContaining({ departmentId: 'd1' }) });
    expect(rows.map((r: any) => r.hoTen)).toEqual(['Lan']);
  });

  it('không truyền departmentId thì không thêm điều kiện đó', async () => {
    const { svc, repo } = makeService([{ hoTen: 'Lan', departmentId: 'd1', isActive: true }]);

    await svc.findAll({} as any);

    const where = repo.find.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('departmentId');
  });
});
```

**Lưu ý:** thứ tự tham số constructor của `NhanVien_Service` phải khớp thực tế — mở `nhan-vien.service.ts` đọc constructor trước khi viết factory, và sửa lại lời gọi `new NhanVien_Service(...)` cho đúng.

- [ ] **Step 2: Chạy test để xác nhận nó fail**

Chạy: `cd be && npx jest apps/config-service/src/nhan-vien/nhan-vien.service.spec.ts`
Kỳ vọng: FAIL — `where` vẫn dùng `phongBan`, không có `departmentId`.

- [ ] **Step 3: Sửa entity**

Trong `be/libs/entities/src/nhan-su/employee.entity.ts`, thay dòng `@Column({ nullable: true }) phongBan?: string;` bằng:

```ts
  /**
   * Phòng ban — id trỏ tới danh mục của identity-service (`departments._id`).
   * hrm KHÔNG sở hữu danh mục này; lấy tên qua `GET /phong-ban`.
   * Trước đây là chuỗi tự do `phongBan`, đã di trú (xem
   * scripts/migrations/migrate-phongban-to-departmentid.ts).
   */
  @Column({ nullable: true }) departmentId?: string | null;
```

- [ ] **Step 4: Sửa DTO**

Trong `be/apps/config-service/src/nhan-vien/dto/create-employee.dto.ts`, thay khối

```ts
  @IsOptional()
  @IsString()
  phongBan?: string;
```

bằng

```ts
  @IsOptional()
  @IsString()
  departmentId?: string;
```

- [ ] **Step 5: Sửa filter**

Trong `be/apps/config-service/src/nhan-vien/nhan-vien.service.ts`:

- Trong `interface EmployeeFilter`, đổi `phongBan?: string;` thành `departmentId?: string;`
- Trong `findAll`, đổi `if (filter?.phongBan) where.phongBan = filter.phongBan;` thành `if (filter?.departmentId) where.departmentId = filter.departmentId;`

- [ ] **Step 6: Sửa chỗ dùng còn lại**

Trong `be/apps/config-service/src/ban-ghi-cham-cong/ban-ghi-cham-cong.service.ts` dòng 548, đổi `phongBan: emp.phongBan,` thành `departmentId: emp.departmentId ?? null,`.

Sau đó chạy `cd be && grep -rn "phongBan" apps libs --include="*.ts" | grep -v phongBanCu | grep -v phongBanMoi | grep -v attendance` để tìm chỗ sót; `attendance_locations.phongBan` cố ý giữ nguyên (ngoài phạm vi).

- [ ] **Step 7: Chạy test để xác nhận nó pass**

Chạy: `cd be && npx jest apps/config-service/src/nhan-vien/nhan-vien.service.spec.ts`
Kỳ vọng: PASS, 2 test.

- [ ] **Step 8: Chạy toàn bộ test BE**

Chạy: `cd be && npm test`
Kỳ vọng: PASS. Nếu có spec cũ dùng `phongBan` trên `Employee`, sửa sang `departmentId`.

- [ ] **Step 9: Commit**

```bash
git add be/libs/entities be/apps/config-service/src/nhan-vien be/apps/config-service/src/ban-ghi-cham-cong
git commit -m "feat(nhan-su): employees.phongBan -> departmentId trỏ danh mục identity"
```

---

### Task 3: Điều chuyển công tác — chọn phòng ban, lịch sử vẫn lưu tên

**Files:**
- Modify: `be/apps/config-service/src/qua-trinh-cong-tac/dto/create-qua-trinh-cong-tac.dto.ts:19`
- Modify: `be/apps/config-service/src/qua-trinh-cong-tac/qua-trinh-cong-tac.service.ts:51,52,70`
- Test: `be/apps/config-service/src/qua-trinh-cong-tac/qua-trinh-cong-tac.service.spec.ts`

**Interfaces:**
- Consumes: `PhongBanService.list(token)` (Task 1), `Employee.departmentId` (Task 2)
- Produces: `CreateQuaTrinhCongTacDto.departmentIdMoi?: string`. `employment_histories.phongBanCu`/`phongBanMoi` **giữ nguyên kiểu string** — là ảnh chụp tên.

- [ ] **Step 1: Viết test thất bại**

Tạo/bổ sung `be/apps/config-service/src/qua-trinh-cong-tac/qua-trinh-cong-tac.service.spec.ts`:

```ts
import { QuaTrinhCongTac_Service } from './qua-trinh-cong-tac.service';

const DANH_MUC = [
  { id: 'd1', maPhong: 'KT', tenPhong: 'Kế toán', parentId: null, path: [], thuTu: 0 },
  { id: 'd2', maPhong: 'NS', tenPhong: 'Nhân sự', parentId: null, path: [], thuTu: 1 },
];

function makeService(emp: any) {
  const empRepo = { findOne: jest.fn().mockResolvedValue(emp), save: jest.fn(async (e: any) => e) };
  const histRepo = { create: jest.fn((d: any) => d), save: jest.fn(async (d: any) => d) };
  const phongBan = { list: jest.fn().mockResolvedValue(DANH_MUC) };
  const svc = new QuaTrinhCongTac_Service(histRepo as any, empRepo as any, phongBan as any);
  return { svc, empRepo, histRepo, phongBan };
}

describe('QuaTrinhCongTac — điều chuyển phòng ban', () => {
  it('lưu lịch sử bằng TÊN phòng, cập nhật departmentId của nhân viên', async () => {
    const emp: any = { _id: 'e1', hoTen: 'Lan', departmentId: 'd1' };
    const { svc, empRepo, histRepo } = makeService(emp);

    await svc.create({ employeeId: 'e1', departmentIdMoi: 'd2' } as any, 'Bearer abc');

    const hist = histRepo.save.mock.calls[0][0];
    expect(hist.phongBanCu).toBe('Kế toán');   // tên tại thời điểm điều chuyển
    expect(hist.phongBanMoi).toBe('Nhân sự');
    expect(emp.departmentId).toBe('d2');
    expect(empRepo.save).toHaveBeenCalled();
  });

  it('không truyền departmentIdMoi thì giữ nguyên phòng của nhân viên', async () => {
    const emp: any = { _id: 'e1', hoTen: 'Lan', departmentId: 'd1' };
    const { svc, histRepo } = makeService(emp);

    await svc.create({ employeeId: 'e1' } as any, 'Bearer abc');

    expect(emp.departmentId).toBe('d1');
    expect(histRepo.save.mock.calls[0][0].phongBanMoi).toBeUndefined();
  });

  it('id phòng mới không có trong danh mục thì tên là null, không ném lỗi', async () => {
    const emp: any = { _id: 'e1', hoTen: 'Lan', departmentId: 'd1' };
    const { svc, histRepo } = makeService(emp);

    await svc.create({ employeeId: 'e1', departmentIdMoi: 'd-la' } as any, 'Bearer abc');

    expect(histRepo.save.mock.calls[0][0].phongBanMoi).toBeNull();
  });
});
```

**Lưu ý:** mở `qua-trinh-cong-tac.service.ts` đọc constructor và chữ ký `create()` thật trước khi viết factory; sửa lời gọi cho khớp. Nếu `create()` hiện chưa nhận `token`, phải thêm tham số đó (Step 3) và sửa controller tương ứng.

- [ ] **Step 2: Chạy test để xác nhận nó fail**

Chạy: `cd be && npx jest apps/config-service/src/qua-trinh-cong-tac`
Kỳ vọng: FAIL — service chưa nhận `PhongBanService`, `phongBanCu` vẫn lấy từ `emp.phongBan` (giờ là `undefined`).

- [ ] **Step 3: Sửa DTO**

Trong `be/apps/config-service/src/qua-trinh-cong-tac/dto/create-qua-trinh-cong-tac.dto.ts`, đổi `phongBanMoi?: string;` (dòng 19) thành:

```ts
  /** id phòng ban mới trong danh mục identity. Lịch sử vẫn lưu TÊN, không lưu id. */
  @IsOptional()
  @IsString()
  departmentIdMoi?: string;
```

Giữ nguyên các decorator `@IsOptional()`/`@IsString()` đang có ở dòng trên nếu đã tồn tại — không nhân đôi.

- [ ] **Step 4: Sửa service**

Trong `be/apps/config-service/src/qua-trinh-cong-tac/qua-trinh-cong-tac.service.ts`:

Thêm import và tiêm `PhongBanService` vào constructor (đối số cuối):

```ts
import { PhongBanService } from '../phong-ban/phong-ban.service';
```

```ts
    private readonly phongBanService: PhongBanService,
```

Trong `create()`, thêm tham số `token: string` (nếu chưa có) và thay ba dòng 51/52/70:

```ts
    // Lịch sử điều chuyển lưu TÊN phòng tại thời điểm đó, không lưu id: đổi tên
    // hay xóa phòng về sau không được phép viết lại quá khứ.
    const danhMuc = await this.phongBanService.list(token);
    const tenCua = (id?: string | null) =>
      id ? (danhMuc.find((d) => d.id === id)?.tenPhong ?? null) : undefined;

    const phongBanCu = tenCua(emp.departmentId);
    const phongBanMoi = tenCua(dto.departmentIdMoi);
```

rồi dùng `phongBanCu` / `phongBanMoi` khi tạo bản ghi lịch sử, và:

```ts
    if (dto.departmentIdMoi) emp.departmentId = dto.departmentIdMoi;
```

- [ ] **Step 5: Sửa controller truyền token**

Mở `be/apps/config-service/src/qua-trinh-cong-tac/qua-trinh-cong-tac.controller.ts`, thêm `@AuthToken() token: string` vào handler tạo mới và truyền xuống `create(dto, token)`. Import `AuthToken` từ `@app/auth` nếu chưa có. Đăng ký `PhongBanModule` vào `imports` của `qua-trinh-cong-tac.module.ts`.

- [ ] **Step 6: Chạy test để xác nhận nó pass**

Chạy: `cd be && npx jest apps/config-service/src/qua-trinh-cong-tac`
Kỳ vọng: PASS, 3 test.

- [ ] **Step 7: Chạy toàn bộ test BE + build**

Chạy: `cd be && npm test && npm run build:config`
Kỳ vọng: PASS, build thành công.

- [ ] **Step 8: Commit**

```bash
git add be/apps/config-service/src/qua-trinh-cong-tac
git commit -m "feat(qua-trinh-cong-tac): chọn phòng ban theo id, lịch sử vẫn chụp tên"
```

---

### Task 4: Script di trú dữ liệu `phongBan` → `departmentId`

**Files:**
- Create: `be/scripts/migrations/migrate-phongban-to-departmentid.ts`

**Interfaces:**
- Consumes: `Employee.departmentId` (Task 2)
- Produces: script chạy được bằng `ts-node`, có chế độ `--dry-run`

- [ ] **Step 1: Viết script**

Tạo `be/scripts/migrations/migrate-phongban-to-departmentid.ts`:

```ts
/**
 * Di trú employees.phongBan (chuỗi tự do) -> employees.departmentId (id trỏ
 * danh mục phòng ban của identity).
 *
 * Chạy thử:  npx ts-node scripts/migrations/migrate-phongban-to-departmentid.ts --dry-run
 * Chạy thật: npx ts-node scripts/migrations/migrate-phongban-to-departmentid.ts
 *
 * Biến môi trường:
 *   MONGODB_URI            - chuỗi kết nối
 *   NHAN_SU_DB             - mặc định 'nhan_su'
 *   IDENTITY_DB            - mặc định 'masterceo_identity'
 *
 * Khớp theo TÊN: employees.phongBan === departments.tenPhong (cùng tenantId,
 * còn active). Tên không khớp phòng nào thì BỎ QUA và in ra để xử lý tay —
 * đoán mò sẽ gán sai người vào sai phòng.
 */
import { MongoClient } from 'mongodb';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI');

  const client = new MongoClient(uri);
  await client.connect();
  try {
    const hr = client.db(process.env.NHAN_SU_DB || 'nhan_su');
    const idn = client.db(process.env.IDENTITY_DB || 'masterceo_identity');

    const employees = await hr.collection('employees').find({ phongBan: { $nin: [null, ''] } }).toArray();
    console.log(`Nhân viên còn phongBan: ${employees.length}`);

    const depts = await idn.collection('departments').find({ isActive: true }).toArray();
    const key = (tenantId: string, ten: string) => `${tenantId}::${ten.trim()}`;
    const map = new Map<string, string>();
    for (const d of depts) map.set(key(String(d.tenantId), String(d.tenPhong)), String(d._id));

    let migrated = 0;
    const khongKhop: string[] = [];

    for (const e of employees) {
      const tenantId = String(e.tenantId);
      const ten = String(e.phongBan).trim();
      const deptId = map.get(key(tenantId, ten));
      if (!deptId) {
        khongKhop.push(`${e.hoTen ?? e._id} — "${ten}" (tenant ${tenantId})`);
        continue;
      }
      console.log(`${dryRun ? 'SẼ GÁN' : 'ĐÃ GÁN'}: ${e.hoTen ?? e._id} -> ${ten} (${deptId})`);
      if (!dryRun) {
        await hr.collection('employees').updateOne(
          { _id: e._id },
          { $set: { departmentId: deptId }, $unset: { phongBan: '' } },
        );
      }
      migrated++;
    }

    console.log(`\n${dryRun ? '[DRY RUN] ' : ''}đã gán=${migrated}  không khớp=${khongKhop.length}`);
    if (khongKhop.length) {
      console.log('KHÔNG KHỚP — tạo phòng tương ứng trong identity rồi chạy lại:');
      khongKhop.forEach((s) => console.log('  ' + s));
      process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Kiểm tra script biên dịch được**

Chạy: `cd be && npx tsc --noEmit scripts/migrations/migrate-phongban-to-departmentid.ts --esModuleInterop --skipLibCheck --target es2020 --module commonjs`
Kỳ vọng: không lỗi.

- [ ] **Step 3: Commit**

```bash
git add be/scripts/migrations/migrate-phongban-to-departmentid.ts
git commit -m "chore(migration): script di trú phongBan -> departmentId"
```

Script **chưa chạy** ở bước này. Nó chạy trên server sau khi deploy (xem mục cuối plan).

---

### Task 5: FE — service và hook lấy danh mục phòng ban

**Files:**
- Create: `fe/src/services/phongBanService.ts`
- Create: `fe/src/services/phongBanService.test.ts`
- Create: `fe/src/hooks/usePhongBanOptions.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface PhongBan { id: string; maPhong: string; tenPhong: string; parentId: string | null; path: string[]; thuTu: number; }
  export const phongBanService: { list(): Promise<PhongBan[]> }
  export function usePhongBanOptions(): {
    options: { value: string; label: string }[];
    tenTheoId: (id?: string | null) => string;
    loading: boolean;
  }
  ```
  Task 6, 7, 8 đều dùng `usePhongBanOptions`.

- [ ] **Step 1: Viết test thất bại**

Tạo `fe/src/services/phongBanService.test.ts`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./base/service-base', () => {
  class ServiceBase {
    get = vi.fn();
    constructor(_o: unknown) {}
  }
  return { ServiceBase };
});

beforeEach(() => vi.resetModules());

describe('phongBanService', () => {
  it('list() gọi endpoint /phong-ban và trả mảng data', async () => {
    const { phongBanService } = await import('./phongBanService');
    const rows = [{ id: 'd1', maPhong: 'KT', tenPhong: 'Kế toán', parentId: null, path: [], thuTu: 0 }];
    (phongBanService as any).get = vi.fn().mockResolvedValue({ data: rows });

    const result = await phongBanService.list();

    expect(result).toEqual(rows);
  });

  it('list() trả mảng rỗng khi API không trả data', async () => {
    const { phongBanService } = await import('./phongBanService');
    (phongBanService as any).get = vi.fn().mockResolvedValue({});

    await expect(phongBanService.list()).resolves.toEqual([]);
  });
});
```

**Trước khi viết:** mở `fe/src/services/attendanceLocationService.ts` xem một service thật kế thừa/khởi tạo `ServiceBase` ra sao (tên method: `get`/`getAll`/`request`, dạng trả về). Sửa test và implementation theo đúng khuôn đó — khuôn ở trên chỉ là giả định.

- [ ] **Step 2: Chạy test để xác nhận nó fail**

Chạy: `export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"; cd fe && npx vitest run src/services/phongBanService.test.ts`
Kỳ vọng: FAIL — không resolve được `./phongBanService`.

- [ ] **Step 3: Viết service**

Tạo `fe/src/services/phongBanService.ts` theo đúng khuôn của `attendanceLocationService.ts`:

```ts
import { ServiceBase } from './base/service-base';

/** Phòng ban do identity-service sở hữu. `path` = id tổ tiên, KHÔNG gồm chính nó. */
export interface PhongBan {
  id: string;
  maPhong: string;
  tenPhong: string;
  parentId: string | null;
  path: string[];
  thuTu: number;
}

class PhongBanService extends ServiceBase {
  constructor() {
    super({ endpoint: 'phong-ban' });
  }

  async list(): Promise<PhongBan[]> {
    const res = await this.get<{ data?: PhongBan[] }>('');
    return res?.data ?? [];
  }
}

export const phongBanService = new PhongBanService();
```

- [ ] **Step 4: Viết hook**

Tạo `fe/src/hooks/usePhongBanOptions.ts`:

```ts
import { useEffect, useMemo, useState } from 'react';
import { phongBanService, type PhongBan } from '@/services/phongBanService';

/**
 * Danh mục phòng ban dùng chung cho các màn nhân sự. Tách thành hook vì bốn
 * màn cùng cần: hồ sơ nhân viên (form + bảng), layout nhân viên, điều chuyển.
 */
export function usePhongBanOptions() {
  const [rows, setRows] = useState<PhongBan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let huy = false;
    phongBanService
      .list()
      .then((d) => { if (!huy) setRows(d); })
      .catch(() => { if (!huy) setRows([]); })
      .finally(() => { if (!huy) setLoading(false); });
    return () => { huy = true; };
  }, []);

  const options = useMemo(
    () =>
      [...rows]
        .sort((a, b) => (a.thuTu ?? 0) - (b.thuTu ?? 0) || a.tenPhong.localeCompare(b.tenPhong, 'vi'))
        .map((d) => ({ value: d.id, label: d.tenPhong })),
    [rows],
  );

  const tenTheoId = useMemo(() => {
    const m = new Map(rows.map((d) => [d.id, d.tenPhong]));
    return (id?: string | null) => (id ? (m.get(id) ?? '—') : '—');
  }, [rows]);

  return { options, tenTheoId, loading };
}
```

- [ ] **Step 5: Chạy test để xác nhận nó pass**

Chạy: `cd fe && npx vitest run src/services/phongBanService.test.ts`
Kỳ vọng: PASS, 2 test.

- [ ] **Step 6: Commit**

```bash
git add fe/src/services/phongBanService.ts fe/src/services/phongBanService.test.ts fe/src/hooks/usePhongBanOptions.ts
git commit -m "feat(fe): service + hook lấy danh mục phòng ban từ identity"
```

---

### Task 6: FE — form hồ sơ nhân viên chọn phòng ban từ danh mục

**Files:**
- Modify: `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/tabs/CongViecTab.tsx`
- Modify: `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/HoSoNhanVienForm.state.ts:17`
- Modify: `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/HoSoNhanVienForm.tsx:32,80`
- Modify: `fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/hoSoNhanVienForm.convert.ts:41`

**Interfaces:**
- Consumes: `usePhongBanOptions()` (Task 5), `departmentId` trên DTO (Task 2)

- [ ] **Step 1: Đổi state của form**

Trong `HoSoNhanVienForm.state.ts`, đổi `phongBan?: string;` thành `departmentId?: string;`

Trong `HoSoNhanVienForm.tsx`: dòng ~32 đổi `phongBan: ""` thành `departmentId: ""`; dòng ~80 đổi `phongBan: employee.phongBan || ""` thành `departmentId: employee.departmentId || ""`.

Trong `hoSoNhanVienForm.convert.ts` dòng ~41, đổi `phongBan: values.phongBan || undefined,` thành `departmentId: values.departmentId || undefined,`.

- [ ] **Step 2: Đổi ô nhập thành Select**

Trong `CongViecTab.tsx`, thêm import và dùng hook:

```tsx
import { usePhongBanOptions } from "@/hooks/usePhongBanOptions";
```

```tsx
export function CongViecTab() {
  const { control } = useFormContext<HoSoNhanVienFormValues>();
  const { options, loading } = usePhongBanOptions();
```

rồi thay khối `phongBan` bằng:

```tsx
      <Col span={12}>
        <label className="block mb-1 text-sm font-medium">Phòng ban</label>
        <Controller
          name="departmentId"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              allowClear
              showSearch
              optionFilterProp="label"
              loading={loading}
              placeholder="Chọn phòng ban"
              options={options}
              className="w-full"
            />
          )}
        />
      </Col>
```

`Select` đã được import sẵn ở đầu file — không thêm import trùng.

- [ ] **Step 3: Kiểm tra không còn tham chiếu cũ trong màn này**

Chạy: `cd fe && grep -rn "phongBan" src/pages/nhan-su/ho-so-nhan-vien`
Kỳ vọng: không còn kết quả nào (trừ `departmentId`).

- [ ] **Step 4: Chạy test FE**

Chạy: `cd fe && npm test`
Kỳ vọng: PASS. Nếu có test cũ dùng `phongBan` ở màn này, sửa sang `departmentId`.

- [ ] **Step 5: Build**

Chạy: `cd fe && npm run build`
Kỳ vọng: thành công, không lỗi TypeScript.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/nhan-su/ho-so-nhan-vien
git commit -m "feat(fe): form hồ sơ nhân viên chọn phòng ban từ danh mục identity"
```

---

### Task 7: FE — bảng danh sách và layout nhân viên hiện tên phòng ban

**Files:**
- Modify: `fe/src/pages/nhan-su/ho-so-nhan-vien/components/table/HoSoNhanVienTable.tsx:67-68`
- Modify: `fe/src/components/layout/EmployeeLayout.tsx:100-105`
- Modify: `fe/src/components/layout/EmployeeLayout.test.tsx:26,91,99`

**Interfaces:**
- Consumes: `usePhongBanOptions().tenTheoId` (Task 5)

- [ ] **Step 1: Sửa test EmployeeLayout trước**

Trong `EmployeeLayout.test.tsx`, đổi `phongBan: 'Phòng Kỹ thuật'` thành `departmentId: 'd1'` ở cả ba chỗ (dòng ~26, ~91, ~99 — chỗ `undefined` giữ nguyên `departmentId: undefined`), và mock hook ở đầu file:

```tsx
vi.mock('@/hooks/usePhongBanOptions', () => ({
  usePhongBanOptions: () => ({
    options: [{ value: 'd1', label: 'Phòng Kỹ thuật' }],
    tenTheoId: (id?: string | null) => (id === 'd1' ? 'Phòng Kỹ thuật' : '—'),
    loading: false,
  }),
}));
```

Giữ nguyên các assertion đang kiểm tra chuỗi `'Phòng Kỹ thuật'` xuất hiện/không xuất hiện — chúng vẫn đúng, chỉ nguồn dữ liệu đổi.

- [ ] **Step 2: Chạy test để xác nhận nó fail**

Chạy: `cd fe && npx vitest run src/components/layout/EmployeeLayout.test.tsx`
Kỳ vọng: FAIL — component vẫn đọc `hoSo?.phongBan`, giờ là `undefined`.

- [ ] **Step 3: Sửa EmployeeLayout**

Trong `EmployeeLayout.tsx`, thêm hook và đổi hai chỗ hiển thị:

```tsx
import { usePhongBanOptions } from "@/hooks/usePhongBanOptions";
```

Trong component: `const { tenTheoId } = usePhongBanOptions();`

Đổi `{hoSo?.phongBan && (` thành `{hoSo?.departmentId && (` và `{hoSo.phongBan}` thành `{tenTheoId(hoSo.departmentId)}`.

- [ ] **Step 4: Sửa cột trong bảng danh sách**

Trong `HoSoNhanVienTable.tsx`, thêm hook vào component và đổi định nghĩa cột:

```tsx
import { usePhongBanOptions } from "@/hooks/usePhongBanOptions";
```

```tsx
  const { tenTheoId } = usePhongBanOptions();
```

```tsx
    {
      title: "Phòng ban",
      dataIndex: "departmentId",
      key: "departmentId",
      render: (id?: string | null) => tenTheoId(id),
    },
```

Giữ nguyên `title` và vị trí cột như hiện tại.

- [ ] **Step 5: Chạy test để xác nhận nó pass**

Chạy: `cd fe && npx vitest run src/components/layout/EmployeeLayout.test.tsx`
Kỳ vọng: PASS.

- [ ] **Step 6: Chạy toàn bộ test FE + build**

Chạy: `cd fe && npm test && npm run build`
Kỳ vọng: PASS, build thành công.

- [ ] **Step 7: Commit**

```bash
git add fe/src/components/layout fe/src/pages/nhan-su/ho-so-nhan-vien/components/table
git commit -m "feat(fe): bảng và layout nhân viên hiện tên phòng ban từ danh mục"
```

---

### Task 8: FE — form điều chuyển công tác chọn phòng ban

**Files:**
- Modify: `fe/src/pages/nhan-su/qua-trinh-cong-tac/components/form/QuaTrinhCongTacForm.tsx:26,42,113,123,138`
- Modify: `fe/src/pages/nhan-su/qua-trinh-cong-tac/components/form/QuaTrinhCongTacForm.state.ts:8`

**Interfaces:**
- Consumes: `usePhongBanOptions()` (Task 5), `departmentIdMoi` trên DTO (Task 3)

**Lưu ý quan trọng:** `QuaTrinhCongTacTable.tsx` dòng 30-31 hiển thị `record.phongBanCu → record.phongBanMoi`. **KHÔNG sửa file này** — hai trường đó vẫn là tên phòng (ảnh chụp lịch sử) và hiển thị đang đúng.

- [ ] **Step 1: Đổi state**

Trong `QuaTrinhCongTacForm.state.ts` dòng ~8, đổi `phongBanMoi?: string;` thành `departmentIdMoi?: string;`

- [ ] **Step 2: Sửa form**

Trong `QuaTrinhCongTacForm.tsx`:

- dòng ~26: `phongBanMoi: ""` → `departmentIdMoi: ""`
- dòng ~42: `phongBanMoi: record.phongBanMoi || ""` → `departmentIdMoi: ""` (bản ghi lịch sử chỉ lưu tên, không suy ngược ra id được — sửa một bản ghi cũ thì phải chọn lại phòng)
- dòng ~113 và ~123: chỗ hiển thị phòng ban hiện tại của nhân viên — đổi `phongBan: editingHistory.phongBanCu` giữ nguyên (là tên, đúng), còn `phongBan: employee.phongBan` đổi thành `phongBan: tenTheoId(employee.departmentId)`
- dòng ~138: `phongBanMoi: values.phongBanMoi || undefined` → `departmentIdMoi: values.departmentIdMoi || undefined`

Thêm hook vào component:

```tsx
import { usePhongBanOptions } from "@/hooks/usePhongBanOptions";
```

```tsx
  const { options: phongBanOptions, tenTheoId, loading: dangTaiPhongBan } = usePhongBanOptions();
```

Và đổi ô nhập `phongBanMoi` thành `Select`:

```tsx
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          loading={dangTaiPhongBan}
          placeholder="Chọn phòng ban mới"
          options={phongBanOptions}
          className="w-full"
        />
```

giữ nguyên cách bọc `Controller`/`Form.Item` đang dùng trong file, chỉ thay control bên trong và đổi `name` thành `departmentIdMoi`.

- [ ] **Step 3: Kiểm tra không còn tham chiếu cũ**

Chạy: `cd fe && grep -rn "phongBanMoi" src/pages/nhan-su/qua-trinh-cong-tac`
Kỳ vọng: chỉ còn trong `components/table/QuaTrinhCongTacTable.tsx` (hiển thị lịch sử — cố ý giữ).

- [ ] **Step 4: Chạy toàn bộ test FE + build**

Chạy: `cd fe && npm test && npm run build`
Kỳ vọng: PASS, build thành công.

- [ ] **Step 5: Chạy toàn bộ test BE**

Chạy: `cd be && npm test`
Kỳ vọng: PASS — xác nhận cả nhánh xanh trước khi đóng plan.

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/nhan-su/qua-trinh-cong-tac
git commit -m "feat(fe): form điều chuyển chọn phòng ban từ danh mục identity"
```

---

## Sau khi xong — di trú và deploy

Các bước này chạy **trên server**, không nằm trong task nào ở trên.

1. **Chạy thử script di trú** (không ghi):
   ```
   MONGODB_URI=<uri> npx ts-node be/scripts/migrations/migrate-phongban-to-departmentid.ts --dry-run
   ```
   Kỳ vọng: 9 nhân viên khớp hết, `không khớp=0`. Nếu có tên không khớp, tạo phòng tương ứng trong identity portal rồi chạy lại.

2. **Chạy thật** (bỏ `--dry-run`).

3. **Deploy.** Lưu ý: app nhân sự đang chạy build từ `/root/chimseo/nhan-su`, **không phải** từ repo `hrm`. Trước khi deploy phải quyết định đưa `hrm` thành nguồn deploy hay port thay đổi sang `nhan-su` — đây là quyết định của người dùng, không tự làm.

## Kiểm tra thủ công sau deploy

1. Mở màn Hồ sơ nhân viên → sửa một nhân viên → tab Công việc: ô Phòng ban là dropdown, có đủ 7 phòng.
2. Chọn một phòng, lưu, mở lại → giữ đúng phòng đã chọn.
3. Bảng danh sách nhân viên: cột Phòng ban hiện tên, không hiện id.
4. Màn Quá trình công tác → tạo điều chuyển → chọn phòng mới → bảng lịch sử hiện `Phòng ban: <tên cũ> → <tên mới>`.
5. Đổi tên một phòng trên identity portal → bản ghi lịch sử cũ **vẫn hiện tên cũ** (đúng thiết kế), còn hồ sơ nhân viên hiện tên mới.
