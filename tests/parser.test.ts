import { describe, it, expect } from "vitest";
import { parseCharacter } from "../src/parser";

// Minimal base fixture — extend per test
function baseChar(overrides: Record<string, any> = {}): any {
  return {
    name: "Test Character",
    stats: [
      { id: 1, value: 10 }, // STR
      { id: 2, value: 10 }, // DEX
      { id: 3, value: 10 }, // CON
      { id: 4, value: 10 }, // INT
      { id: 5, value: 10 }, // WIS
      { id: 6, value: 10 }, // CHA
    ],
    overrideStats: [],
    modifiers: { class: [], race: [], feat: [], background: [], item: [], condition: [] },
    inventory: [],
    classSpells: [],
    spells: {},
    actions: {},
    classes: [{ definition: { name: "Fighter", classFeatures: [] }, level: 1, subclassDefinition: null }],
    race: {
      fullName: "Human",
      weightSpeeds: { normal: { walk: 30 } },
      racialTraits: [],
    },
    overrideArmorClass: null,
    baseHitPoints: 10,
    overrideHitPoints: null,
    removedHitPoints: 0,
    temporaryHitPoints: 0,
    bonusHitPoints: 0,
    feats: [],
    background: null,
    ...overrides,
  };
}

function withStat(id: number, value: number, others: { id: number; value: number }[] = []) {
  const defaults: Record<number, number> = { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10 };
  defaults[id] = value;
  for (const o of others) defaults[o.id] = o.value;
  return [1, 2, 3, 4, 5, 6].map(i => ({ id: i, value: defaults[i] }));
}

function armorItem(armorClass: number, armorTypeId: number, name = "Armor"): any {
  return {
    equipped: true,
    definition: { name, filterType: "Armor", armorClass, armorTypeId, grantedModifiers: [], stealthCheck: 1 },
  };
}

// ─────────────────────────────────────────────
// AC Calculation
// ─────────────────────────────────────────────
describe("calculateAc", () => {
  it("returns overrideArmorClass when set, ignoring inventory", () => {
    const data = baseChar({ overrideArmorClass: 18, inventory: [armorItem(12, 1)] });
    expect(parseCharacter(data).ac).toBe(18);
  });

  it("unarmored: 10 + DEX modifier", () => {
    // DEX 16 → mod +3 → ac 13
    const data = baseChar({ stats: withStat(2, 16), inventory: [] });
    expect(parseCharacter(data).ac).toBe(13);
  });

  it("light armor (type 1): base AC + full DEX modifier", () => {
    // Leather 11 + DEX 16 (mod +3) = 14
    const data = baseChar({
      stats: withStat(2, 16),
      inventory: [armorItem(11, 1, "Leather Armor")],
    });
    expect(parseCharacter(data).ac).toBe(14);
  });

  it("medium armor (type 2): base AC + min(DEX mod, 2)", () => {
    // Chain shirt 13 + DEX 18 (mod +4, capped at 2) = 15
    const data = baseChar({
      stats: withStat(2, 18),
      inventory: [armorItem(13, 2, "Chain Shirt")],
    });
    expect(parseCharacter(data).ac).toBe(15);
  });

  it("heavy armor (type 3): base AC only, no DEX added", () => {
    // Plate 18 + DEX 18 → still 18
    const data = baseChar({
      stats: withStat(2, 18),
      inventory: [armorItem(18, 3, "Plate Armor")],
    });
    expect(parseCharacter(data).ac).toBe(18);
  });

  it("shield (type 4) stacks on top of heavy armor", () => {
    // Chain mail 16 + shield 2 = 18, DEX ignored for heavy
    const data = baseChar({
      stats: withStat(2, 18),
      inventory: [armorItem(16, 3, "Chain Mail"), armorItem(2, 4, "Shield")],
    });
    expect(parseCharacter(data).ac).toBe(18);
  });

  it("unarmored + shield: 10 + DEX mod + shield bonus", () => {
    // DEX 14 (mod +2) + shield (+2) = 14
    const data = baseChar({
      stats: withStat(2, 14),
      inventory: [armorItem(2, 4, "Shield")],
    });
    expect(parseCharacter(data).ac).toBe(14);
  });

  it("negative DEX mod reduces unarmored AC below 10", () => {
    // DEX 6 (mod -2) → ac = 8
    const data = baseChar({ stats: withStat(2, 6), inventory: [] });
    expect(parseCharacter(data).ac).toBe(8);
  });
});

