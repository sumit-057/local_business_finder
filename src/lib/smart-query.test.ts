import { describe, expect, it } from "vitest";
import { parseSmartQuery } from "./smart-query";
import { CATEGORIES } from "./categories";

describe("parseSmartQuery", () => {
  it("extracts a Category when the '<category> in <place>' pattern matches", () => {
    const parsed = parseSmartQuery("salon in Pune");
    expect(parsed.category?.key).toBe("salon");
    expect(parsed.placePhrase).toBe("Pune");
    expect(parsed.searchText).toBe("salon in Pune");
  });

  it("matches plural and alias forms", () => {
    expect(parseSmartQuery("gyms in Austin").category?.key).toBe("gym");
    expect(parseSmartQuery("coffee shop in Berlin").category?.key).toBe("cafe");
  });

  it("falls back to verbatim when the pattern does not match", () => {
    const parsed = parseSmartQuery("weird free text query");
    expect(parsed.category).toBeNull();
    expect(parsed.searchText).toBe("weird free text query");
    expect(parseSmartQuery("in").searchText).toBe("in");
  });

  it("never invents categories outside the table", () => {
    expect(parseSmartQuery("unicorn in Pune").category).toBeNull();
    expect(CATEGORIES.length).toBeGreaterThan(3);
  });
});
