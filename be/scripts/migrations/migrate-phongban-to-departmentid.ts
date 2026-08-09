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
