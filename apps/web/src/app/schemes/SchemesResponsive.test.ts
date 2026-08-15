import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(process.cwd(), "src/app/schemes/schemes.module.css"),
  "utf8",
);

describe("schemes responsive layout", () => {
  it("collapses directory and detail grids at tablet and mobile widths", () => {
    expect(stylesheet).toMatch(/@media \(max-width: 780px\)/);
    expect(stylesheet).toMatch(
      /\.records > li,\s*\.detailGrid \{\s*grid-template-columns: 1fr;/,
    );
    expect(stylesheet).toMatch(/@media \(max-width: 520px\)/);
    expect(stylesheet).toMatch(
      /\.filters,\s*\.claimGrid \{\s*grid-template-columns: 1fr;/,
    );
  });
});
