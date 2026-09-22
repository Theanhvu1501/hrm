/**
 * Script cập nhật biểu thuế TNCN đúng 7 bậc cho tất cả tenant.
 *
 * Biểu thuế cũ (SAI - chỉ có 5 bậc, ngưỡng sai):
 *   [10tr/5%, 30tr/10%, 60tr/20%, 100tr/30%, ∞/35%]
 *
 * Biểu thuế mới (ĐÚNG - 7 bậc theo Luật Thuế TNCN Điều 22):
 *   [5tr/5%, 10tr/10%, 18tr/15%, 32tr/20%, 52tr/25%, 80tr/30%, ∞/35%]
 *
 * CHẠY: Trong container nhan-su-be:
 *   docker exec -it nhan-su-be sh
 *   cd /app && npx ts-node --transpile-only -O '{"module":"commonjs"}' /app/ops/sua-bieu-thue-tncn-7-bac.ts
 *
 * Điều chỉnh 20/9 #6
 */

import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE = process.env.MONGODB_DATABASE || 'nhan_su';

const BIEU_THUE_DUNG: Array<{ den: number | null; suat: number }> = [
  { den: 5_000_000, suat: 0.05 },    // Bậc 1: đến 5 triệu = 5%
  { den: 10_000_000, suat: 0.1 },    // Bậc 2: 5-10 triệu = 10%
  { den: 18_000_000, suat: 0.15 },   // Bậc 3: 10-18 triệu = 15%
  { den: 32_000_000, suat: 0.2 },    // Bậc 4: 18-32 triệu = 20%
  { den: 52_000_000, suat: 0.25 },   // Bậc 5: 32-52 triệu = 25%
  { den: 80_000_000, suat: 0.3 },    // Bậc 6: 52-80 triệu = 30%
  { den: null, suat: 0.35 },         // Bậc 7: trên 80 triệu = 35%
];

async function main() {
  console.log('🔌 Kết nối MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db: Db = client.db(DATABASE);

  const collection = db.collection('cau_hinh_luong');

  // Tìm tất cả cấu hình lương
  const configs = await collection.find({}).toArray();
  console.log(`📋 Tìm thấy ${configs.length} cấu hình lương`);

  let updated = 0;
  for (const cfg of configs) {
    const bacThueHienTai = cfg.bacThue ?? [];

    // Kiểm tra xem đã đúng 7 bậc chưa
    if (bacThueHienTai.length === 7) {
      console.log(`  ✅ Tenant ${cfg.tenantId ?? cfg._id}: đã có 7 bậc, bỏ qua`);
      continue;
    }

    // Cập nhật
    await collection.updateOne(
      { _id: cfg._id },
      { $set: { bacThue: BIEU_THUE_DUNG } }
    );
    console.log(`  🔄 Tenant ${cfg.tenantId ?? cfg._id}: ${bacThueHienTai.length} bậc → 7 bậc`);
    updated++;
  }

  console.log(`\n✅ Hoàn thành: cập nhật ${updated}/${configs.length} cấu hình`);

  await client.close();
}

main().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
