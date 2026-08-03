import { MongoClient } from 'mongodb';
import sanitizeHtml from 'sanitize-html';

/**
 * Vá lại các dòng `phieu_template` (loai='HOP_DONG_LAO_DONG') đã lưu TRƯỚC
 * khi có `sanitizeHopDongHtml` (be/apps/config-service/src/hop-dong/lib/hopDongRender.ts),
 * hoặc lưu bằng một bản sanitizer cũ đã bị bypass.
 *
 * Vì sao cần (review Critical 1): bản sanitizer regex ban đầu
 * (`sanitizeMauInHtml`, đã thay bằng `sanitizeHopDongHtml` dùng `sanitize-html`)
 * để lọt 9/9 payload XSS thật reviewer đưa ra — `</script >`, `</script/>`,
 * script không đóng thẻ, `onerror` ngăn bằng "/", `<svg onload>`,
 * `<iframe srcdoc>`, `javascript:` không dấu nháy/encode entity, `<base
 * href>`. Bất kỳ dòng nào lưu qua bản đó (hoặc qua PUT /config/phieu-template
 * trước khi bị chặn — xem Critical 2) có thể đang mang HTML độc SỐNG trong
 * DB. `renderHopDongHtml` giờ sanitize lại lúc RENDER nên không còn phục vụ
 * HTML sống ra ngoài nữa — script này dọn luôn DỮ LIỆU LƯU, không chỉ chặn ở
 * đầu ra, và loại bỏ phụ thuộc "phải nhớ render luôn sanitize" trong tương lai.
 *
 * Idempotent: chạy lại nhiều lần an toàn — dòng đã sạch thì `sanitizeHtml()`
 * trả về y nguyên, script bỏ qua không ghi.
 *
 * Cấu hình allowlist PHẢI khớp `sanitizeHopDongHtml` — xem chú thích ở đó.
 * Không import trực tiếp file be/ (ops/ chạy độc lập, tránh kéo theo toàn bộ
 * cây import Nest/TypeORM của be/ vào 1 script Mongo thuần) — lặp lại cấu
 * hình ở đây, có comment trỏ ngược để không lệch nhau.
 *
 * Chạy:
 *   MONGODB_URI=... MONGODB_DATABASE=nhan_su npx ts-node ops/re-sanitize-hop-dong-mau-in.ts --dry-run
 *   MONGODB_URI=... MONGODB_DATABASE=nhan_su npx ts-node ops/re-sanitize-hop-dong-mau-in.ts
 */

const ALLOWED_TAGS = [
  'div', 'p', 'span', 'br', 'hr',
  'b', 'strong', 'i', 'em', 'u', 'small', 'sup', 'sub',
  'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'td', 'th', 'caption',
  'style',
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  '*': ['style', 'class'],
  table: ['border', 'cellpadding', 'cellspacing'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
};

function sanitizeHopDongHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: [],
    allowProtocolRelative: false,
    allowVulnerableTags: true,
    disallowedTagsMode: 'discard',
  });
}

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
