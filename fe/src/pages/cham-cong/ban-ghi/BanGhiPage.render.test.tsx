// @vitest-environment jsdom
/**
 * Màn `/cham-cong/ban-ghi` phải render được — tái hiện lỗi trắng màn hình.
 */
import React from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { hoTen: "Trần Thị HR" },
    hasPermission: () => true,
  }),
}));

import BanGhiPage from "./BanGhiPage";
import {
  attendanceRecordService,
  AttendanceRecord,
} from "@/services/attendanceRecordService";
import { employeeService } from "@/services/employeeService";

function banGhi(over: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: "b1",
    employeeId: "nv1",
    employeeName: "Nguyễn Văn A",
    employeeCode: "NV001",
    ngay: "2026-07-30",
    loai: "vao",
    thoiDiem: "2026-07-30T01:05:00.000Z",
    ngoaiVung: false,
    soPhutDiMuon: 0,
    soPhutVeSom: 0,
    laNgayNghi: false,
    nguonTao: "tu_cham",
    ...over,
  };
}

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

describe("Màn bản ghi chấm công", () => {
  it("render được tiêu đề trang", async () => {
    vi.spyOn(attendanceRecordService, "getList").mockResolvedValue([]);
    vi.spyOn(employeeService, "getList").mockResolvedValue([]);

    render(<BanGhiPage />);

    expect(await screen.findByText("Bản ghi chấm công")).toBeTruthy();
  });

  it("bản ghi tự chấm có toạ độ vẫn render", async () => {
    vi.spyOn(attendanceRecordService, "getList").mockResolvedValue([
      banGhi({ latitude: 10.77, longitude: 106.7, khoangCachMet: 12 }),
    ]);
    vi.spyOn(employeeService, "getList").mockResolvedValue([]);

    render(<BanGhiPage />);
    expect(await screen.findByText("Nguyễn Văn A (NV001)")).toBeTruthy();
  });

  it("bản ghi HR nhập bù (không toạ độ) vẫn render", async () => {
    vi.spyOn(attendanceRecordService, "getList").mockResolvedValue([
      banGhi({ nguonTao: "hr_nhap" }),
    ]);
    vi.spyOn(employeeService, "getList").mockResolvedValue([]);

    render(<BanGhiPage />);
    expect(await screen.findByText("Nguyễn Văn A (NV001)")).toBeTruthy();
  });

  it("bản ghi backend trả toạ độ null vẫn render", async () => {
    vi.spyOn(attendanceRecordService, "getList").mockResolvedValue([
      banGhi({
        latitude: null as unknown as number,
        longitude: null as unknown as number,
        khoangCachMet: null as unknown as number,
      }),
    ]);
    vi.spyOn(employeeService, "getList").mockResolvedValue([]);

    render(<BanGhiPage />);
    expect(await screen.findByText("Nguyễn Văn A (NV001)")).toBeTruthy();
  });
});