// ─────────────────────────────────────────────
// Ability Scores
// ─────────────────────────────────────────────
describe("ability scores", () => {
  it("uses base rolled stats", () => {
    const data = baseChar({ stats: withStat(1, 15) });
    expect(parseCharacter(data).abilities.str).toBe(15);
  });

  it("overrideStat replaces base entirely", () => {
    const data = baseChar({
      stats: withStat(1, 15),
      overrideStats: [{ id: 1, value: 20 }],
    });
    expect(parseCharacter(data).abilities.str).toBe(20);
  });

  it("overrideStat replaces base even when lower", () => {
    const data = baseChar({
      stats: withStat(1, 18),
      overrideStats: [{ id: 1, value: 12 }],
    });
    // overrideStats always replaces; 12 wins over 18
    expect(parseCharacter(data).abilities.str).toBe(12);
  });

  it("bonus modifier stacks additively on base", () => {
    const data = baseChar({
      stats: withStat(1, 15),
      modifiers: {
        ...baseChar().modifiers,
        race: [{ type: "bonus", subType: "strength-score", value: 2 }],
      },
    });
    expect(parseCharacter(data).abilities.str).toBe(17);
  });

  it("set modifier wins when higher than base + bonuses", () => {
    const data = baseChar({
      stats: withStat(1, 10),
      modifiers: {
        ...baseChar().modifiers,
        item: [{ type: "set", subType: "strength-score", value: 19 }],
      },
    });
    expect(parseCharacter(data).abilities.str).toBe(19);
  });

  it("set modifier loses when base + bonuses is higher", () => {
    const data = baseChar({
      stats: withStat(1, 18),
      modifiers: {
        ...baseChar().modifiers,
        item: [{ type: "set", subType: "strength-score", value: 14 }],
      },
    });
    expect(parseCharacter(data).abilities.str).toBe(18);
  });

  it("multiple bonus mods stack together", () => {
    const data = baseChar({
      stats: withStat(4, 10),
      modifiers: {
        ...baseChar().modifiers,
        race: [{ type: "bonus", subType: "intelligence-score", value: 1 }],
        feat: [{ type: "bonus", subType: "intelligence-score", value: 2 }],
      },
    });
    expect(parseCharacter(data).abilities.int).toBe(13);
  });
});

// ─────────────────────────────────────────────
// Proficiency Bonus
// ─────────────────────────────────────────────
describe("proficiencyBonus", () => {
  const levels: [number, number][] = [
    [1, 2], [4, 2],
    [5, 3], [8, 3],
    [9, 4], [12, 4],
    [13, 5], [16, 5],
    [17, 6], [20, 6],
  ];

  it.each(levels)("level %i → proficiencyBonus %i", (level, expected) => {
    const data = baseChar({ classes: [{ definition: { name: "Fighter", classFeatures: [] }, level, subclassDefinition: null }] });
    expect(parseCharacter(data).proficiencyBonus).toBe(expected);
  });

  it("multiclass: total level is sum of class levels", () => {
    // Fighter 3 + Rogue 2 = level 5 → profBonus 3
    const data = baseChar({
      classes: [
        { definition: { name: "Fighter", classFeatures: [] }, level: 3, subclassDefinition: null },
        { definition: { name: "Rogue", classFeatures: [] }, level: 2, subclassDefinition: null },
      ],
    });
    expect(parseCharacter(data).proficiencyBonus).toBe(3);
  });
});

