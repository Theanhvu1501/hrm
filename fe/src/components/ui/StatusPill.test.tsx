// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill, type PillTone } from './StatusPill';

/** Lớp nền của tông trung tính — mốc để nhận ra "đã rơi về trung tính". */
const NEN_TRUNG_TINH = 'bg-[hsl(var(--muted))]';

const TONES: PillTone[] = ['ok', 'cho', 'tu-choi', 'nhap', 'dang', 'trung-tinh'];

/** Hai tông CỐ Ý dùng chung một bộ màu (xem chú thích trong StatusPill.tsx). */
const CAP_CO_Y_TRUNG = new Set(['nhap|trung-tinh']);

const lop = (tone: PillTone) => {
  const { container } = render(<StatusPill tone={tone}>x</StatusPill>);
  return container.firstElementChild!.className;
};

describe('StatusPill', () => {
  it('vẽ nội dung được truyền vào', () => {
    render(<StatusPill tone="ok">Đã duyệt</StatusPill>);
    expect(screen.getByText('Đã duyệt')).toBeTruthy();
  });

  it('mỗi tông một bộ màu riêng', () => {
    // So ĐỦ mọi cặp: so hai tông là không đủ, xoá màu của tông thứ ba vẫn xanh.
    for (let i = 0; i < TONES.length; i++) {
      for (let j = i + 1; j < TONES.length; j++) {
        const a = TONES[i];
        const b = TONES[j];
        if (CAP_CO_Y_TRUNG.has(`${a}|${b}`)) continue;
        expect(lop(a), `tông ${a} và ${b} đang cùng một bộ màu`).not.toBe(lop(b));
      }
    }
  });

  it('tông lạ rơi về trung tính thay vì vỡ', () => {
    // Khẳng định ĐÚNG lớp nền trung tính, không chỉ khẳng định chữ còn đó —
    // xoá `?? TONE['trung-tinh']` thì className rỗng và ca này phải đỏ.
    // @ts-expect-error kiểm tra phòng thủ khi dữ liệu từ API lệch
    const { container } = render(<StatusPill tone="khong-co">C</StatusPill>);
    expect(screen.getByText('C')).toBeTruthy();
    expect(container.firstElementChild!.className).toContain(NEN_TRUNG_TINH);
    expect(container.firstElementChild!.className).toBe(lop('trung-tinh'));
  });
});
