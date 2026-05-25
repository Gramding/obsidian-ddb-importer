import { describe, it, expect } from "vitest";
import { parseActions } from "../src/actionsParser";

// Base data with simple-weapons + martial-weapons proficiency
function baseData(overrides: Record<string, any> = {}): any {
  return {
    modifiers: {
      class: [
        { type: "proficiency", subType: "simple-weapons" },
        { type: "proficiency", subType: "martial-weapons" },
      ],
    },
    inventory: [],
    actions: {},
    ...overrides,
  };
}

function makeWeapon(opts: {
  name: string;
  attackType?: number;  // 1=melee, 2=ranged
  isFinesse?: boolean;
  isThrown?: boolean;
  range?: number;
  longRange?: number | null;
  diceString?: string;
  damageType?: string;
  equipped?: boolean;
}): any {
  const properties: { name: string }[] = [];
  if (opts.isFinesse) properties.push({ name: "Finesse" });
  if (opts.isThrown) properties.push({ name: "Thrown" });

  return {
    equipped: opts.equipped ?? true,
    definition: {
      filterType: "Weapon",
      name: opts.name,
      attackType: opts.attackType ?? 1,
      range: opts.range ?? 5,
      longRange: opts.longRange ?? null,
      damage: { diceString: opts.diceString ?? "1d8" },
      damageType: opts.damageType ?? "slashing",
      properties,
      grantedModifiers: [],
    },
  };
}

// ─────────────────────────────────────────────
// Weapon Actions
// ─────────────────────────────────────────────
describe("parseWeaponActions", () => {
  it("melee weapon uses STR modifier for hit and damage", () => {
    const data = baseData({ inventory: [makeWeapon({ name: "Longsword", diceString: "1d8", damageType: "slashing" })] });
    const action = parseActions(data, 3, 3, 1, []).find(a => a.name === "Longsword");
    expect(action?.hit).toBe("+6");       // str(3) + prof(3)
    expect(action?.damage).toBe("1d8+3 slashing");
  });

  it("ranged weapon uses DEX modifier", () => {
    const data = baseData({
      inventory: [makeWeapon({ name: "Shortbow", attackType: 2, range: 80, longRange: 320, diceString: "1d6", damageType: "piercing" })],
    });
    const action = parseActions(data, 3, 0, 3, []).find(a => a.name === "Shortbow");
    expect(action?.hit).toBe("+6");       // dex(3) + prof(3)
    expect(action?.damage).toBe("1d6+3 piercing");
    expect(action?.range).toBe("80/320 ft");
  });

  it("finesse weapon uses DEX when DEX > STR", () => {
    const data = baseData({ inventory: [makeWeapon({ name: "Rapier", isFinesse: true, diceString: "1d8", damageType: "piercing" })] });
    const action = parseActions(data, 2, 1, 4, []).find(a => a.name === "Rapier");
    expect(action?.hit).toBe("+6");       // dex(4) + prof(2)
    expect(action?.damage).toContain("+4");
  });

  it("finesse weapon uses STR when STR > DEX", () => {
    const data = baseData({ inventory: [makeWeapon({ name: "Dagger", isFinesse: true })] });
    const action = parseActions(data, 2, 4, 1, []).find(a => a.name === "Dagger");
    expect(action?.hit).toBe("+6");       // str(4) + prof(2)
  });

  it("negative STR mod reduces hit bonus", () => {
    const data = baseData({ inventory: [makeWeapon({ name: "Club" })] });
    const action = parseActions(data, 2, -1, 1, []).find(a => a.name === "Club");
    expect(action?.hit).toBe("+1");       // str(-1) + prof(2)
  });

  it("no proficiency when weapon and type not in proficient set", () => {
    const data = {
      modifiers: { class: [] },  // no proficiencies
      inventory: [makeWeapon({ name: "Exotic Blade" })],
      actions: {},
    };
    const action = parseActions(data, 3, 3, 1, []).find(a => a.name === "Exotic Blade");
    expect(action?.hit).toBe("+3");       // str(3) only, no prof
  });

  it("unequipped weapon is excluded from actions", () => {
    const data = baseData({ inventory: [makeWeapon({ name: "Hidden Blade", equipped: false })] });
    expect(parseActions(data, 2, 2, 2, []).find(a => a.name === "Hidden Blade")).toBeUndefined();
  });

  it("melee weapon range defaults to '5 ft'", () => {
    const data = baseData({ inventory: [makeWeapon({ name: "Sword", range: 0 })] });
    const action = parseActions(data, 2, 2, 1, []).find(a => a.name === "Sword");
    expect(action?.range).toBe("5 ft");
  });

  it("ranged weapon with both range and longRange shows 'N/M ft'", () => {
    const data = baseData({
      inventory: [makeWeapon({ name: "Longbow", attackType: 2, range: 150, longRange: 600 })],
    });
    expect(parseActions(data, 2, 0, 3, []).find(a => a.name === "Longbow")?.range).toBe("150/600 ft");
  });

  it("weapon without damage definition uses '—'", () => {
    const item = {
      equipped: true,
      definition: {
        filterType: "Weapon",
        name: "Unarmed",
        attackType: 1,
        range: 5,
        longRange: null,
        damage: null,
        damageType: null,
        properties: [],
        grantedModifiers: [],
      },
    };
    const data = baseData({ inventory: [item] });
    const action = parseActions(data, 2, 2, 1, []).find(a => a.name === "Unarmed");
    expect(action?.hit).toBe("+4");       // str(2) + prof(2)
    expect(action?.damage).toBe("—");
  });
});

