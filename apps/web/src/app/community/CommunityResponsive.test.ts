import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(process.cwd(), "src/app/community/community.module.css"),
  "utf8",
);

describe("community responsive layout", () => {
  it("stacks participation, disclosure and readiness panels on small screens", () => {
    expect(stylesheet).toMatch(
      /\.participationGrid \{\s*display: grid;\s*gap: 16px;\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /\.readinessGrid \{\s*display: grid;\s*gap: 16px;\s*grid-template-columns: repeat\(auto-fill, minmax\(240px, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /\.disclosureList \{\s*grid-template-columns: 1fr;\s*\}/,
    );
    expect(stylesheet).toMatch(
      /\.readinessGrid \{\s*grid-template-columns: 1fr;\s*\}/,
    );
  });
});
