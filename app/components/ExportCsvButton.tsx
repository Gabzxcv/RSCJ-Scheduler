"use client";

// Downloads the rows it is given as a CSV that opens cleanly in Excel / Numbers.
// Text that starts with = + - @ is prefixed so a spreadsheet never runs it as a formula.
const safe = (value: string | number) => {
  const text = String(value ?? "");
  return /^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
};

export function ExportCsvButton({ headers, rows, filename, children = "Export CSV" }: { headers: string[]; rows: Array<Array<string | number>>; filename: string; children?: React.ReactNode }) {
  function download() {
    const csv = [headers, ...rows].map((row) => row.map((field) => `"${safe(field).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return <button type="button" className="button secondary" onClick={download}>{children}</button>;
}
