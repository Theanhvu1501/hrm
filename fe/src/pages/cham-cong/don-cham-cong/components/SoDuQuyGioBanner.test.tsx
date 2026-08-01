// @vitest-environment jsdom
/**
 * Ba trạng thái của banner số dư quỹ giờ (việc bị hoãn ở Task 10, được kéo
 * lên trong đợt vá review nhánh).
 *
 * CỐ Ý dùng `overtimeBalanceService` THẬT, chỉ giả `client` (axios instance
 * private của `ServiceBase`) — KHÔNG `vi.mock('@/services/overtimeBalanceService')`.
 * Một service bị mock sẽ trả thẳng object đã đúng hình dạng và do đó KHÔNG
 * BAO GIỜ bắt được CRITICAL 1 (backend trả object thô, `parseResponse()` bóc
 * `response.data` ra `undefined`, `transform(undefined)` ném TypeError, và
 * `.catch()` của chính banner nuốt mất). Thân phản hồi ở đây là thân THẬT
 * sau bản vá controller: `{ success: true, data }`.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { SoDuQuyGioBanner } from './SoDuQuyGioBanner';
import { overtimeBalanceService } from '@/services/overtimeBalanceService';

type CoClient = { client: { get: unknown } };
const clientGoc = (overtimeBalanceService as unknown as CoClient).client.get;

function giaThanPhanHoi(than: unknown) {
  (overtimeBalanceService as unknown as CoClient).client.get = vi.fn(
    async () => ({ data: than }),
  );
}

function giaLoi() {
  (overtimeBalanceService as unknown as CoClient).client.get = vi.fn(
    async () => {
      throw new Error('mất mạng');
    },
  );
}

afterEach(() => {
  (overtimeBalanceService as unknown as CoClient).client.get = clientGoc;
});

const phongBi = (data: unknown) => ({ success: true, data });

describe('SoDuQuyGioBanner', () => {
  it('CÒN quỹ: hiện số giờ và kỳ sắp hết hạn, KHÔNG khoá nút Lưu', async () => {
    giaThanPhanHoi(
      phongBi({
        soGioConLai: 8.33,
        theoKy: [
          { kyTich: '2026-01', hanDung: '2026-07-31', soGioConLai: 8.33 },
        ],
      }),
    );
    const onHetQuy = vi.fn();

    render(<SoDuQuyGioBanner onHetQuy={onHetQuy} />);

    // Chính là câu mà CRITICAL 1 làm cho không bao giờ hiện được.
    expect(await screen.findByText(/Bạn còn 8\.33 giờ nghỉ bù/)).toBeTruthy();
    expect(screen.getByText(/Sớm nhất hết hạn ngày 2026-07-31/)).toBeTruthy();
    await waitFor(() => expect(onHetQuy).toHaveBeenCalledWith(false));
  });

  it('HẾT quỹ (0 giờ): báo chưa có giờ làm thêm và KHOÁ nút Lưu', async () => {
    giaThanPhanHoi(phongBi({ soGioConLai: 0, theoKy: [] }));
    const onHetQuy = vi.fn();

    render(<SoDuQuyGioBanner onHetQuy={onHetQuy} />);

    expect(
      await screen.findByText(/Bạn chưa có giờ làm thêm nào để nghỉ bù/),
    ).toBeTruthy();
    await waitFor(() => expect(onHetQuy).toHaveBeenCalledWith(true));
  });

  it('LỖI đọc số dư: báo chưa đọc được, và CỐ Ý KHÔNG khoá nút Lưu', async () => {
    giaLoi();
    const onHetQuy = vi.fn();

    render(<SoDuQuyGioBanner onHetQuy={onHetQuy} />);

    expect(
      await screen.findByText(/Chưa đọc được số dư quỹ giờ/),
    ).toBeTruthy();
    // Sự cố mạng tạm thời không được biến thành "không nộp đơn được".
    await waitFor(() => expect(onHetQuy).toHaveBeenCalledWith(false));
    expect(onHetQuy).not.toHaveBeenCalledWith(true);
  });

  it('có employeeId (HR nộp hộ) thì đọc route quản trị của ĐÚNG nhân viên đó', async () => {
    giaThanPhanHoi(phongBi({ soGioConLai: 4, theoKy: [] }));

    render(<SoDuQuyGioBanner employeeId="nv9" />);

    await waitFor(() =>
      expect(
        (overtimeBalanceService as unknown as CoClient).client.get,
      ).toHaveBeenCalledWith('/config/quy-gio/nv9/so-du', expect.anything()),
    );
  });
});