// ─────────────────────────────────────────────
// Skill Proficiencies
// ─────────────────────────────────────────────
describe("skillProficiencies", () => {
  it("returns sorted list of proficient skills", () => {
    const data = baseChar({
      modifiers: {
        ...baseChar().modifiers,
        class: [
          { type: "proficiency", subType: "stealth" },
          { type: "proficiency", subType: "athletics" },
        ],
      },
    });
    expect(parseCharacter(data).skillProficiencies).toEqual(["athletics", "stealth"]);
  });

  it("deduplicates same skill from multiple modifier groups", () => {
    const data = baseChar({
      modifiers: {
        ...baseChar().modifiers,
        class: [{ type: "proficiency", subType: "athletics" }],
        race: [{ type: "proficiency", subType: "athletics" }],
      },
    });
    expect(parseCharacter(data).skillProficiencies).toEqual(["athletics"]);
  });

  it("ignores non-skill proficiency subTypes (armor, weapons, saving throws)", () => {
    const data = baseChar({
      modifiers: {
        ...baseChar().modifiers,
        class: [
          { type: "proficiency", subType: "heavy-armor" },
          { type: "proficiency", subType: "strength-saving-throws" },
          { type: "proficiency", subType: "perception" },
        ],
      },
    });
    expect(parseCharacter(data).skillProficiencies).toEqual(["perception"]);
  });

  it("returns empty array when no skill proficiencies", () => {
    expect(parseCharacter(baseChar()).skillProficiencies).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// Saving Throws
// ─────────────────────────────────────────────
describe("savingThrows", () => {
  it("non-proficient save equals ability modifier only", () => {
    // STR 10 → mod 0, no proficiency
    expect(parseCharacter(baseChar()).savingThrows.str).toBe(0);
  });

  it("non-proficient save with positive ability mod", () => {
    // STR 16 → mod +3, no proficiency
    const data = baseChar({ stats: withStat(1, 16) });
    expect(parseCharacter(data).savingThrows.str).toBe(3);
  });

  it("proficient save adds profBonus to ability mod", () => {
    // STR 12 → mod +1, profBonus=2 (level 1), total: 3
    const data = baseChar({
      stats: withStat(1, 12),
      modifiers: {
        ...baseChar().modifiers,
        class: [{ type: "proficiency", subType: "strength-saving-throws" }],
      },
    });
    expect(parseCharacter(data).savingThrows.str).toBe(3);
  });

  it("proficient save with negative ability mod", () => {
    // CON 8 → mod -1, level 5 (profBonus=3), total: 2
    const data = baseChar({
      stats: withStat(3, 8),
      classes: [{ definition: { name: "Fighter", classFeatures: [] }, level: 5, subclassDefinition: null }],
      modifiers: {
        ...baseChar().modifiers,
        class: [{ type: "proficiency", subType: "constitution-saving-throws" }],
      },
    });
    expect(parseCharacter(data).savingThrows.con).toBe(2);
  });
});

// ─────────────────────────────────────────────
// Passives
// ─────────────────────────────────────────────
describe("passives", () => {
  it("base passive = 10 + ability modifier (no proficiency)", () => {
    // WIS 14 → mod +2, no proficiency → perception = 12
    const data = baseChar({ stats: withStat(5, 14) });
    expect(parseCharacter(data).passives.perception).toBe(12);
  });

  it("proficient passive adds profBonus", () => {
    // WIS 14 (mod +2) + profBonus 2 (level 1) = 14
    const data = baseChar({
      stats: withStat(5, 14),
      modifiers: {
        ...baseChar().modifiers,
        class: [{ type: "proficiency", subType: "perception" }],
      },
    });
    expect(parseCharacter(data).passives.perception).toBe(14);
  });

  it("expertise doubles profBonus in passive", () => {
    // WIS 12 (mod +1), profBonus 3 (level 5), expertise → 10+1+6=17
    const data = baseChar({
      stats: withStat(5, 12),
      classes: [{ definition: { name: "Rogue", classFeatures: [] }, level: 5, subclassDefinition: null }],
      modifiers: {
        ...baseChar().modifiers,
        class: [
          { type: "proficiency", subType: "perception" },
          { type: "expertise", subType: "perception" },
        ],
      },
    });
    expect(parseCharacter(data).passives.perception).toBe(17);
  });

  it("investigation uses INT modifier", () => {
    // INT 16 (mod +3), no proficiency → investigation = 13
    const data = baseChar({ stats: withStat(4, 16) });
    expect(parseCharacter(data).passives.investigation).toBe(13);
  });
});

// ─────────────────────────────────────────────
// Consumables — Spell Slots
// ─────────────────────────────────────────────
describe("spell slot consumables", () => {
  it("full caster (wizard) level 5: 4×1st + 3×2nd + 2×3rd", () => {
    const data = baseChar({
      classes: [{ definition: { name: "Wizard", classFeatures: [] }, level: 5, subclassDefinition: null }],
    });
    const slots = parseCharacter(data).consumables.filter(c => c.stateKey.startsWith("wizard_spell_slot"));
    expect(slots).toEqual([
      { label: "1st Level Spell Slots", stateKey: "wizard_spell_slots_1", uses: 4, resetOn: "long-rest" },
      { label: "2nd Level Spell Slots", stateKey: "wizard_spell_slots_2", uses: 3, resetOn: "long-rest" },
      { label: "3rd Level Spell Slots", stateKey: "wizard_spell_slots_3", uses: 2, resetOn: "long-rest" },
    ]);
  });

  it("half caster (paladin) level 5: 4×1st + 2×2nd, no 3rd", () => {
    const data = baseChar({
      classes: [{ definition: { name: "Paladin", classFeatures: [] }, level: 5, subclassDefinition: null }],
    });
    const slots = parseCharacter(data).consumables;
    expect(slots.find(s => s.stateKey === "paladin_spell_slots_1")?.uses).toBe(4);
    expect(slots.find(s => s.stateKey === "paladin_spell_slots_2")?.uses).toBe(2);
    expect(slots.find(s => s.stateKey === "paladin_spell_slots_3")).toBeUndefined();
  });

  it("artificer level 5: 4×1st + 2×2nd", () => {
    const data = baseChar({
      classes: [{ definition: { name: "Artificer", classFeatures: [] }, level: 5, subclassDefinition: null }],
    });
    const slots = parseCharacter(data).consumables;
    expect(slots.find(s => s.stateKey === "artificer_spell_slots_1")?.uses).toBe(4);
    expect(slots.find(s => s.stateKey === "artificer_spell_slots_2")?.uses).toBe(2);
  });

  it("non-caster (fighter) produces no spell slot consumables", () => {
    expect(parseCharacter(baseChar()).consumables).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// Consumables — Limited-Use Actions
// ─────────────────────────────────────────────
describe("limited-use action consumables", () => {
  it("fixed maxUses with long-rest reset (resetType=2)", () => {
    const data = baseChar({
      actions: {
        class: [{ name: "Action Surge", limitedUse: { maxUses: 1, resetType: 2 } }],
      },
    });
    const c = parseCharacter(data).consumables.find(c => c.stateKey === "action_surge");
    expect(c).toMatchObject({ uses: 1, resetOn: "long-rest" });
  });

  it("short-rest reset (resetType=1)", () => {
    const data = baseChar({
      actions: {
        class: [{ name: "Bardic Inspiration", limitedUse: { maxUses: 3, resetType: 1 } }],
      },
    });
    expect(parseCharacter(data).consumables.find(c => c.stateKey === "bardic_inspiration")?.resetOn).toBe("short-rest");
  });

  it("useProficiencyBonus scales uses with profBonus", () => {
    // level 5 → profBonus 3
    const data = baseChar({
      classes: [{ definition: { name: "Fighter", classFeatures: [] }, level: 5, subclassDefinition: null }],
      actions: {
        class: [{ name: "Second Wind", limitedUse: { useProficiencyBonus: true, resetType: 2 } }],
      },
    });
    expect(parseCharacter(data).consumables.find(c => c.stateKey === "second_wind")?.uses).toBe(3);
  });

  it("statModifierUsesId=4 uses intMod, clamped to minimum 1", () => {
    // INT 8 → mod -1 → max(1, -1) = 1
    const data = baseChar({
      stats: withStat(4, 8),
      actions: {
        class: [{ name: "Arcane Recovery", limitedUse: { statModifierUsesId: 4, resetType: 2 } }],
      },
    });
    expect(parseCharacter(data).consumables.find(c => c.stateKey === "arcane_recovery")?.uses).toBe(1);
  });

  it("stateKey normalizes name to lowercase_underscores with no special chars", () => {
    const data = baseChar({
      actions: {
        class: [{ name: "Ki Points (Monk)", limitedUse: { maxUses: 5, resetType: 2 } }],
      },
    });
    expect(parseCharacter(data).consumables[0]?.stateKey).toBe("ki_points_monk");
  });

  it("resetType=4 maps to long-rest", () => {
    const data = baseChar({
      actions: {
        class: [{ name: "Channel Divinity", limitedUse: { maxUses: 2, resetType: 4 } }],
      },
    });
    expect(parseCharacter(data).consumables.find(c => c.stateKey === "channel_divinity")?.resetOn).toBe("long-rest");
  });
});

// ─────────────────────────────────────────────
// Defenses
// ─────────────────────────────────────────────
describe("defenses", () => {
  it("resistance modifier captured with friendly name", () => {
    const data = baseChar({
      modifiers: {
        ...baseChar().modifiers,
        race: [{ type: "resistance", subType: "fire", friendlySubtypeName: "Fire" }],
      },
    });
    expect(parseCharacter(data).defenses.resistances).toContain("Fire");
  });

  it("immunity modifier captured", () => {
    const data = baseChar({
      modifiers: {
        ...baseChar().modifiers,
        class: [{ type: "immunity", subType: "disease", friendlySubtypeName: "Disease" }],
      },
    });
    expect(parseCharacter(data).defenses.immunities).toContain("Disease");
  });

  it("restriction appended to label", () => {
    const data = baseChar({
      modifiers: {
        ...baseChar().modifiers,
        class: [{
          type: "advantage",
          subType: "saving-throws",
          friendlySubtypeName: "Saving Throws",
          restriction: "vs. magic",
        }],
      },
    });
    expect(parseCharacter(data).defenses.advantages).toContain("Saving Throws (vs. magic)");
  });

  it("equipped heavy armor with stealthCheck=2 adds stealth disadvantage", () => {
    const data = baseChar({
      inventory: [{
        equipped: true,
        definition: {
          name: "Plate Armor",
          filterType: "Armor",
          armorClass: 18,
          armorTypeId: 3,
          stealthCheck: 2,
          grantedModifiers: [],
        },
      }],
    });
    expect(parseCharacter(data).defenses.disadvantages).toContain("Stealth (Plate Armor)");
  });

  it("duplicate defense labels deduplicated", () => {
    const data = baseChar({
      modifiers: {
        ...baseChar().modifiers,
        race: [{ type: "resistance", subType: "fire", friendlySubtypeName: "Fire" }],
        feat: [{ type: "resistance", subType: "fire", friendlySubtypeName: "Fire" }],
      },
    });
    const resistances = parseCharacter(data).defenses.resistances.filter(r => r === "Fire");
    expect(resistances.length).toBe(1);
  });
});

// ─────────────────────────────────────────────
// Speed
// ─────────────────────────────────────────────
describe("speed", () => {
  it("uses race base walk speed", () => {
    const data = baseChar({
      race: {
        fullName: "Dwarf",
        weightSpeeds: { normal: { walk: 25 } },
        racialTraits: [],
      },
    });
    expect(parseCharacter(data).speed).toBe(25);
  });

  it("defaults to 30 when no race speed defined", () => {
    const data = baseChar({ race: { fullName: "Human", racialTraits: [] } });
    expect(parseCharacter(data).speed).toBe(30);
  });

  it("speed bonus modifiers stack on base", () => {
    const data = baseChar({
      modifiers: {
        ...baseChar().modifiers,
        class: [{ type: "bonus", subType: "speed", value: 10 }],
      },
    });
    expect(parseCharacter(data).speed).toBe(40);
  });
});

// ─────────────────────────────────────────────
// Currency Extraction
// ─────────────────────────────────────────────
describe("currencies", () => {
  it("extracts all five denominations when present", () => {
    const data = baseChar({ currencies: { cp: 10, sp: 5, ep: 2, gp: 100, pp: 3 } });
    expect(parseCharacter(data).currencies).toEqual({ cp: 10, sp: 5, ep: 2, gp: 100, pp: 3 });
  });

  it("defaults all denominations to 0 when currencies key is absent", () => {
    expect(parseCharacter(baseChar()).currencies).toEqual({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
  });

  it("defaults missing denominations to 0 when only some are present", () => {
    const data = baseChar({ currencies: { gp: 50 } });
    expect(parseCharacter(data).currencies).toEqual({ cp: 0, sp: 0, ep: 0, gp: 50, pp: 0 });
  });
});

// ─────────────────────────────────────────────
// mod() helper
// ─────────────────────────────────────────────
import { mod } from "../src/parser";

describe("mod()", () => {
  it("score 10 → +0", () => expect(mod(10)).toBe("+0"));
  it("score 12 → +1", () => expect(mod(12)).toBe("+1"));
  it("score 20 → +5", () => expect(mod(20)).toBe("+5"));
  it("score 8 → -1", () => expect(mod(8)).toBe("-1"));
  it("score 1 → -5", () => expect(mod(1)).toBe("-5"));
});
