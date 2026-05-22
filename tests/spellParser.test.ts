import { describe, it, expect } from "vitest";
import { parseSpells } from "../src/spellParser";

// Build a minimal spell entry shaped like D&D Beyond API
function spellEntry(description: string, opts: Record<string, any> = {}): any {
  return {
    definition: {
      name: opts.name ?? "Test Spell",
      level: opts.level ?? 1,
      school: opts.school ?? "Evocation",
      activation: opts.activation ?? { activationType: 1, activationTime: 1 },
      range: "range" in opts ? opts.range : { rangeValue: 60 },
      duration: opts.duration ?? { durationType: "Instantaneous" },
      concentration: opts.concentration ?? false,
      ritual: opts.ritual ?? false,
      components: opts.components ?? [1, 2],
      componentsDescription: opts.componentsDescription ?? "",
      description,
      requiresAttackRoll: opts.requiresAttackRoll ?? false,
      requiresSavingThrow: opts.requiresSavingThrow ?? false,
      saveDcAbilityId: opts.saveDcAbilityId ?? null,
    },
  };
}

function spellData(spells: any[], classes: any[] = []) {
  return {
    classSpells: [{ spells }],
    spells: {},
    classes,
  };
}

// ─────────────────────────────────────────────
// Damage Extraction via description regex
// ─────────────────────────────────────────────
describe("damage extraction", () => {
  it("simple dice: '1d6 fire damage'", () => {
    const result = parseSpells(spellData([spellEntry("deals 1d6 fire damage")]), 2, 0);
    expect(result[0]?.damage).toBe("1d6 fire");
  });

  it("dice with positive modifier: '1d8 + 2 radiant damage'", () => {
    const result = parseSpells(spellData([spellEntry("1d8 + 2 radiant damage to target")]), 2, 0);
    expect(result[0]?.damage).toBe("1d8 + 2 radiant");
  });

  it("dice with negative modifier: '2d10-1 lightning damage'", () => {
    const result = parseSpells(spellData([spellEntry("2d10-1 lightning damage")]), 2, 0);
    expect(result[0]?.damage).toBe("2d10-1 lightning");
  });

  it("multiple damage types joined with ' + '", () => {
    const result = parseSpells(spellData([spellEntry("1d8 radiant damage plus 2d6 fire damage")]), 2, 0);
    expect(result[0]?.damage).toBe("1d8 radiant + 2d6 fire");
  });

  it("invalid damage type (not in DAMAGE_TYPES list) yields null", () => {
    const result = parseSpells(spellData([spellEntry("deals 3d6 arcane damage")]), 2, 0);
    expect(result[0]?.damage).toBeNull();
  });

  it("no damage description yields null", () => {
    const result = parseSpells(spellData([spellEntry("you gain advantage on the next attack")]), 2, 0);
    expect(result[0]?.damage).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Healing Extraction
// ─────────────────────────────────────────────
describe("healing extraction", () => {
  it("'regains 1d8 hit points' extracts healing with intMod appended", () => {
    const result = parseSpells(spellData([spellEntry("target regains 1d8 hit points")]), 3, 2);
    expect(result[0]?.healing).toBe("1d8+2");
  });

  it("'restore 2d4 hit points' pattern", () => {
    const result = parseSpells(spellData([spellEntry("restore 2d4 hit points to the creature")]), 3, 2);
    expect(result[0]?.healing).toBe("2d4+2");
  });

  it("intMod=0 appended as +0", () => {
    const result = parseSpells(spellData([spellEntry("regain 1d6 hit points")]), 3, 0);
    expect(result[0]?.healing).toBe("1d6+0");
  });

  it("negative intMod appended without extra + sign", () => {
    const result = parseSpells(spellData([spellEntry("regain 1d4 hit points")]), 2, -1);
    expect(result[0]?.healing).toBe("1d4-1");
  });

  it("no healing text yields null", () => {
    const result = parseSpells(spellData([spellEntry("you can see in darkness")]), 2, 2);
    expect(result[0]?.healing).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Spell Attack Bonus & Save DC
// ─────────────────────────────────────────────
describe("computeSpellStats", () => {
  it("attack spell: attackBonus = profBonus + intMod with + prefix", () => {
    const entry = spellEntry("1d10 force damage", { requiresAttackRoll: true });
    const spell = parseSpells(spellData([entry]), 4, 3)[0];
    expect(spell?.attackBonus).toBe("+7");
    expect(spell?.saveDc).toBeNull();
  });

  it("save spell: saveDc = 8 + profBonus + intMod formatted as 'DC N'", () => {
    const entry = spellEntry("target must make a DEX save", { requiresSavingThrow: true });
    const spell = parseSpells(spellData([entry]), 3, 2)[0];
    expect(spell?.saveDc).toBe("DC 13");
    expect(spell?.attackBonus).toBeNull();
  });

  it("utility spell with neither attack nor save: both null", () => {
    const spell = parseSpells(spellData([spellEntry("you create a tiny magical light")]), 3, 2)[0];
    expect(spell?.attackBonus).toBeNull();
    expect(spell?.saveDc).toBeNull();
  });

  it("negative intMod reduces attackBonus", () => {
    const entry = spellEntry("1d6 force damage", { requiresAttackRoll: true });
    const spell = parseSpells(spellData([entry]), 2, -1)[0];
    expect(spell?.attackBonus).toBe("+1");
  });
});

// ─────────────────────────────────────────────
// Component Parsing
// ─────────────────────────────────────────────
describe("parseComponents", () => {
  it("V only", () => {
    const entry = spellEntry("desc", { components: [1], componentsDescription: "" });
    expect(parseSpells(spellData([entry]), 2, 0)[0]?.components).toBe("V");
  });

  it("V, S, M with material description in parens", () => {
    const entry = spellEntry("desc", { components: [1, 2, 3], componentsDescription: "a pinch of sulfur" });
    expect(parseSpells(spellData([entry]), 2, 0)[0]?.components).toBe("V, S, M (a pinch of sulfur)");
  });

  it("S, M without V", () => {
    const entry = spellEntry("desc", { components: [2, 3], componentsDescription: "iron" });
    expect(parseSpells(spellData([entry]), 2, 0)[0]?.components).toBe("S, M (iron)");
  });

  it("empty components returns empty string", () => {
    const entry = spellEntry("desc", { components: [], componentsDescription: "" });
    expect(parseSpells(spellData([entry]), 2, 0)[0]?.components).toBe("");
  });
});

// ─────────────────────────────────────────────
// Activation Type Parsing
// ─────────────────────────────────────────────
describe("parseActivation", () => {
  const cases: [number, string][] = [
    [1, "1 Action"],
    [2, "1 Bonus Action"],
    [3, "1 Reaction"],
    [4, "1 Minute"],
    [5, "10 Minutes"],
    [8, "No Action"],
  ];

  it.each(cases)("activationType %i → '%s'", (typeId, expected) => {
    const entry = spellEntry("desc", { activation: { activationType: typeId, activationTime: 1 } });
    expect(parseSpells(spellData([entry]), 2, 0)[0]?.castingTime).toBe(expected);
  });
});

// ─────────────────────────────────────────────
// Range Parsing
// ─────────────────────────────────────────────
describe("parseRange", () => {
  it("origin 'Touch' returns 'Touch'", () => {
    const entry = spellEntry("desc", { range: { origin: "Touch" } });
    expect(parseSpells(spellData([entry]), 2, 0)[0]?.range).toBe("Touch");
  });

  it("origin 'Self' returns 'Self'", () => {
    const entry = spellEntry("desc", { range: { origin: "Self" } });
    expect(parseSpells(spellData([entry]), 2, 0)[0]?.range).toBe("Self");
  });

  it("rangeValue returns 'N ft'", () => {
    const entry = spellEntry("desc", { range: { rangeValue: 60 } });
    expect(parseSpells(spellData([entry]), 2, 0)[0]?.range).toBe("60 ft");
  });

  it("null range returns 'Unknown'", () => {
    const entry = spellEntry("desc", { range: null });
    expect(parseSpells(spellData([entry]), 2, 0)[0]?.range).toBe("Unknown");
  });
});

// ─────────────────────────────────────────────
// Duration Parsing
// ─────────────────────────────────────────────
describe("parseDuration", () => {
  it("Instantaneous returns 'Instantaneous'", () => {
    const entry = spellEntry("desc", { duration: { durationType: "Instantaneous" } });
    expect(parseSpells(spellData([entry]), 2, 0)[0]?.duration).toBe("Instantaneous");
  });

  it("durationInterval + durationUnit returns formatted string", () => {
    const entry = spellEntry("desc", { duration: { durationInterval: 1, durationUnit: "minute" } });
    expect(parseSpells(spellData([entry]), 2, 0)[0]?.duration).toBe("1 minute");
  });

  it("durationType fallback for special durations", () => {
    const entry = spellEntry("desc", { duration: { durationType: "Special" } });
    expect(parseSpells(spellData([entry]), 2, 0)[0]?.duration).toBe("Special");
  });
});

// ─────────────────────────────────────────────
// Deduplication and Sorting
// ─────────────────────────────────────────────
describe("parseSpells — deduplication and sorting", () => {
  it("deduplicates spells with the same name across sources", () => {
    const entry = spellEntry("desc", { name: "Fireball" });
    const data = {
      classSpells: [{ spells: [entry] }],
      spells: { race: [entry] },
      classes: [],
    };
    const result = parseSpells(data, 2, 0);
    expect(result.filter(s => s.name === "Fireball").length).toBe(1);
  });

  it("sorted by level ascending, then name alphabetically", () => {
    const zap = spellEntry("", { name: "Zap", level: 2 });
    const blink = spellEntry("", { name: "Blink", level: 1 });
    const alarm = spellEntry("", { name: "Alarm", level: 1 });
    const result = parseSpells(spellData([zap, blink, alarm]), 2, 0);
    expect(result.map(s => s.name)).toEqual(["Alarm", "Blink", "Zap"]);
  });

  it("assigns source 'class' for classSpells entries", () => {
    const result = parseSpells(spellData([spellEntry("desc")]), 2, 0);
    expect(result[0]?.source).toBe("class");
  });
});

// ─────────────────────────────────────────────
// Subclass Spell HTML Parsing
// ─────────────────────────────────────────────
describe("parseSubclassSpellsFromFeatures", () => {
  it("injects subclass spells when character level meets threshold", () => {
    const html = `<table>
      <tr><td><p>3rd</p></td><td><p>Counterspell, Dispel Magic</p></td></tr>
    </table>`;
    const data = {
      classSpells: [],
      spells: {},
      classes: [{
        level: 5,
        definition: { name: "Paladin", classFeatures: [] },
        subclassDefinition: {
          name: "Oath of Devotion",
          classFeatures: [{ name: "Oath Spells", description: html }],
        },
      }],
    };
    const names = parseSpells(data, 3, 0).map(s => s.name);
    expect(names).toContain("Counterspell");
    expect(names).toContain("Dispel Magic");
  });

  it("does not inject subclass spells when character level is below threshold", () => {
    const html = `<table>
      <tr><td><p>9th</p></td><td><p>Dominate Monster</p></td></tr>
    </table>`;
    const data = {
      classSpells: [],
      spells: {},
      classes: [{
        level: 7,
        definition: { name: "Paladin", classFeatures: [] },
        subclassDefinition: {
          name: "Oath of Devotion",
          classFeatures: [{ name: "Oath Spells", description: html }],
        },
      }],
    };
    expect(parseSpells(data, 3, 0).map(s => s.name)).not.toContain("Dominate Monster");
  });

  it("title-cases spell names extracted from HTML", () => {
    const html = `<table>
      <tr><td><p>3rd</p></td><td><p>fireball</p></td></tr>
    </table>`;
    const data = {
      classSpells: [],
      spells: {},
      classes: [{
        level: 5,
        definition: { name: "Sorcerer", classFeatures: [] },
        subclassDefinition: {
          name: "Wild Magic",
          classFeatures: [{ name: "Wild Spells", description: html }],
        },
      }],
    };
    const names = parseSpells(data, 3, 0).map(s => s.name);
    expect(names).toContain("Fireball");
    expect(names).not.toContain("fireball");
  });

  it("does not duplicate a spell already in classSpells", () => {
    const html = `<table>
      <tr><td><p>1st</p></td><td><p>Fireball</p></td></tr>
    </table>`;
    const existingEntry = spellEntry("existing", { name: "Fireball" });
    const data = {
      classSpells: [{ spells: [existingEntry] }],
      spells: {},
      classes: [{
        level: 5,
        definition: { name: "Wizard", classFeatures: [] },
        subclassDefinition: {
          name: "School",
          classFeatures: [{ name: "Spell", description: html }],
        },
      }],
    };
    expect(parseSpells(data, 2, 0).filter(s => s.name === "Fireball").length).toBe(1);
  });
});
