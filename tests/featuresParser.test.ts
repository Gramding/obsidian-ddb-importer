import { describe, it, expect } from "vitest";
import { parseFeatures } from "../src/featuresParser";

function baseData(overrides: Record<string, any> = {}): any {
  return {
    classes: [],
    race: { fullName: "Human", racialTraits: [] },
    feats: [],
    background: null,
    ...overrides,
  };
}

function classEntry(
  name: string,
  level: number,
  features: Array<{ name: string; requiredLevel?: number; description?: string }>,
  subclass?: { name: string; features: Array<{ name: string; requiredLevel?: number; description?: string }> }
): any {
  return {
    level,
    definition: {
      name,
      classFeatures: features.map(f => ({
        name: f.name,
        requiredLevel: f.requiredLevel ?? 1,
        description: f.description ?? "",
      })),
    },
    subclassDefinition: subclass
      ? {
          name: subclass.name,
          classFeatures: subclass.features.map(f => ({
            name: f.name,
            requiredLevel: f.requiredLevel ?? 1,
            description: f.description ?? "",
          })),
        }
      : null,
  };
}

// ─────────────────────────────────────────────
// Sources
// ─────────────────────────────────────────────
describe("parseFeatures — sources", () => {
  it("class feature source is the class name", () => {
    const data = baseData({
      classes: [classEntry("Fighter", 5, [{ name: "Extra Attack", requiredLevel: 5, description: "Attack twice." }])],
    });
    const f = parseFeatures(data).find(f => f.name === "Extra Attack");
    expect(f?.source).toBe("Fighter");
    expect(f?.description).toContain("Attack twice.");
  });

  it("subclass feature source is 'ClassName (SubclassName)'", () => {
    const data = baseData({
      classes: [classEntry("Fighter", 3, [], {
        name: "Champion",
        features: [{ name: "Improved Critical", requiredLevel: 3 }],
      })],
    });
    expect(parseFeatures(data).find(f => f.name === "Improved Critical")?.source).toBe("Fighter (Champion)");
  });

  it("racial trait source is race fullName", () => {
    const data = baseData({
      race: {
        fullName: "Mountain Dwarf",
        racialTraits: [{ definition: { name: "Stonecunning", description: "Twice proficiency bonus..." } }],
      },
    });
    expect(parseFeatures(data).find(f => f.name === "Stonecunning")?.source).toBe("Mountain Dwarf");
  });

  it("feat source is 'Feat'", () => {
    const data = baseData({
      feats: [{ definition: { name: "Sentinel", description: "You can stop enemies." } }],
    });
    expect(parseFeatures(data).find(f => f.name === "Sentinel")?.source).toBe("Feat");
  });

  it("background feature source is 'Background'", () => {
    const data = baseData({
      background: { definition: { name: "Criminal Contact", featureSnippet: "You have a contact in the underworld." } },
    });
    expect(parseFeatures(data).find(f => f.name === "Criminal Contact")?.source).toBe("Background");
  });

  it("background uses featureSnippet over description when present", () => {
    const data = baseData({
      background: { definition: { name: "Criminal Contact", featureSnippet: "Snippet text.", description: "Long desc." } },
    });
    expect(parseFeatures(data).find(f => f.name === "Criminal Contact")?.description).toContain("Snippet text.");
  });
});

// ─────────────────────────────────────────────
// Deduplication
// ─────────────────────────────────────────────
describe("parseFeatures — deduplication", () => {
  it("same feature name from two sources appears only once (first source wins)", () => {
    const data = baseData({
      classes: [classEntry("Fighter", 3, [{ name: "Darkvision", description: "From class" }])],
      race: {
        fullName: "Elf",
        racialTraits: [{ definition: { name: "Darkvision", description: "From race" } }],
      },
    });
    const features = parseFeatures(data);
    expect(features.filter(f => f.name === "Darkvision").length).toBe(1);
  });

  it("two different features with different names both appear", () => {
    const data = baseData({
      classes: [classEntry("Wizard", 5, [
        { name: "Arcane Recovery", requiredLevel: 1 },
        { name: "Spell Mastery", requiredLevel: 5 },
      ])],
    });
    const names = parseFeatures(data).map(f => f.name);
    expect(names).toContain("Arcane Recovery");
    expect(names).toContain("Spell Mastery");
  });
});

