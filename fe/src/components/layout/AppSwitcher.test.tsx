// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUrl = vi.fn<[], string>();
vi.mock("@/services/identitySession", () => ({
  urlManChonUngDung: () => mockUrl(),
}));

const { AppSwitcher } = await import("./AppSwitcher");

describe("AppSwitcher", () => {
  beforeEach(() => mockUrl.mockReset());

  it("là lối về màn chọn ứng dụng của portal, không mở modal tại chỗ", () => {
    mockUrl.mockReturnValue("https://masterceo.com.vn/");
    render(<AppSwitcher />);

    const link = screen.getByRole("link", { name: /Chọn ứng dụng/i });
    expect(link.getAttribute("href")).toBe("https://masterceo.com.vn/");
  });

  it("không hiện gì khi chưa cấu hình identity (dev chạy đăng nhập cục bộ)", () => {
    mockUrl.mockReturnValue("");
    const { container } = render(<AppSwitcher />);

    expect(container.innerHTML).toBe("");
  });
});
