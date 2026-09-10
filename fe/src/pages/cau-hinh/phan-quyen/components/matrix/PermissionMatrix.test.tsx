// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { render, act, fireEvent } from "@testing-library/react";
import {
  PhanQuyenHandlerProvider,
  usePhanQuyenHandler,
} from "../../PhanQuyenHandlerContext";
import type { PhanQuyenHandler } from "../../phanQuyenHandler";
import { PermissionMatrix } from "./PermissionMatrix";
import { permissionModules } from "../../constants/permissionModules";
import {
  convertPermissionsToMatrix,
  collectLeafModules,
  type ModulePermission,
} from "../../utils/permissionConverter";

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
      dispatchEvent() {
        return false;
      },
    }));
});

/** Phân hệ "Cấu hình" — nhóm cấp 1 nhỏ nhất, 3 khoá con, khai tay nên ổn định. */
const NHOM = permissionModules.find((m) => m.key === "cau-hinh")!;
const KHOA_CON = collectLeafModules([NHOM]);

/**
 * Phải nạp permissions SAU khi bảng mount xong — `useChandlerState` chỉ nghe
 * thay đổi từ lúc đăng ký (useEffect), set sớm hơn thì component giữ mặc định.
 */
const renderMaTran = (quyen: string[] = []) => {
  let handler: PhanQuyenHandler | null = null;
  const Capture = () => {
    handler = usePhanQuyenHandler();
    return null;
  };

  const result = render(
    <PhanQuyenHandlerProvider>
      <Capture />
      <PermissionMatrix />
    </PhanQuyenHandlerProvider>,
  );

  act(() => {
    handler!.setState("permissions", convertPermissionsToMatrix(quyen));
  });

  return { ...result, handler: handler! };
};

/** Hàng của một nhóm, tìm theo nhãn ở ô đầu tiên. */
const hangCua = (container: HTMLElement, nhan: string): HTMLTableRowElement => {
  const hang = [...container.querySelectorAll("tbody tr")].find(
    (tr) => tr.querySelector("td")?.textContent === nhan,
  );
  return hang as HTMLTableRowElement;
};

const oTick = (hang: HTMLTableRowElement): HTMLInputElement[] =>
  [...hang.querySelectorAll<HTMLInputElement>("input[type=checkbox]")];

const quyenCua = (handler: PhanQuyenHandler, khoa: string): ModulePermission =>
  (handler.getState("permissions") as ModulePermission[]).find(
    (p) => p.moduleKey === khoa,
  )!;

describe("PermissionMatrix — tick cả nhóm", () => {
  it("hàng tiêu đề nhóm có đủ ô tick như hàng cha", () => {
    const { container } = renderMaTran();
    const hang = hangCua(container, NHOM.label);

    expect(hang).toBeTruthy();
    // 1 ô "Tất cả" + 5 ô hành động
    expect(oTick(hang)).toHaveLength(6);
    expect(hang.querySelectorAll("td")).toHaveLength(7);
  });

  it("tick ô Tất cả của nhóm bật hết khoá con", () => {
    const { container, handler } = renderMaTran();
    const hang = hangCua(container, NHOM.label);

    act(() => {
      fireEvent.click(oTick(hang)[0]);
    });

    for (const khoa of KHOA_CON) {
      const q = quyenCua(handler, khoa);
      expect(Object.values(q.actions).every(Boolean)).toBe(true);
    }
  });

  it("bỏ tick ô Tất cả của nhóm tắt hết khoá con", () => {
    const daBatHet = KHOA_CON.flatMap((k) =>
      ["xem", "them", "sua", "xoa", "xuat"].map((a) => `${k}:${a}`),
    );
    const { container, handler } = renderMaTran(daBatHet);
    const hang = hangCua(container, NHOM.label);

    expect(oTick(hang)[0].checked).toBe(true);

    act(() => {
      fireEvent.click(oTick(hang)[0]);
    });

    for (const khoa of KHOA_CON) {
      const q = quyenCua(handler, khoa);
      expect(Object.values(q.actions).some(Boolean)).toBe(false);
    }
  });

  it("chỉ một phần con được bật thì ô nhóm ở trạng thái nửa vời", () => {
    const { container } = renderMaTran([`${KHOA_CON[0]}:xem`]);
    const hang = hangCua(container, NHOM.label);

    const oTatCa = hang.querySelectorAll(".ant-checkbox")[0];
    expect(oTatCa.classList.contains("ant-checkbox-indeterminate")).toBe(true);
    expect(oTick(hang)[0].checked).toBe(false);
  });

  it("tick một cột hành động của nhóm chỉ bật đúng hành động đó", () => {
    const { container, handler } = renderMaTran();
    const hang = hangCua(container, NHOM.label);

    act(() => {
      fireEvent.click(oTick(hang)[1]); // cột "Xem"
    });

    for (const khoa of KHOA_CON) {
      const q = quyenCua(handler, khoa);
      expect(q.actions.xem).toBe(true);
      expect(q.actions.them).toBe(false);
    }
  });
});