// ─────────────────────────────────────────────
// Spell Actions
// ─────────────────────────────────────────────
describe("parseSpellActions", () => {
  const makeSpell = (opts: Record<string, any>) => ({
    name: "Test Spell",
    attackBonus: null,
    saveDc: null,
    castingTime: "1 Action",
    range: "60 ft",
    damage: null,
    healing: null,
    school: "Evocation",
    level: 1,
    concentration: false,
    ...opts,
  });

  it("attack spell: type='Attack', hit=attackBonus", () => {
    const spell = makeSpell({ name: "Fire Bolt", attackBonus: "+5", damage: "1d10 fire" });
    const action = parseActions(baseData(), 2, 0, 0, [spell]).find(a => a.name === "Fire Bolt");
    expect(action?.type).toBe("Attack");
    expect(action?.hit).toBe("+5");
    expect(action?.damage).toBe("1d10 fire");
  });

  it("save spell: type='Save', saveDc set", () => {
    const spell = makeSpell({ name: "Fireball", saveDc: "DC 15", damage: "8d6 fire" });
    const action = parseActions(baseData(), 2, 0, 0, [spell]).find(a => a.name === "Fireball");
    expect(action?.type).toBe("Save");
    expect(action?.saveDc).toBe("DC 15");
  });

  it("utility spell (no attack/save) excluded from spell actions", () => {
    const spell = makeSpell({ name: "Light", attackBonus: null, saveDc: null });
    const actions = parseActions(baseData(), 2, 0, 0, [spell]);
    expect(actions.find(a => a.name === "Light")).toBeUndefined();
  });

  it("concentration spell notes include '· C'", () => {
    const spell = makeSpell({ name: "Hold Person", saveDc: "DC 14", concentration: true });
    const action = parseActions(baseData(), 2, 0, 0, [spell]).find(a => a.name === "Hold Person");
    expect(action?.notes).toContain("· C");
  });

  it("healing spell uses healing as damage field", () => {
    const spell = makeSpell({ name: "Cure Wounds", healing: "1d8+3", attackBonus: "+2" });
    const action = parseActions(baseData(), 2, 0, 0, [spell]).find(a => a.name === "Cure Wounds");
    expect(action?.damage).toBe("1d8+3");
  });
});

// ─────────────────────────────────────────────
// Class Actions
// ─────────────────────────────────────────────
describe("parseClassActions", () => {
  it("class action source capitalized from key name", () => {
    const data = baseData({
      actions: {
        racial: [{ name: "Breath Weapon", activation: { activationType: 1 }, displayAsAttack: false }],
      },
    });
    const action = parseActions(data, 2, 0, 0, []).find(a => a.name === "Breath Weapon");
    expect(action?.source).toBe("Racial");
  });

  it("displayAsAttack=true: type='Attack', hit=+profBonus", () => {
    const data = baseData({
      actions: {
        class: [{ name: "Divine Smite", activation: { activationType: 1 }, displayAsAttack: true }],
      },
    });
    const action = parseActions(data, 3, 0, 0, []).find(a => a.name === "Divine Smite");
    expect(action?.type).toBe("Attack");
    expect(action?.hit).toBe("+3");
  });

  it("class action with dice shows damage string", () => {
    const data = baseData({
      actions: {
        class: [{ name: "Sneak Attack", activation: { activationType: 1 }, displayAsAttack: false, dice: { diceString: "3d6" } }],
      },
    });
    expect(parseActions(data, 3, 0, 0, []).find(a => a.name === "Sneak Attack")?.damage).toBe("3d6");
  });

  it("limited use with useProficiencyBonus shows profBonus in notes", () => {
    const data = baseData({
      actions: {
        class: [{
          name: "Second Wind",
          activation: { activationType: 1 },
          displayAsAttack: false,
          limitedUse: { useProficiencyBonus: true },
        }],
      },
    });
    const action = parseActions(data, 4, 0, 0, []).find(a => a.name === "Second Wind");
    expect(action?.notes).toBe("4 uses");
  });

  it("limited use with maxUses shows count in notes", () => {
    const data = baseData({
      actions: {
        class: [{
          name: "Action Surge",
          activation: { activationType: 1 },
          displayAsAttack: false,
          limitedUse: { maxUses: 2 },
        }],
      },
    });
    expect(parseActions(data, 3, 0, 0, []).find(a => a.name === "Action Surge")?.notes).toBe("2 uses");
  });

  it("activation type 2 maps to 'Bonus Action'", () => {
    const data = baseData({
      actions: {
        class: [{ name: "Cunning Action", activation: { activationType: 2 }, displayAsAttack: false }],
      },
    });
    expect(parseActions(data, 2, 0, 0, []).find(a => a.name === "Cunning Action")?.activation).toBe("Bonus Action");
  });
});

// ─────────────────────────────────────────────
// Combined output order
// ─────────────────────────────────────────────
describe("parseActions — combined output", () => {
  it("weapons appear before spell actions before class actions", () => {
    const data = baseData({
      inventory: [makeWeapon({ name: "Sword" })],
      actions: {
        class: [{ name: "Rage", activation: { activationType: 1 }, displayAsAttack: false }],
      },
    });
    const spells = [{ name: "Fire Bolt", attackBonus: "+3", saveDc: null, castingTime: "1 Action", range: "120 ft", damage: "1d10 fire", healing: null, school: "Evocation", level: 0, concentration: false }];
    const actions = parseActions(data, 2, 2, 2, spells);
    const names = actions.map(a => a.name);
    expect(names.indexOf("Sword")).toBeLessThan(names.indexOf("Fire Bolt"));
    expect(names.indexOf("Fire Bolt")).toBeLessThan(names.indexOf("Rage"));
  });
});
