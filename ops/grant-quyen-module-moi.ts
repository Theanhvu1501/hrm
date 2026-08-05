import { MongoClient } from 'mongodb';

/**
 * Vá dữ liệu quyền cho 3 module chấm công được thêm vào catalog SAU khi các
 * hàng `phan_quyen` trên production đã được tạo.
 *
 * Vì sao cần: `PERMISSION_MODULES` (be/libs/core/src/permissions/all-permissions.ts)
 * có 14 module × 5 hành động = 70 quyền, nhưng các hàng `phan_quyen` trên
 * production chỉ có 55 quyền — thiếu đúng 3 module dưới đây. Từ khi 7
 * controller của config-service chuyển từ `AdminGuard` sang `PermissionGuard`,
 * route không có quyền tương ứng sẽ trả 403. Deploy code mà không chạy script
 * này thì ba màn hình Ngày lễ / Thiết bị / Bản ghi chấm công chuyển từ "403
 * cho mọi người" sang vẫn "403 cho mọi người" — không sửa được gì.
 *
 * Cách cấp: KHÔNG cấp bừa "cho đủ bộ". Với mỗi vai trò, sao chép đúng BỘ HÀNH
 * ĐỘNG mà vai trò đó đang có cho `/cham-cong/ca-lam-viec` — module chấm công
 * cùng nhóm quản trị, đã có sẵn dữ liệu đúng trên production. Vai trò không có
 * quyền nào với ca-lam-viec (vd "Nhân viên") thì KHÔNG được cấp gì.
 *
 * Script chỉ THÊM, không bao giờ xoá quyền nào. Chạy lại nhiều lần là an toàn
 * (idempotent): lần thứ hai sẽ báo "không có gì phải đổi".
 *
 * Chạy:
 *   MONGODB_URI=... MONGODB_DATABASE=nhan_su npx ts-node ops/grant-quyen-module-moi.ts --dry-run
 *   MONGODB_URI=... MONGODB_DATABASE=nhan_su npx ts-node ops/grant-quyen-module-moi.ts
 */

/** Module dùng làm KHUÔN: bộ hành động của nó được sao sang các module mới. */
const MODULE_KHUON = '/cham-cong/ca-lam-viec';

/**
 * Module thêm sau, đang thiếu trong `phan_quyen.permissions`.
 * Đợt P4.2a (Quỹ giờ làm thêm): cấp `/cham-cong/quy-gio`. (Đợt P3.8 đã cấp
 * `/cham-cong/quy-phep`; đợt P4 đã cấp `/luong/*`.)
 * Đợt P4.5 (Cấu hình chấm công): cấp `/cham-cong/cau-hinh`.
 * Script chỉ THÊM, idempotent — đổi lại danh sách này mỗi đợt deploy module mới.
 *
 * Controller `quy-gio.controller.ts` chỉ thực sự enforce hai hành động
 * `:xem` và `:sua` (`@Permissions('/cham-cong/quy-gio:xem'|'sua')`) — không
 * có route nào đòi `:them`/`:xoa`/`:xuat`. Script vẫn sao NGUYÊN bộ hành động
 * mà vai trò đang có cho `MODULE_KHUON` (giống hệt cách đã làm cho
 * `/cham-cong/quy-phep`, module cũng chỉ enforce một phần của 5 hành động)
 * — quyền thừa không dùng tới không hại gì, tách logic "chỉ cấp đúng cái cần"
 * ra khỏi script này sẽ phức tạp hơn giá trị nó mang lại.
 */
const MODULE_CAN_CAP = ['/cham-cong/cau-hinh'];

const DRY_RUN = process.argv.includes('--dry-run');

/** Lấy các hành động (`xem`, `them`, ...) mà vai trò đang có cho một module. */
function hanhDongCuaModule(permissions: string[], module: string): string[] {
  const tienTo = `${module}:`;
  return permissions
    .filter((quyen) => quyen.startsWith(tienTo))
    .map((quyen) => quyen.slice(tienTo.length));
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE || 'nhan_su';
  if (!uri) throw new Error('MONGODB_URI required');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection('phan_quyen');

  console.log(
    `Vá quyền 3 module chấm công trên ${dbName}.phan_quyen${DRY_RUN ? ' (DRY RUN — không ghi gì)' : ''}`,
  );

  const rows = await collection.find({}).toArray();
  console.log(`Tìm thấy ${rows.length} hàng phan_quyen\n`);

  let soHangDoi = 0;
  let soQuyenThem = 0;

  for (const row of rows) {
    const nhan = `${row.ten ?? row.vaiTro ?? row._id} (vaiTro=${row.vaiTro}, _id=${row._id})`;
    const hienCo: string[] = Array.isArray(row.permissions)
      ? row.permissions
      : [];

    const hanhDongKhuon = hanhDongCuaModule(hienCo, MODULE_KHUON);
    if (hanhDongKhuon.length === 0) {
      // Vai trò không có quyền nào với ca-lam-viec → cố ý KHÔNG cấp gì. Đây
      // chính là chỗ ngăn việc vô tình mở màn hình quản trị cho "Nhân viên".
      console.log(
        `- BỎ QUA ${nhan}: không có quyền nào với ${MODULE_KHUON}, không cấp gì`,
      );
      continue;
    }

    const quyenThem = MODULE_CAN_CAP.flatMap((module) =>
      hanhDongKhuon
        .map((hanhDong) => `${module}:${hanhDong}`)
        .filter((quyen) => !hienCo.includes(quyen)),
    );

    if (quyenThem.length === 0) {
      console.log(`- ĐỦ RỒI ${nhan}: đã có đủ quyền 3 module, không đổi`);
      continue;
    }

    console.log(
      `- CẬP NHẬT ${nhan}\n    khuôn ${MODULE_KHUON} = [${hanhDongKhuon.join(', ')}]\n    thêm ${quyenThem.length} quyền: ${quyenThem.join(', ')}`,
    );

    soHangDoi += 1;
    soQuyenThem += quyenThem.length;

    if (!DRY_RUN) {
      // $addToSet + $each: chỉ THÊM, không đụng tới quyền đang có, và chạy
      // lại lần nữa cũng không sinh bản ghi trùng.
      await collection.updateOne(
        { _id: row._id },
        {
          $addToSet: { permissions: { $each: quyenThem } },
          $set: { updatedAt: new Date() },
        },
      );
    }
  }

  console.log(
    `\n${DRY_RUN ? '[DRY RUN] Sẽ cập nhật' : 'Đã cập nhật'} ${soHangDoi}/${rows.length} hàng, ${soQuyenThem} quyền được thêm.`,
  );
  if (DRY_RUN && soHangDoi > 0) {
    console.log('Chạy lại KHÔNG kèm --dry-run để ghi thật.');
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
