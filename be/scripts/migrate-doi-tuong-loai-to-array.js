/**
 * Migration: doi_tuong.loai  string  ->  string[]  (đối tượng đa loại)
 *
 * Chuyển field `loai` của mọi document trong collection `doi_tuong` từ
 * chuỗi đơn (vd "KHACH_HANG") sang mảng 1 phần tử (vd ["KHACH_HANG"]).
 *
 * - Idempotent: bỏ qua document đã là mảng.
 * - KHÔNG đụng snapshot đối tượng trong chứng từ (danhMuc.doiTuong*.loai) — giữ string.
 *
 * Chạy:
 *   MONGODB_URI="mongodb://..." node be/scripts/migrate-doi-tuong-loai-to-array.js
 *   thêm --dry-run để chỉ xem, không ghi.
 */
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'digital_book';
const DRY_RUN = process.argv.includes('--dry-run');

const VALID_LOAI = ['KHACH_HANG', 'NHA_CUNG_CAP', 'NHAN_VIEN', 'NHA_THAU'];

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log(`✅ Connected to MongoDB (${DB_NAME})${DRY_RUN ? ' [DRY-RUN]' : ''}`);
    const col = client.db(DB_NAME).collection('doi_tuong');

    const all = await col.find({}).toArray();
    console.log(`📋 Found ${all.length} doi_tuong documents`);

    let converted = 0;
    let alreadyArray = 0;
    let invalid = 0;

    for (const dt of all) {
      const loai = dt.loai;

      if (Array.isArray(loai)) {
        alreadyArray++;
        continue;
      }

      if (typeof loai !== 'string' || !VALID_LOAI.includes(loai)) {
        invalid++;
        console.warn(`  ⚠️  ${dt.ma || dt._id}: loai không hợp lệ:`, JSON.stringify(loai));
        // Vẫn bọc thành mảng nếu là string (kể cả lạ) để không mất dữ liệu;
        // bỏ qua nếu null/undefined.
        if (typeof loai !== 'string') continue;
      }

      if (!DRY_RUN) {
        await col.updateOne({ _id: dt._id }, { $set: { loai: [loai] } });
      }
      converted++;
    }

    console.log('—'.repeat(40));
    console.log(`✅ Converted     : ${converted}`);
    console.log(`⏭️  Already array : ${alreadyArray}`);
    console.log(`⚠️  Invalid loai  : ${invalid}`);
    if (DRY_RUN) console.log('ℹ️  DRY-RUN: không có thay đổi nào được ghi.');
  } finally {
    await client.close();
  }
}

run().catch((e) => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});
