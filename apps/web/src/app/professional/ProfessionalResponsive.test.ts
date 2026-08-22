import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(
  resolve(process.cwd(), "src/app/professional/professional.module.css"),
  "utf8",
);

describe("professional offering responsive layout", () => {
  it("uses three-column desktop grids and stacks them on smaller screens", () => {
    expect(stylesheet).toMatch(
      /\.audienceGrid,\s*\.offerGrid \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 800px\) \{[\s\S]*?\.audienceGrid,[\s\S]*?\.offerGrid,[\s\S]*?\.trustLayout \{\s*grid-template-columns: 1fr;/,
    );
  });
});
