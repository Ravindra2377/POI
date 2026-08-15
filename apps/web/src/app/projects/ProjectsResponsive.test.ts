import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(process.cwd(), "src/app/projects/projects.module.css"),
  "utf8",
);

describe("projects responsive layout", () => {
  it("collapses project, detail, filter and timeline grids", () => {
    expect(stylesheet).toMatch(/@media \(max-width: 800px\)/);
    expect(stylesheet).toMatch(
      /\.records > li,\s*\.detailGrid \{\s*grid-template-columns: 1fr;/,
    );
    expect(stylesheet).toMatch(/@media \(max-width: 520px\)/);
    expect(stylesheet).toMatch(
      /\.timeline div \{\s*grid-template-columns: 1fr;/,
    );
  });
});
