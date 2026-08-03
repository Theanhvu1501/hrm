import { MongoClient } from 'mongodb';

/**
 * Backfill `phanBoOt` cho đơn làm thêm giờ nộp TRƯỚC P4.2b.
 *
 * Vì sao cần: từ P4.2b, `phanBoOt` là nguồn sự thật của cả tích quỹ giờ lẫn
 * tiền làm thêm (P4.2c). `gioTichTuDonOt()` vẫn có đường lùi cho đơn thiếu
 * trường này nên quỹ giờ KHÔNG hỏng nếu chưa chạy script — nhưng biểu mẫu
 * 03-LĐTL ở P4.2c đọc thẳng `phanBoOt`, nên đơn cũ sẽ **biến mất khỏi bảng
 * thanh toán tiền làm thêm** cho tới khi script này chạy.
 *
 * CỐ Ý KHÔNG chẻ lại đơn cũ theo khung giờ đêm, dù đơn cũ có đủ
 * `gioTu`/`gioDen` để làm được: chẻ lại là đổi hệ số của đơn ĐÃ DUYỆT và ĐÃ
 * TÍCH QUỸ — số dư quỹ sẽ lệch với sổ append-only, và `doiSoat()` báo đỏ hàng
 * loạt. Ca đêm chỉ áp cho đơn nộp TỪ NGÀY DEPLOY trở đi.
 *
 * `heSoTra` lấy từ `heSoOt` đã snapshot trên chính đơn, KHÔNG tra lại bảng
 * hiện tại — cùng lý do trên. Chỉ `heSoTichQuy` phải tra bảng, vì đơn cũ
 * không hề lưu nó.
 *
 * Idempotent: chỉ đụng đơn CHƯA có `phanBoOt`. Chạy lại lần hai báo "không có
 * gì phải đổi".
 *
 * KHÔNG chạy được trong container `nhan-su-be` — `ops/` không bao giờ được
 * rsync lên server và image không cài `ts-node` (devDependency). Chạy từ máy
 * có mã nguồn, qua SSH tunnel tới Mongo production. Script chỉ cần `mongodb`
 * nên phải chạy từ `be/` để resolve được `node_modules` — xem ops/README.md.
 *
 * Chạy:
 *   MONGODB_URI=... MONGODB_DATABASE=nhan_su npx ts-node ops/backfill-phan-bo-ot.ts --dry-run
 *   MONGODB_URI=... MONGODB_DATABASE=nhan_su npx ts-node ops/backfill-phan-bo-ot.ts
 */

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Bảng tra — cùng quy ước `traHeSo()` ở `be/apps/config-service/src/
 * don-cham-cong/luat-don.ts`: loại lạ rơi về `ngay_thuong` (hệ số THẤP nhất,
 * không tự tặng giờ), bảng rỗng rơi về 1.0 chứ không `undefined`. Chép chứ
 * không import: script chạy ngoài cây mã nguồn của app (xem đầu file), và
 * đây là bốn dòng chứ không phải một luật nghiệp vụ có thể trôi đi.
 */
function traHeSo(bang: Record<string, number>, loai: string): number {
  return bang?.[loai] ?? bang?.ngay_thuong ?? 1;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE || 'nhan_su';
  if (!uri) throw new Error('MONGODB_URI required');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  console.log(
    `Backfill phanBoOt trên ${dbName}.attendance_requests${DRY_RUN ? ' (DRY RUN — không ghi gì)' : ''}`,
  );

  // Cấu hình theo tenant; đơn cũng theo tenant. Dùng nhầm bảng hệ số của
  // tenant khác là ghi sai giờ nghỉ bù của người lao động.
  const cauHinhs = await db.collection('cau_hinh_luong').find({}).toArray();
  const bangTheoTenant = new Map<string, Record<string, number>>();
  for (const ch of cauHinhs) {
    bangTheoTenant.set(
      String(ch.tenantId ?? ''),
      (ch.lamThem?.heSoTichQuy as Record<string, number>) ?? {},
    );
  }
  console.log(`Tìm thấy cấu hình lương của ${bangTheoTenant.size} tenant`);

  const dons = await db
    .collection('attendance_requests')
    .find({ loaiDon: 'lam_them_gio', phanBoOt: { $exists: false } })
    .toArray();
  console.log(`Tìm thấy ${dons.length} đơn làm thêm chưa có phanBoOt\n`);

  let daBackfill = 0;
  let boQua = 0;

  for (const don of dons) {
    const nhan = `đơn ${don._id} (${don.employeeCode ?? don.employeeId}, ${don.ngay})`;
    const bang = bangTheoTenant.get(String(don.tenantId ?? ''));

    if (!bang) {
      console.log(
        `- BỎ QUA ${nhan}: tenant ${don.tenantId} chưa khai cấu hình lương`,
      );
      boQua++;
      continue;
    }
    if (typeof don.soGioOt !== 'number' || !don.loaiNgayOt) {
      console.log(`- BỎ QUA ${nhan}: thiếu soGioOt/loaiNgayOt`);
      boQua++;
      continue;
    }

    const phanBoOt = [
      {
        loaiNgayOt: don.loaiNgayOt,
        soGio: don.soGioOt,
        heSoTra:
          typeof don.heSoOt === 'number'
            ? don.heSoOt
            : traHeSo(bang, don.loaiNgayOt),
        heSoTichQuy: traHeSo(bang, don.loaiNgayOt),
      },
    ];

    console.log(
      `- CẬP NHẬT ${nhan}: ${phanBoOt[0].soGio}h ${phanBoOt[0].loaiNgayOt} (trả ×${phanBoOt[0].heSoTra}, tích ×${phanBoOt[0].heSoTichQuy})`,
    );

    if (!DRY_RUN) {
      await db
        .collection('attendance_requests')
        .updateOne({ _id: don._id }, { $set: { phanBoOt } });
    }
    daBackfill++;
  }

  console.log(
    `\n${DRY_RUN ? 'DRY RUN — không ghi gì. Sẽ' : 'Đã'} backfill ${daBackfill} đơn, bỏ qua ${boQua} đơn, tổng ${dons.length}.`,
  );

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
