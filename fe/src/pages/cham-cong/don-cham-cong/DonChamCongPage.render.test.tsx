// @vitest-environment jsdom
/**
 * Bảng đơn HR `/cham-cong/don-tu` — hai thứ người duyệt đọc trước khi bấm
 * Duyệt (khoảng ngày nghỉ và số liệu backend tính) và một thứ họ phải đọc
 * được khi bấm hỏng (câu lỗi từ backend).
 */
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// usePagePermission đọc quyền qua useAuth — mock để bảng hiện đủ nút, thay vì
// dựng cả AuthProvider + token giả cho một test về nội dung bảng.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { hoTen: "Trần Thị HR" },
    hasPermission: () => true,
  }),
}));

import DonChamCongPage from "./DonChamCongPage";
import {
  attendanceRequestService,
  AttendanceRequest,
} from "@/services/attendanceRequestService";
import { employeeService } from "@/services/employeeService";
import { ApiError, ApiErrorType } from "@/config/api";

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

afterEach(() => {
  vi.restoreAllMocks();
});

function don(over: Partial<AttendanceRequest> = {}): AttendanceRequest {
  return {
    id: "d1",
    employeeId: "nv1",
    employeeName: "Nguyễn Văn A",
    loaiDon: "giai_trinh",
    ngay: "2026-08-03",
    trangThai: "cho_duyet",
    isActive: true,
    ...over,
  };
}

function moBang(ds: AttendanceRequest[]) {
  vi.spyOn(attendanceRequestService, "getList").mockResolvedValue(ds);
  vi.spyOn(employeeService, "getList").mockResolvedValue([]);
  return render(<DonChamCongPage />);
}

describe("Bảng đơn HR — số liệu trước khi duyệt", () => {
  it("đơn nghỉ nhiều ngày: hiện cả khoảng ngày và số ngày nghỉ", async () => {
    moBang([
      don({
        loaiDon: "nghi_phep",
        ngay: "2026-08-03",
        denNgay: "2026-08-05",
        loaiNghi: "phep_nam",
        soNgayNghi: 3,
      }),
    ]);

    expect(await screen.findByText("2026-08-03 → 2026-08-05")).toBeTruthy();
    expect(screen.getByText("3 ngày nghỉ")).toBeTruthy();
    expect(screen.getByText("Phép năm")).toBeTruthy();
  });

  it("đơn OT 0 giờ vẫn hiện '0 giờ × 1.5' — không được nuốt số 0", async () => {
    moBang([
      don({
        loaiDon: "lam_them_gio",
        gioTu: "18:00",
        gioDen: "18:00",
        soGioOt: 0,
        heSoOt: 1.5,
      }),
    ]);

    expect(await screen.findByText("0 giờ × 1.5")).toBeTruthy();
  });
});

describe("Bảng đơn HR — duyệt đơn", () => {
  it("backend từ chối (tự duyệt đơn của chính mình) thì HR đọc được nguyên văn", async () => {
    moBang([don({ trangThai: "cho_duyet" })]);
    vi.spyOn(attendanceRequestService, "updateStatus").mockRejectedValue(
      new ApiError(
        "Không thể tự duyệt đơn của chính mình",
        ApiErrorType.SERVER_ERROR,
        403,
        {
          response: {
            status: 403,
            data: {
              success: false,
              error: {
                message: "Không thể tự duyệt đơn của chính mình",
                code: "KHONG_TU_DUYET_DON",
              },
            },
          },
        }
      )
    );

    fireEvent.click(await screen.findByRole("button", { name: /Duyệt/ }));

    // Phải hiện lên màn hình — không được chỉ nằm trong console.error, vì HR
    // sẽ tưởng mình vừa duyệt xong.
    await waitFor(() =>
      expect(
        screen.getByText("Không thể tự duyệt đơn của chính mình")
      ).toBeTruthy()
    );
  });
});
