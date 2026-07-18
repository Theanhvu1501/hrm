/**
 * Script to update tai_khoan collection with new loai values
 * Maps old values (NO, CO) to new LoaiTaiKhoan enum based on account code
 */
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'digital_book';

// Mapping từ mã tài khoản sang loại tài khoản mới
function getLoaiByMa(ma) {
  const firstDigit = ma.charAt(0);
  const firstTwo = ma.substring(0, 2);
  
  // Loại 1, 2: Tài sản
  if (firstDigit === '1' || firstDigit === '2') {
    return 'TAI_SAN';
  }
  // Loại 3: Nợ phải trả
  if (firstDigit === '3') {
    return 'NO_PHAI_TRA';
  }
  // Loại 4: Vốn chủ sở hữu
  if (firstDigit === '4') {
    return 'VON_CHU_SO_HUU';
  }
  // Loại 5: Doanh thu
  if (firstDigit === '5') {
    return 'DOANH_THU';
  }
  // Loại 6: Chi phí
  if (firstDigit === '6') {
    return 'CHI_PHI';
  }
  // Loại 7: Thu nhập khác
  if (firstTwo === '71') {
    return 'THU_NHAP_KHAC';
  }
  // Loại 8: Chi phí khác
  if (firstTwo === '81') {
    return 'CHI_PHI_KHAC';
  }
  // Loại 9: Xác định kết quả kinh doanh
  if (firstTwo === '91') {
    return 'XAC_DINH_KQKD';
  }
  
  return null;
}

async function updateTaiKhoan() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const taiKhoanCollection = db.collection('tai_khoan');
    
    // Get all tai_khoan records
    const taiKhoanList = await taiKhoanCollection.find({}).toArray();
    console.log(`📋 Found ${taiKhoanList.length} tai_khoan records`);
    
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    
    const validLoai = ['TAI_SAN', 'NO_PHAI_TRA', 'VON_CHU_SO_HUU', 'DOANH_THU', 'CHI_PHI', 'THU_NHAP_KHAC', 'CHI_PHI_KHAC', 'XAC_DINH_KQKD'];
    
    for (const taiKhoan of taiKhoanList) {
      const ma = taiKhoan.ma;
      const currentLoai = taiKhoan.loai;
      
      // Check if already has new loai value
      if (validLoai.includes(currentLoai)) {
        skipped++;
        continue;
      }
      
      const newLoai = getLoaiByMa(ma);
      
      if (!newLoai) {
        console.log(`⚠️  No mapping found for ma: "${ma}"`);
        notFound++;
        continue;
      }
      
      // Update the record
      await taiKhoanCollection.updateOne(
        { _id: taiKhoan._id },
        { $set: { loai: newLoai } }
      );
      
      console.log(`✅ Updated: "${ma}" (${taiKhoan.ten}) -> loai: ${newLoai}`);
      updated++;
    }
    
    console.log('\n==================================================');
    console.log('📊 UPDATE SUMMARY');
    console.log('==================================================');
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Skipped (already correct): ${skipped}`);
    console.log(`⚠️  Not found mapping: ${notFound}`);
    console.log(`📦 Total: ${taiKhoanList.length}`);
    console.log('==================================================');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ Disconnected from MongoDB');
  }
}

updateTaiKhoan();
