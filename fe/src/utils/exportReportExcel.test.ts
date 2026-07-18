import { describe, it, expect } from "vitest";
import {
  leafCols,
  headerDepth,
  buildReportWorkbook,
  NUM_FMT,
  type ReportCol,
  type ReportSheet,
} from "./exportReportExcel";

const cols: ReportCol[] = [
  { key: "ten", header: "Tên" },
  {
    key: "dk",
    header: "Số dư đầu kỳ",
    children: [
      { key: "dkNo", header: "Nợ", numFmt: "#,##0" },
      { key: "dkCo", header: "Có", numFmt: "#,##0" },
    ],
  },
];

describe("exportReportExcel helpers", () => {
  it("leafCols flattens nested columns in order", () => {
    expect(leafCols(cols).map((c) => c.key)).toEqual(["ten", "dkNo", "dkCo"]);
  });

  it("headerDepth is 2 when any column has children", () => {
    expect(headerDepth(cols)).toBe(2);
    expect(headerDepth([{ key: "a", header: "A" }])).toBe(1);
  });
});

describe("buildReportWorkbook", () => {
  it("title merge, header gộp 2 tầng, số giữ numFmt và giá trị number", () => {
    const sheets: ReportSheet[] = [
      {
        name: "S1",
        title: "BÁO CÁO TEST",
        columns: [
          { key: "ten", header: "Tên", width: 20 },
          {
            key: "dk",
            header: "Số dư đầu kỳ",
            children: [
              { key: "no", header: "Nợ", numFmt: NUM_FMT },
              { key: "co", header: "Có", numFmt: NUM_FMT },
            ],
          },
        ],
        rows: [
          { cells: { ten: "A", no: 1000, co: 0 } },
          { cells: { ten: "Tổng", no: -5, co: 0 }, bold: true, fill: "total" },
        ],
      },
    ];
    const wb = buildReportWorkbook(sheets);
    const ws = wb.worksheets[0];
    expect(ws.name).toBe("S1");
    // Hàng 1 = title
    expect(ws.getCell("A1").value).toBe("BÁO CÁO TEST");
    // Hàng 2 trống (ngăn cách), hàng 3-4 header gộp; hàng 3 có nhóm "Số dư đầu kỳ"
    expect(ws.getCell("B3").value).toBe("Số dư đầu kỳ");
    expect(ws.getCell("B4").value).toBe("Nợ");
    // Hàng dữ liệu đầu tiên (hàng 5)
    expect(ws.getCell("A5").value).toBe("A");
    expect(ws.getCell("B5").value).toBe(1000);
    expect(ws.getCell("B5").numFmt).toBe(NUM_FMT);
    // Dòng tổng in đậm, số âm giữ nguyên number
    expect(ws.getCell("A6").font?.bold).toBe(true);
    expect(ws.getCell("B6").value).toBe(-5);
  });
});
