import { describe, expect, it } from "vitest";
import { CATEGORIES, findCategoryByKey } from "./categories";

describe("Category table OSM tag mapping", () => {
  it("gives every Category at least one OSM tag", () => {
    for (const c of CATEGORIES) {
      expect(c.osmTags.length, `${c.key} has no osmTags`).toBeGreaterThan(0);
    }
  });

  it("every tag is a well-formed key=value pair", () => {
    for (const c of CATEGORIES) {
      for (const tag of c.osmTags) {
        expect(tag).toMatch(/^[a-z_]+=[a-z_]+$/);
      }
    }
  });

  it("salon maps to both hairdresser and beauty shops", () => {
    expect(findCategoryByKey("salon")?.osmTags).toEqual([
      "shop=hairdresser",
      "shop=beauty",
    ]);
  });

  it("resolves keys and ignores unknown ones", () => {
    expect(findCategoryByKey("gym")?.label).toBe("Gym");
    expect(findCategoryByKey("unicorn")).toBeNull();
  });
});
