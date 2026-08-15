import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(process.cwd(), "src/app/public-money/public-money.module.css"),
  "utf8",
);

describe("public-money responsive layout", () => {
  it("collapses filter, record, detail and claim grids", () => {
    expect(stylesheet).toMatch(/@media \(max-width: 800px\)/);
    expect(stylesheet).toMatch(
      /\.records > li,\s*\.detailGrid \{\s*grid-template-columns: 1fr;/,
    );
    expect(stylesheet).toMatch(/@media \(max-width: 520px\)/);
    expect(stylesheet).toMatch(
      /\.filters,\s*\.claimGrid \{\s*grid-template-columns: 1fr;/,
    );
  });
});
