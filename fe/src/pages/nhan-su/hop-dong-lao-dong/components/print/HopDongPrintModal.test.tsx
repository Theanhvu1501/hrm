// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { HopDongPrintModal } from "./HopDongPrintModal";
import { hopDongTemplateService } from "@/services/hopDongTemplateService";
import * as sangExcel from "../../lib/hopDongSangExcel";

const DS_MAU = [
  { id: "m1", ten: "Thử việc", html: "<p>A</p>" },
  { id: "m2", ten: "Chính thức", html: "<p>B</p>" },
];

function mockDichVu() {
  vi.spyOn(hopDongTemplateService, "dsMauIn").mockResolvedValue(DS_MAU);
  return vi
    .spyOn(hopDongTemplateService, "render")
    .mockResolvedValue({ html: "<p>Bản in</p>", canhBao: [] });
}

beforeEach(() => {
  // antd Select đo kích thước bằng ResizeObserver, jsdom không có sẵn.
  (globalThis as any).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => vi.restoreAllMocks());

describe("HopDongPrintModal — chọn mẫu in", () => {
  it("lần mở đầu render bằng mẫu ĐẦU danh sách, khớp thứ dropdown đang hiện", async () => {
    // Nếu FE hiện tên mẫu 1 mà lại render bằng mẫu khác thì người dùng in ra
    // một đằng đọc trên màn hình một nẻo — chỉ phát hiện sau khi đã ký.
    const render_ = mockDichVu();

    render(<HopDongPrintModal open contractId="hd1" onClose={() => {}} />);

    await waitFor(() =>
      expect(render_).toHaveBeenCalledWith("hd1", "m1"),
    );
  });

  it("đổi mẫu → gọi lại render với đúng mauInId mới", async () => {
    const render_ = mockDichVu();

    render(<HopDongPrintModal open contractId="hd1" onClose={() => {}} />);
    await waitFor(() => expect(render_).toHaveBeenCalled());

    // Dropdown chỉ hiện sau khi danh sách mẫu nạp xong.
    await screen.findByText("Mẫu in:");
    // Modal của antd render trong portal ở document.body, KHÔNG nằm trong
    // `container` mà render() trả về — tìm theo container là null.
    // Select mở bằng mousedown, không phải click. Class là `.ant-select-content`
    // — antd 6 đổi tên khỏi `.ant-select-selector` của antd 5.
    fireEvent.mouseDown(document.querySelector(".ant-select-content")!);
    fireEvent.click(await screen.findByTitle("Chính thức"));

    await waitFor(() => expect(render_).toHaveBeenCalledWith("hd1", "m2"));
  });

  it("chỉ một mẫu thì KHÔNG hiện dropdown — không bắt chọn khi không có gì để chọn", async () => {
    vi.spyOn(hopDongTemplateService, "dsMauIn").mockResolvedValue([DS_MAU[0]]);
    vi.spyOn(hopDongTemplateService, "render").mockResolvedValue({
      html: "<p>Bản in</p>",
      canhBao: [],
    });

    render(<HopDongPrintModal open contractId="hd1" onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText("In")).toBeTruthy());
    expect(screen.queryByText("Mẫu in:")).toBeNull();
  });

  it("lỗi tải danh sách mẫu KHÔNG chặn in — vẫn render bằng mẫu mặc định của BE", async () => {
    vi.spyOn(hopDongTemplateService, "dsMauIn").mockRejectedValue(
      new Error("mạng hỏng"),
    );
    const render_ = vi
      .spyOn(hopDongTemplateService, "render")
      .mockResolvedValue({ html: "<p>Bản in</p>", canhBao: [] });

    render(<HopDongPrintModal open contractId="hd1" onClose={() => {}} />);

    await waitFor(() => expect(render_).toHaveBeenCalledWith("hd1", undefined));
  });
});

describe("HopDongPrintModal — xuất Excel", () => {
  it("tên file mang cả số hợp đồng lẫn tên mẫu (in nhiều dạng không đè file nhau)", async () => {
    mockDichVu();
    const xuat = vi
      .spyOn(sangExcel, "xuatHopDongRaExcel")
      .mockImplementation(() => {});

    render(
      <HopDongPrintModal
        open
        contractId="hd1"
        contractLabel="HD0001"
        onClose={() => {}}
      />,
    );

    await waitFor(() => expect(screen.getByText("Xuất Excel")).toBeTruthy());
    fireEvent.click(screen.getByText("Xuất Excel"));

    expect(xuat).toHaveBeenCalledWith("<p>Bản in</p>", "HD0001 - Thử việc");
  });
});
