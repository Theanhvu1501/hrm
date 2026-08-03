import { describe, it, expect } from "vitest";
import { buildPrintableDocument } from "../printHopDong";

describe("buildPrintableDocument", () => {
  it("bọc HTML đã ghép dữ liệu thành 1 document hoàn chỉnh có tiêu đề mặc định", () => {
    const out = buildPrintableDocument("<p>Nội dung</p>");
    expect(out).toContain("<!DOCTYPE html>");
    expect(out).toContain("<title>Hợp đồng lao động</title>");
    expect(out).toContain("<p>Nội dung</p>");
  });

  it("cho phép truyền tiêu đề riêng (vd theo số hợp đồng)", () => {
    const out = buildPrintableDocument("<p>x</p>", "HD0001");
    expect(out).toContain("<title>HD0001</title>");
  });
});
