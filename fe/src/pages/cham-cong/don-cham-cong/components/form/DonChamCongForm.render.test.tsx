// @vitest-environment jsdom
/**
 * Khoá phần "form HR đổi trường theo loại đơn" của màn `/cham-cong/don-tu`.
 *
 * Test hàm thuần (donChamCongForm.convert.test.ts) chứng minh payload đúng khi
 * state đúng. Test này chứng minh nốt nửa còn lại: JSX thật sự vẽ ra đúng bộ ô
 * cho từng loại đơn, và bấm nút gửi thì cái payload đó đi tới service. Thiếu
 * nó thì `dungDtoQuanTri()` có thể hoàn hảo trong khi form vẫn không có ô
 * "Đến ngày" để HR nhập — đúng cái lỗ mà Task 5 mở ra khi thêm nghi_phep vào
 * LOAI_DON_OPTIONS.
 */
import React, { useEffect } from "react";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  DonChamCongHandlerProvider,
  useDonChamCongHandler,
} from "../../DonChamCongHandlerContext";
import { DonChamCongForm } from "./DonChamCongForm";
import {
  attendanceRequestService,
  AttendanceRequest,
} from "@/services/attendanceRequestService";

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

  // rc-select/rc-picker (nền của Select và DatePicker antd) đo lại vị trí
  // dropdown bằng ResizeObserver — jsdom không có, thiếu là component ném
  // ngay lúc mở dropdown.
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
    loaiDon: "giai_trinh",
    ngay: "2026-07-24",
    trangThai: "cho_duyet",
    isActive: true,
    ...over,
  };
}

/** Mở sẵn form với một đơn có sẵn (luồng "Sửa đơn" của bảng). */
function MoForm({ record }: { record: AttendanceRequest | null }) {
  const handler = useDonChamCongHandler();
  useEffect(() => {
    handler.executeEvent("openForm", record ? { record } : {});
  }, [handler, record]);
  return <DonChamCongForm />;
}

function moForm(record: AttendanceRequest | null) {
  return render(
    <DonChamCongHandlerProvider>
      <MoForm record={record} />
    </DonChamCongHandlerProvider>
  );
}

/** Nhãn ô — form dùng <label> rời (không htmlFor) nên tìm theo chữ. */
function coO(nhan: string): boolean {
  return screen.queryByText(nhan) !== null;
}

/**
 * Đổi Select antd theo nhãn lựa chọn hiển thị trong dropdown.
 *
 * Tìm trên `document` chứ không trên `container` của render(): Modal antd vẽ
 * nội dung qua portal nên toàn bộ form nằm ngoài container.
 */
function chonTrongSelect(viTri: number, nhan: string) {
  // antd v6 không còn class `.ant-select-selector` — gốc của mỗi Select là
  // `.ant-select`, và mouseDown lên nó là cách mở dropdown trong jsdom.
  const selectors = document.querySelectorAll(".ant-select");
  fireEvent.mouseDown(selectors[viTri]);
  const option = document.querySelector(
    `.ant-select-item-option[title="${nhan}"]`
  );
  if (!option) throw new Error(`Không thấy lựa chọn "${nhan}" trong dropdown`);
  fireEvent.click(option);
}

describe("Form HR — bộ trường theo loại đơn", () => {
  it("giải trình: không có Đến ngày / Buổi / Loại nghỉ", async () => {
    moForm(don({ loaiDon: "giai_trinh" }));

    await screen.findByText("Loại đơn");
    expect(coO("Đến ngày")).toBe(false);
    expect(coO("Buổi")).toBe(false);
    expect(coO("Loại nghỉ")).toBe(false);
    expect(coO("Giờ từ")).toBe(true);
  });

  it("nghỉ phép một ngày: có Đến ngày, Buổi, Loại nghỉ — không có Giờ", async () => {
    moForm(
      don({
        loaiDon: "nghi_phep",
        ngay: "2026-08-03",
        denNgay: "2026-08-03",
        loaiNghi: "phep_nam",
      })
    );

    await screen.findByText("Loại nghỉ");
    expect(coO("Đến ngày")).toBe(true);
    expect(coO("Buổi")).toBe(true);
    expect(coO("Giờ từ")).toBe(false);
    expect(coO("Giờ đến")).toBe(false);
  });

  it("nghỉ phép NHIỀU ngày: ẩn ô Buổi (nửa buổi của khoảng 3 ngày là vô nghĩa)", async () => {
    moForm(
      don({
        loaiDon: "nghi_phep",
        ngay: "2026-08-03",
        denNgay: "2026-08-05",
        loaiNghi: "phep_nam",
      })
    );

    await screen.findByText("Loại nghỉ");
    expect(coO("Đến ngày")).toBe(true);
    expect(coO("Buổi")).toBe(false);
  });

  it("nghỉ bù: có Đến ngày nhưng KHÔNG có Loại nghỉ", async () => {
    moForm(don({ loaiDon: "nghi_bu", ngay: "2026-08-03", denNgay: "2026-08-03" }));

    await screen.findByText("Đến ngày");
    expect(coO("Loại nghỉ")).toBe(false);
    expect(coO("Buổi")).toBe(true);
  });

  it("đổi loại đơn ngay trên form thì bộ ô đổi theo (không phải chỉ đúng lúc mở form)", async () => {
    moForm(don({ loaiDon: "giai_trinh" }));

    await screen.findByText("Loại đơn");
    expect(coO("Loại nghỉ")).toBe(false);

    // Select thứ 2 trên form: [0] Nhân viên, [1] Loại đơn.
    chonTrongSelect(1, "Nghỉ phép");

    await waitFor(() => expect(coO("Loại nghỉ")).toBe(true));
    expect(coO("Đến ngày")).toBe(true);
    expect(coO("Giờ từ")).toBe(false);
  });
});

