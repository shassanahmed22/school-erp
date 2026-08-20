/**
 * Lightweight, dependency-free export helpers. CSV is plain text; "Excel" export
 * uses the SpreadsheetML XML format (.xls) which Excel opens natively without
 * needing the `xlsx` package.
 */

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const lines = [headers.map(escapeCsvValue).join(","), ...rows.map((row) => row.map(escapeCsvValue).join(","))];
  triggerDownload(lines.join("\r\n"), `${filename}.csv`, "text/csv;charset=utf-8;");
}

function escapeXml(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function exportToExcel(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const headerRow = `<Row>${headers.map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>`;
  const dataRows = rows
    .map((row) => {
      const cells = row
        .map((cell) => {
          const isNumber = typeof cell === "number";
          return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeXml(cell)}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Sheet1">
  <Table>${headerRow}${dataRows}</Table>
 </Worksheet>
</Workbook>`;

  triggerDownload(xml, `${filename}.xls`, "application/vnd.ms-excel");
}
