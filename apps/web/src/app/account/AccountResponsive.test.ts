import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(process.cwd(), "src/app/account/account.module.css"),
  "utf8",
);

describe("account responsive layout", () => {
  it("keeps the report grid responsive and stacks consent and report lists", () => {
    expect(stylesheet).toMatch(
      /\.reportGrid \{\s*display: grid;\s*gap: 18px;\s*grid-template-columns: repeat\(auto-fill, minmax\(240px, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /\.consentList \{\s*grid-template-columns: 1fr;\s*\}/,
    );
    expect(stylesheet).toMatch(
      /\.reportGrid \{\s*grid-template-columns: 1fr;\s*\}/,
    );
  });
});