describe("Form HR — payload gửi lên backend", () => {
  it("sửa đơn nghỉ phép: DTO có denNgay/loaiNghi, KHÔNG có gioTu/gioDen", async () => {
    const update = vi
      .spyOn(attendanceRequestService, "update")
      .mockResolvedValue(don());

    moForm(
      don({
        id: "d-nghi",
        loaiDon: "nghi_phep",
        ngay: "2026-08-03",
        denNgay: "2026-08-05",
        loaiNghi: "phep_nam",
        lyDo: "Về quê",
        // Giờ sót lại từ một lần đơn này còn là OT — không được gửi lại lên.
        gioTu: "18:00",
        gioDen: "20:00",
      })
    );

    fireEvent.click(await screen.findByRole("button", { name: "Cập nhật" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0]).toBe("d-nghi");
    // toStrictEqual: toEqual coi { gioTu: undefined } bằng không có khoá đó,
    // trong khi backend forbidNonWhitelisted vẫn 400 khi thấy khoá thừa.
    expect(update.mock.calls[0][1]).toStrictEqual({
      employeeId: "nv1",
      loaiDon: "nghi_phep",
      ngay: "2026-08-03",
      denNgay: "2026-08-05",
      loaiNghi: "phep_nam",
      lyDo: "Về quê",
    });
  });

  it("đơn nghỉ thiếu loại nghỉ thì chặn tại FE, KHÔNG gọi service", async () => {
    const update = vi
      .spyOn(attendanceRequestService, "update")
      .mockResolvedValue(don());

    moForm(don({ loaiDon: "nghi_phep", ngay: "2026-08-03", lyDo: "x" }));

    fireEvent.click(await screen.findByRole("button", { name: "Cập nhật" }));

    expect(await screen.findByText("Vui lòng chọn loại nghỉ")).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it("đơn OT KHÔNG bị chặn bởi loại nghỉ còn sót trong state khi HR đổi loại đơn", async () => {
    // Kịch bản kẹt cứng: mở đơn nghỉ phép (chưa chọn loại nghỉ) → đổi sang
    // Làm thêm giờ. Ô "Loại nghỉ" biến mất nhưng luật kiểm tra của nó vẫn còn
    // trong react-hook-form; không có guard `co("loaiNghi")` thì HR bị chặn
    // bởi một câu lỗi trỏ tới ô không còn trên màn hình.
    const update = vi
      .spyOn(attendanceRequestService, "update")
      .mockResolvedValue(don());

    moForm(don({ loaiDon: "nghi_phep", ngay: "2026-08-03", lyDo: "x" }));

    await screen.findByText("Loại nghỉ");
    chonTrongSelect(1, "Làm thêm giờ");
    await waitFor(() => expect(coO("Giờ từ")).toBe(true));

    // Điền giờ để qua luật riêng của đơn OT. [0] là ô Ngày, [1]/[2] là hai ô giờ.
    const timeInputs = document.querySelectorAll(".ant-picker input");
    fireEvent.change(timeInputs[1], { target: { value: "18:00" } });
    fireEvent.keyDown(timeInputs[1], { key: "Enter", keyCode: 13 });
    fireEvent.change(timeInputs[2], { target: { value: "20:00" } });
    fireEvent.keyDown(timeInputs[2], { key: "Enter", keyCode: 13 });

    fireEvent.click(screen.getByRole("button", { name: "Cập nhật" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Vui lòng chọn loại nghỉ")).toBeNull();
    expect(update.mock.calls[0][1]).toStrictEqual({
      employeeId: "nv1",
      loaiDon: "lam_them_gio",
      ngay: "2026-08-03",
      gioTu: "18:00",
      gioDen: "20:00",
      lyDo: "x",
    });
  });
});
