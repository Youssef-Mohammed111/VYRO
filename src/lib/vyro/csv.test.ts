import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { csvCell, toCsv } from "./csv.ts";

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    assert.equal(csvCell("a,b"), '"a,b"');
    assert.equal(csvCell('say "hi"'), '"say ""hi"""');
    assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
    assert.equal(csvCell(null), "");
    assert.equal(csvCell(42), "42");
  });
  it("neutralises spreadsheet formulas", () => {
    assert.equal(csvCell("=HYPERLINK(\"http://x\")"), `"'=HYPERLINK(""http://x"")"`);
    assert.equal(csvCell("+1+1"), "'+1+1");
    assert.equal(csvCell("@SUM(A1)"), "'@SUM(A1)");
    assert.equal(csvCell("-5"), "'-5");
    assert.equal(csvCell("normal"), "normal");
  });
  it("builds a BOM-prefixed CRLF document", () => {
    const out = toCsv(["a", "b"], [[1, "x,y"]]);
    assert.ok(out.startsWith("\uFEFFa,b\r\n"));
    assert.ok(out.endsWith('1,"x,y"\r\n'));
  });
  it("serialises dates as ISO strings", () => {
    assert.equal(csvCell(new Date("2026-01-01T00:00:00Z")), "2026-01-01T00:00:00.000Z");
  });
});
