// @vitest-environment jsdom
import { describe, it, beforeAll, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PhieuListPage } from "../PhieuListPage";
import { PHIEU_CONFIG } from "../phieuConfig";

// Trang in (usePrintPhieu) đọc tenant qua useAuth; mock để test mount độc lập.
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ currentTenant: { tenantName: "Test Co" } }),
}));

beforeAll(() => {
  // Radix/antd browser API stubs
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
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  // jsdom lacks these used by Radix
  (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView =
    () => {};
  (
    Element.prototype as unknown as { hasPointerCapture: () => boolean }
  ).hasPointerCapture = () => false;
  (
    Element.prototype as unknown as { releasePointerCapture: () => void }
  ).releasePointerCapture = () => {};
});

describe("PhieuListPage client mount", () => {
  it("mounts without throwing", () => {
    render(
      <MemoryRouter>
        <PhieuListPage config={PHIEU_CONFIG.PHIEU_THU} />
      </MemoryRouter>,
    );
  });
});
