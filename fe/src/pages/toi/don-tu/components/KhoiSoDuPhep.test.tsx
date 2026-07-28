// @vitest-environment jsdom
/**
 * Khối số dư phép — chốt chặn cuối của P3.8: NV phải thấy số dư LÚC CHỌN
 * NGÀY, không phải lúc bấm Gửi, và phải thấy TÁCH DÒNG theo năm (một quỹ
 * 2026 hết hạn 31/3/2027 và một quỹ 2027 là hai thứ khác nhau — gộp lại mất
 * luôn thông tin quỹ nào sắp hết hạn).
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KhoiSoDuPhep } from './KhoiSoDuPhep';
import { LeaveBalance } from '@/services/leaveBalanceService';

const quy2026: LeaveBalance = {
  id: 'q1',
  employeeId: 'nv1',
  nam: 2026,
  loaiQuy: 'phep_nam',
  soNgayDuocCap: 5,
  soNgayDaDung: 2,
  soNgayDangChoDuyet: 0,
  soNgayConLai: 3,
  hanDung: '2027-03-31',
  trangThai: 'dang_hieu_luc',
};
const quy2027: LeaveBalance = {
  ...quy2026,
  id: 'q2',
  nam: 2027,
  soNgayDuocCap: 12,
  soNgayDaDung: 0,
  soNgayConLai: 12,
  hanDung: '2028-03-31',
};

describe('KhoiSoDuPhep', () => {
  it('TÁCH DÒNG theo năm, không gộp thành một con số', () => {
    render(<KhoiSoDuPhep danhSach={[quy2026, quy2027]} homNay="2027-01-10" />);

    // Bám theo "Phép năm {nam}" chứ không phải bare /2026/ và /2027/: hạn
    // dùng của quỹ 2026 ("31/03/2027") cũng chứa chuỗi "2027", nên bare
    // /2027/ khớp NHẦM cả dòng hạn dùng của quỹ 2026 lẫn dòng "Phép năm
    // 2027" — hai phần tử khác nhau, getByText sẽ báo lỗi "multiple
    // elements" dù component đúng. Neo vào cụm "Phép năm {nam}" mới đúng ý
    // định của test: mỗi năm một dòng riêng.
    expect(screen.getByText(/Phép năm 2026/)).toBeTruthy();
    expect(screen.getByText(/Phép năm 2027/)).toBeTruthy();
    // Gộp lại sẽ ra "15" — NV mất luôn thông tin 3 ngày nào sắp hết hạn.
    expect(screen.queryByText('15')).toBeNull();
  });

  it('hiện hạn dùng của từng quỹ', () => {
    render(<KhoiSoDuPhep danhSach={[quy2026]} homNay="2027-01-10" />);
    expect(screen.getByText(/31\/03\/2027/)).toBeTruthy();
  });

  it('cảnh báo khi quỹ còn dư và sắp hết hạn', () => {
    render(<KhoiSoDuPhep danhSach={[quy2026]} homNay="2027-03-15" />);
    expect(screen.getByText(/sắp hết hạn/i)).toBeTruthy();
  });

  it('chưa có quỹ nào → nói rõ lý do, không hiện bảng rỗng', () => {
    render(<KhoiSoDuPhep danhSach={[]} homNay="2027-01-10" />);
    expect(screen.getByText(/chưa có quỹ phép/i)).toBeTruthy();
  });
});
