/**
 * CSV export helpers (pure).
 *  - RFC 4180 quoting
 *  - formula-injection guard: cells starting with = + - @ (or tab/CR) are prefixed
 *    with an apostrophe so Excel / Sheets never execute customer-typed text.
 *  - UTF-8 BOM so Excel opens Arabic text correctly.
 */

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
