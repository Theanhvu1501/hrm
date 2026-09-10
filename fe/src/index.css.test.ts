import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve(__dirname, './index.css'), 'utf8');
const goc = css.slice(css.indexOf(':root {'), css.indexOf('.dark {'));
// Lát cắt trên dừng ngay trước '.dark {' nên khối tối nằm NGOÀI tầm kiểm.
// Đọc riêng khối tối: từ '.dark {' tới dấu đóng khối đầu tiên.
const dauKhoiToi = css.indexOf('.dark {');
const khoiToi = css.slice(dauKhoiToi, css.indexOf('\n  }', dauKhoiToi));

const doc = (khoi: string) => (ten: string): string | undefined =>
  khoi.match(new RegExp(`--${ten}:\\s*([^;]+);`))?.[1].trim();

const bien = doc(goc);
const bienToi = doc(khoiToi);

describe('design token', () => {
  it('bo góc theo thiết kế mới', () => {
    expect(bien('radius')).toBe('0.4375rem');
    expect(bien('radius-card')).toBe('9px');
    expect(bien('radius-modal')).toBe('14px');
  });

  it('màu thương hiệu KHÔNG đổi', () => {
    expect(bien('primary')).toBe('170 59% 29%');
  });

  it('sidebar giữ tông sáng đã đổi ở đợt A — KHÔNG đổi lại', () => {
    expect(bien('sidebar-background')).toBe('240 11% 94%');
    expect(bien('sidebar-panel')).toBe('0 0% 98%');
  });

  it('có đủ thang chữ ink', () => {
    expect(bien('ink')).toBeDefined();
    expect(bien('ink-2')).toBeDefined();
    expect(bien('ink-3')).toBeDefined();
  });

  it('có màu tăng / giảm / cảnh báo', () => {
    expect(bien('green')).toBeDefined();
    expect(bien('red')).toBeDefined();
    expect(bien('amber')).toBeDefined();
  });

  it('bí danh cũ và tên mới phải cùng một màu', () => {
    // Tailwind phơi bộ cũ thành class có tên và ~140 chỗ trong src/ đang gọi;
    // nếu hai bên lệch nhau thì cùng một nghĩa lại ra hai màu.
    expect(bien('foreground')).toBe(bien('ink'));
    expect(bien('muted-foreground')).toBe(bien('ink-2'));
    // Ba khoá dưới nằm ngoài bảng bí danh cũ nên đợt trước bị bỏ sót, vẫn giữ
    // 222 47% 11% trong khi --foreground đã chuyển sang --ink. Cùng là "chữ
    // trên nền sáng" nên phải cùng một màu.
    expect(bien('card-foreground')).toBe(bien('ink'));
    expect(bien('popover-foreground')).toBe(bien('ink'));
    expect(bien('secondary-foreground')).toBe(bien('ink'));
    expect(bien('destructive')).toBe(bien('red'));
    expect(bien('success')).toBe(bien('green'));
    expect(bien('warning')).toBe(bien('amber'));
    expect(bien('info')).toBe(bien('blue'));
  });
  it('mọi token màu mới đều phải có bản tối', () => {
    const mau = [
      'ink',
      'ink-2',
      'ink-3',
      'blue',
      'blue-soft',
      'green',
      'red',
      'amber',
      'green-ink',
      'red-ink',
      'amber-ink',
      'blue-ink',
      'chart-orange',
      'chart-navy',
      'chart-gold',
    ];
    for (const ten of mau) {
      expect(bienToi(ten), `--${ten} thiếu bản tối trong khối .dark`).toBeDefined();
    }
  });

  it('thang bề mặt bản tối phải tách bậc, không được trùng nhau', () => {
    // Ba token này từng CÙNG là 217 33% 17%: viền .action-icon-btn vô hình,
    // StatusPill tông xám mất hình dạng, zebra bảng biến mất.
    const bac = ['card', 'muted', 'border'].map((t) => bienToi(t));
    expect(new Set(bac).size, `--card/--muted/--border trùng nhau: ${bac.join(' | ')}`).toBe(3);
    // --input là viền ô nhập, phải đi cùng --border chứ không cùng nền card.
    expect(bienToi('input')).toBe(bienToi('border'));
  });

  it('bí danh cũ và tên mới cũng phải trùng nhau ở khối tối', () => {
    expect(bienToi('foreground')).toBe(bienToi('ink'));
    expect(bienToi('muted-foreground')).toBe(bienToi('ink-2'));
    expect(bienToi('card-foreground')).toBe(bienToi('ink'));
    expect(bienToi('popover-foreground')).toBe(bienToi('ink'));
    expect(bienToi('secondary-foreground')).toBe(bienToi('ink'));
    expect(bienToi('destructive')).toBe(bienToi('red'));
    expect(bienToi('success')).toBe(bienToi('green'));
    expect(bienToi('warning')).toBe(bienToi('amber'));
    expect(bienToi('info')).toBe(bienToi('blue'));
  });
});