// ─────────────────────────────────────────────
// Skip List
// ─────────────────────────────────────────────
describe("parseFeatures — skip list", () => {
  const SKIPPED = [
    "Hit Points",
    "Proficiencies",
    "Ability Score Increases",
    "Languages",
    "Size",
    "Speed",
    "Alchemist Spells",
    "Artificer Infusions",
  ];

  it.each(SKIPPED)("'%s' is excluded from output", (name) => {
    const data = baseData({
      classes: [classEntry("Fighter", 5, [{ name, requiredLevel: 1, description: "Should be skipped." }])],
    });
    expect(parseFeatures(data).find(f => f.name === name)).toBeUndefined();
  });

  it("feature not on skip list is included", () => {
    const data = baseData({
      classes: [classEntry("Rogue", 1, [{ name: "Sneak Attack", description: "Extra damage." }])],
    });
    expect(parseFeatures(data).find(f => f.name === "Sneak Attack")).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// requiredLevel Gate
// ─────────────────────────────────────────────
describe("parseFeatures — requiredLevel gate", () => {
  it("feature with requiredLevel > class level is excluded", () => {
    const data = baseData({
      classes: [classEntry("Ranger", 5, [
        { name: "Natural Explorer", requiredLevel: 1 },
        { name: "Hide in Plain Sight", requiredLevel: 10 },
      ])],
    });
    const features = parseFeatures(data);
    expect(features.find(f => f.name === "Hide in Plain Sight")).toBeUndefined();
    expect(features.find(f => f.name === "Natural Explorer")).toBeDefined();
  });

  it("feature exactly at requiredLevel = class level is included", () => {
    const data = baseData({
      classes: [classEntry("Barbarian", 3, [{ name: "Reckless Attack", requiredLevel: 3 }])],
    });
    expect(parseFeatures(data).find(f => f.name === "Reckless Attack")).toBeDefined();
  });

  it("subclass features also gated by requiredLevel", () => {
    const data = baseData({
      classes: [classEntry("Paladin", 2, [], {
        name: "Oath of Devotion",
        features: [
          { name: "Sacred Weapon", requiredLevel: 3 },
          { name: "Holy Nimbus", requiredLevel: 20 },
        ],
      })],
    });
    const features = parseFeatures(data);
    expect(features.find(f => f.name === "Sacred Weapon")).toBeUndefined();
    expect(features.find(f => f.name === "Holy Nimbus")).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// Sorting
// ─────────────────────────────────────────────
describe("parseFeatures — sorting", () => {
  it("sorted by source then name alphabetically", () => {
    const data = baseData({
      classes: [classEntry("Fighter", 5, [
        { name: "Zeal", requiredLevel: 1 },
        { name: "Action Surge", requiredLevel: 1 },
      ])],
      feats: [{ definition: { name: "Alert" } }],
    });
    const features = parseFeatures(data);
    // "Feat" < "Fighter" alphabetically
    expect(features[0]?.source).toBe("Feat");
    const fighterFeatures = features.filter(f => f.source === "Fighter");
    expect(fighterFeatures[0]?.name).toBe("Action Surge");
    expect(fighterFeatures[1]?.name).toBe("Zeal");
  });
});

// ─────────────────────────────────────────────
// Description Processing
// ─────────────────────────────────────────────
describe("parseFeatures — description processing", () => {
  it("description passed through htmlToMarkdown", () => {
    const data = baseData({
      classes: [classEntry("Fighter", 1, [{ name: "Fighting Style", description: "<p><strong>Defense</strong>: +1 AC.</p>" }])],
    });
    expect(parseFeatures(data).find(f => f.name === "Fighting Style")?.description).toContain("**Defense**");
  });

  it("empty data produces empty array", () => {
    expect(parseFeatures(baseData())).toEqual([]);
  });
});
