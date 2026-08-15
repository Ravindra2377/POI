import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(process.cwd(), "src/app/my-area/my-area.module.css"),
  "utf8",
);

describe("my-area responsive layout", () => {
  it("keeps the briefing grid responsive and stacks the area toolbar", () => {
    expect(stylesheet).toMatch(
      /\.briefing \{\s*display: grid;\s*gap: 18px;\s*grid-template-columns: repeat\(auto-fill, minmax\(240px, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /\.toolbar \{\s*grid-template-columns: 1fr;\s*\}/,
    );
    expect(stylesheet).toMatch(
      /\.briefing \{\s*grid-template-columns: 1fr;\s*\}/,
    );
  });
});
