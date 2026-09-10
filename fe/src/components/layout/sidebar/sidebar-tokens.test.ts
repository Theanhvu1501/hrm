import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Lưới an toàn cho họ token của sidebar.
 *
 * Sidebar có bảng màu RIÊNG (`--sidebar-*`). Hôm nay `--sidebar-primary` và
 * `--primary` trùng giá trị nên trộn token của trang vào không lộ ra gì; ngày
 * đổi `--primary` thì hai chỉ báo "đang mở" trong cùng một sidebar ra hai màu,
 * và hai đường viền dọc kề nhau tách màu.
 *
 * Test đọc thẳng mã nguồn nên chặn được cả những lần thêm mới sau này, kể cả
 * trong file test (.test.tsx cũng nằm trong danh sách quét).
 */
const THU_MUC = __dirname;

/**
 * Ngoại lệ chính đáng — khai kèm lý do, dạng `'--ten-token': 'vì sao'`.
 * Đang rỗng: không chỗ nào trong sidebar cần token của trang.
 */
const NGOAI_LE: Record<string, string> = {};

describe('sidebar — một họ token', () => {
  it('không file .tsx nào trong sidebar/ dùng var(--…) ngoài họ --sidebar-*', () => {
    const files = fs.readdirSync(THU_MUC).filter((f) => f.endsWith('.tsx'));
    // Chốt chặn: nếu đổi cấu trúc thư mục làm danh sách rỗng thì test phải
    // gãy, chứ không được xanh vì "không có gì để kiểm".
    expect(files.length).toBeGreaterThan(5);

    const viPham: string[] = [];
    for (const f of files) {
      const dongs = fs.readFileSync(path.join(THU_MUC, f), 'utf8').split('\n');
      dongs.forEach((dong, i) => {
        for (const m of dong.matchAll(/var\(\s*(--[\w-]+)/g)) {
          const ten = m[1];
          if (ten.startsWith('--sidebar-') || NGOAI_LE[ten]) continue;
          viPham.push(`${f}:${i + 1} ${ten}`);
        }
      });
    }
    expect(viPham).toEqual([]);
  });
});
