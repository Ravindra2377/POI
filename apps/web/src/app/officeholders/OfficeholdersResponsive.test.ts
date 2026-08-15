import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(process.cwd(), "src/app/officeholders/officeholders.module.css"),
  "utf8",
);

describe("officeholders responsive layout", () => {
  it("collapses filter, record, detail, claim and term-note grids", () => {
    expect(stylesheet).toMatch(/@media \(max-width: 800px\)/);
    expect(stylesheet).toMatch(
      /\.records > li,\s*\.detailGrid \{\s*grid-template-columns: 1fr;/,
    );
    expect(stylesheet).toMatch(/@media \(max-width: 520px\)/);
    expect(stylesheet).toMatch(
      /\.filters,\s*\.claimGrid \{\s*grid-template-columns: 1fr;/,
    );
    expect(stylesheet).toMatch(
      /\.termNotes li \{\s*grid-template-columns: 1fr;/,
    );
  });
});
