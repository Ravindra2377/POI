import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(process.cwd(), "src/app/ingestion/ingestion.module.css"),
  "utf8",
);

describe("ingestion responsive layout", () => {
  it("collapses feed cards and observation tiles at tablet and mobile widths", () => {
    expect(stylesheet).toMatch(/@media \(max-width: 800px\)/);
    expect(stylesheet).toMatch(/\.feeds > li \{\s*grid-template-columns: 1fr;/);
    expect(stylesheet).toMatch(/@media \(max-width: 560px\)/);
    expect(stylesheet).toMatch(/\.feeds dl \{\s*grid-template-columns: 1fr;/);
  });
});
