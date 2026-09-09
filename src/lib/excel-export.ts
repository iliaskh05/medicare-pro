import ExcelJS from "exceljs";

export type ExcelColumn = {
  header: string;
  key: string;
  width?: number;
  /** date | currency | number | text | percent */
  format?: "date" | "currency" | "number" | "text" | "percent";
  wrap?: boolean;
};

export type ExcelSheetSpec = {
  name: string;
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
};

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E3A5F" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  name: "Calibri",
  size: 11,
};

const BODY_FONT: Partial<ExcelJS.Font> = {
  name: "Calibri",
  size: 11,
};

function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function applyCellFormat(cell: ExcelJS.Cell, format: ExcelColumn["format"], value: unknown) {
  if (value == null || value === "") {
    cell.value = "";
    return;
  }
  switch (format) {
    case "currency": {
      const n = typeof value === "number" ? value : Number(value);
      cell.value = Number.isFinite(n) ? n : String(value);
      cell.numFmt = '#,##0.00 "MAD"';
      break;
    }
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      cell.value = Number.isFinite(n) ? n : String(value);
      cell.numFmt = "#,##0.##";
      break;
    }
    case "percent": {
      const n = typeof value === "number" ? value : Number(value);
      cell.value = Number.isFinite(n) ? n : String(value);
      cell.numFmt = "0.0%";
      break;
    }
    case "date": {
      if (value instanceof Date) {
        cell.value = value;
        cell.numFmt = "dd/mm/yyyy hh:mm";
      } else if (typeof value === "string" && value.trim()) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          cell.value = parsed;
          cell.numFmt = "dd/mm/yyyy hh:mm";
        } else {
          cell.value = value;
        }
      } else {
        cell.value = String(value);
      }
      break;
    }
    default:
      cell.value = typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}

/** Build a professional multi-sheet workbook and trigger download. */
export async function downloadExcelWorkbook(options: {
  filename: string;
  sheets: ExcelSheetSpec[];
}): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MediCare Pro";
  workbook.created = new Date();

  for (const sheet of options.sheets) {
    const safeName = sheet.name.replace(/[\\/*?:[\]]/g, " ").slice(0, 31) || "Feuille";
    const ws = workbook.addWorksheet(safeName, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    ws.columns = sheet.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width ?? Math.max(12, Math.min(40, col.header.length + 4)),
    }));

    const headerRow = ws.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FF0F2744" } },
      };
    });

    for (const row of sheet.rows) {
      const values = sheet.columns.map((col) => row[col.key] ?? "");
      const excelRow = ws.addRow(values);
      excelRow.font = BODY_FONT;
      excelRow.eachCell((cell, colNumber) => {
        const col = sheet.columns[colNumber - 1];
        if (!col) return;
        applyCellFormat(cell, col.format ?? "text", row[col.key]);
        cell.alignment = {
          vertical: "middle",
          wrapText: Boolean(col.wrap),
        };
        if (excelRow.number % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF5F7FA" },
          };
        }
      });
    }

    // Auto-widen based on content (capped)
    sheet.columns.forEach((col, idx) => {
      if (col.width) return;
      let max = col.header.length;
      for (const row of sheet.rows) {
        const v = row[col.key];
        const len = v == null ? 0 : String(v).length;
        if (len > max) max = len;
      }
      const column = ws.getColumn(idx + 1);
      column.width = Math.min(45, Math.max(12, max + 2));
    });

    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = options.filename.endsWith(".xlsx")
    ? options.filename
    : `${options.filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function excelFilename(prefix: string, date = todayStamp()): string {
  const clean = prefix.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/g, "");
  return `${clean}_${date}.xlsx`;
}

export { todayStamp };
