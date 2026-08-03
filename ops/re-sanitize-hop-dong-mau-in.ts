import { MongoClient } from 'mongodb';
// Import THẲNG hàm sanitize thật từ be/ — KHÔNG lặp lại cấu hình allowlist ở
// đây nữa (review Medium, vòng 2: bản lặp lại trước đó kế thừa lỗ hổng
// 'style' + allowVulnerableTags của bản sanitizer cũ vì là 2 chỗ tách rời,
// dễ lệch nhau — Fix đúng là "import shared config instead of copying it.
// That way the migration can never drift from the sanitiser again"). Script
// này CHỈ chạy được trong container `nhan-su-be` (xem ops/README.md) vì
// `mongodb` VÀ giờ cả `sanitize-html` (transitive qua hopDongRender.ts) đều
// phải resolve qua `be/node_modules` — `require()` trong Node đi theo đường
// dẫn FILE (ops/ là thư mục anh em của be/, không phải con), không theo cwd.
import { sanitizeHopDongHtml } from '../be/apps/config-service/src/hop-dong/lib/hopDongRender';

/**
 * Vá lại các dòng `phieu_template` (loai='HOP_DONG_LAO_DONG') đã lưu TRƯỚC
 * khi có `sanitizeHopDongHtml` (be/apps/config-service/src/hop-dong/lib/hopDongRender.ts),
 * hoặc lưu bằng một bản sanitizer cũ đã bị bypass (kể cả bản sanitize-html
 * ĐẦU TIÊN — cho phép `style` + `allowVulnerableTags` — đã bị review vòng 2
 * chỉ ra là vẫn lộ script qua parser-confusion `</style/>`; xem Critical 1
 * vòng 2 trong report và comment tại `sanitizeHopDongHtml`).
 *
 * Idempotent: chạy lại nhiều lần an toàn — dòng đã sạch thì
 * `sanitizeHopDongHtml()` trả về y nguyên, script bỏ qua không ghi.
 *
 * Chạy (BẮT BUỘC trong container `nhan-su-be`, xem ops/README.md):
 *   MONGODB_URI=... MONGODB_DATABASE=nhan_su npx ts-node ops/re-sanitize-hop-dong-mau-in.ts --dry-run
 *   MONGODB_URI=... MONGODB_DATABASE=nhan_su npx ts-node ops/re-sanitize-hop-dong-mau-in.ts
 */

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE || 'nhan_su';
  if (!uri) throw new Error('MONGODB_URI required');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection('phieu_template');

  console.log(
    `Vá lại mẫu in HĐLĐ trên ${dbName}.phieu_template${DRY_RUN ? ' (DRY RUN — không ghi gì)' : ''}`,
  );

  const rows = await collection.find({ loai: 'HOP_DONG_LAO_DONG' }).toArray();
  console.log(`Tìm thấy ${rows.length} dòng loai=HOP_DONG_LAO_DONG\n`);

  let soHangDoi = 0;

  for (const row of rows) {
    const nhan = `tenantId=${row.tenantId} (_id=${row._id})`;
    const htmlCu: string = typeof row.html === 'string' ? row.html : '';
    const htmlMoi = sanitizeHopDongHtml(htmlCu);

    if (htmlMoi === htmlCu) {
      console.log(`- SẠCH ${nhan}: không có gì phải đổi`);
      continue;
    }

    console.log(`- VÁ ${nhan}: HTML thay đổi sau sanitize (${htmlCu.length} → ${htmlMoi.length} ký tự)`);
    soHangDoi += 1;

    if (!DRY_RUN) {
      await collection.updateOne(
        { _id: row._id },
        { $set: { html: htmlMoi, updatedAt: new Date() } },
      );
    }
  }

  console.log(
    `\n${DRY_RUN ? '[DRY RUN] Sẽ vá' : 'Đã vá'} ${soHangDoi}/${rows.length} dòng.`,
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
