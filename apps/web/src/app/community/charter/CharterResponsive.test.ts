import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(process.cwd(), "src/app/community/charter/charter.module.css"),
  "utf8",
);

describe("charter responsive layout", () => {
  it("stacks evidence and rule cards on small screens", () => {
    expect(stylesheet).toMatch(
      /\.classGrid \{\s*display: grid;\s*gap: 16px;\s*grid-template-columns: repeat\(auto-fill, minmax\(240px, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /\.ruleGrid \{\s*display: grid;\s*gap: 16px;\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /\.ruleGrid \{\s*grid-template-columns: 1fr;\s*\}/,
    );
    expect(stylesheet).toMatch(
      /\.classGrid \{\s*grid-template-columns: 1fr;\s*\}/,
    );
  });
});
