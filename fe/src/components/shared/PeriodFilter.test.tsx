// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import dayjs from 'dayjs';
import { PeriodFilter, currentMonthPeriod, paramsOfPeriod } from './PeriodFilter';

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia =
    w.matchMedia ||
    ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }));
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

const YEAR = new Date().getFullYear();

describe('paramsOfPeriod', () => {
  it('tháng: đúng ngày đầu và ngày cuối tháng của năm nay', () => {
    const p = paramsOfPeriod('thang7');
    expect(p.periodType).toBe('thang');
    expect(dayjs(p.startDate).format('DD/MM/YYYY')).toBe(`01/07/${YEAR}`);
    expect(dayjs(p.endDate).format('DD/MM/YYYY')).toBe(`31/07/${YEAR}`);
  });

  it('tháng 2: ngày cuối theo đúng số ngày của tháng', () => {
    const p = paramsOfPeriod('thang2');
    const lastDay = dayjs(new Date(YEAR, 2, 0)).format('DD/MM/YYYY');
    expect(dayjs(p.endDate).format('DD/MM/YYYY')).toBe(lastDay);
  });

  it('năm trước: trọn năm ngoái', () => {
    const p = paramsOfPeriod('namTruoc');
    expect(p.periodType).toBe('nam');
    expect(dayjs(p.startDate).format('DD/MM/YYYY')).toBe(`01/01/${YEAR - 1}`);
    expect(dayjs(p.endDate).format('DD/MM/YYYY')).toBe(`31/12/${YEAR - 1}`);
  });
});

describe('currentMonthPeriod', () => {
  it('trả về key kỳ của tháng hiện tại', () => {
    expect(currentMonthPeriod()).toBe(`thang${new Date().getMonth() + 1}`);
    const p = paramsOfPeriod(currentMonthPeriod());
    expect(dayjs(p.startDate).format('MM/YYYY')).toBe(dayjs().format('MM/YYYY'));
  });
});

describe('PeriodFilter', () => {
  it('không truyền defaultPeriod → vẫn hiện "Năm nay" (giữ hành vi cho Báo cáo tài chính)', () => {
    render(<PeriodFilter onFilter={vi.fn()} autoApply />);
    expect(screen.getByTitle('Năm nay')).toBeTruthy();
  });

  it('defaultPeriod → hiện đúng kỳ đó lúc mở', () => {
    render(<PeriodFilter onFilter={vi.fn()} autoApply defaultPeriod="thang6" />);
    expect(screen.getByTitle('Tháng 6')).toBeTruthy();
  });

  it('autoApply: đổi kỳ → onFilter nhận đúng khoảng ngày', async () => {
    const onFilter = vi.fn();
    render(<PeriodFilter onFilter={onFilter} autoApply defaultPeriod="thang7" />);

    fireEvent.mouseDown(document.querySelector('.ant-select') as HTMLElement);
    fireEvent.click(await screen.findByTitle('Tháng 6'));

    expect(onFilter).toHaveBeenCalledTimes(1);
    const p = onFilter.mock.calls[0][0];
    expect(dayjs(p.startDate).format('DD/MM/YYYY')).toBe(`01/06/${YEAR}`);
    expect(dayjs(p.endDate).format('DD/MM/YYYY')).toBe(`30/06/${YEAR}`);
  });

  it('defaultPeriod="tuyChon" + defaultCustomRange → hiện 2 ô ngày đã điền sẵn', () => {
    render(
      <PeriodFilter
        onFilter={vi.fn()}
        autoApply
        defaultPeriod="tuyChon"
        defaultCustomRange={[dayjs('2024-03-01'), dayjs('2024-03-31')]}
      />,
    );
    expect((screen.getByPlaceholderText('Từ ngày') as HTMLInputElement).value).toBe('01/03/2024');
    expect((screen.getByPlaceholderText('Đến ngày') as HTMLInputElement).value).toBe('31/03/2024');
  });
});
