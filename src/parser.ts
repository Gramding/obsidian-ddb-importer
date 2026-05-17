export interface ConsumableItem {
  label: string;
  stateKey: string;
  uses: number;
  resetOn: string | null;
}

export interface CharacterStats {
// Add to CharacterStats interface
passives: {
  perception: number;
  investigation: number;
  insight: number;
};
  name: string;
  race: string;
  classes: string;
  level: number;
  ac: number;
  initiative: number;
  speed: number;
  hp: {
    current: number;
    max: number;
    temp: number;
  };
  abilities: {
    str: number; dex: number; con: number;
    int: number; wis: number; cha: number;
  };
  proficiencyBonus: number;
  rawClasses: { name: string; level: number }[];
  skillProficiencies: string[];
  consumables: ConsumableItem[];
}

const ALL_SKILLS = new Set([
  "acrobatics", "animal-handling", "arcana", "athletics",
  "deception", "history", "insight", "intimidation",
  "investigation", "medicine", "nature", "perception",
  "performance", "persuasion", "religion", "sleight-of-hand",
  "stealth", "survival",
]);

function extractSkillProficiencies(modifiers: Record<string, any[]>): string[] {
  const skills = new Set<string>();
  for (const group of Object.values(modifiers)) {
    for (const mod of group ?? []) {
      if (mod.type === "proficiency" && mod.subType && ALL_SKILLS.has(mod.subType)) {
        skills.add(mod.subType);
      }
    }
  }
  return Array.from(skills).sort();
}

function calculateAc(inventory: any[], dexMod: number, overrideAc: number | null): number {
  if (overrideAc != null) return overrideAc;

  let armorAc = 0;
  let armorType = 0;
  let shieldBonus = 0;

  for (const item of inventory) {
    if (!item.equipped) continue;
    const def = item.definition;
    if (!def.armorClass) continue;

    if (def.armorTypeId === 4) {
      shieldBonus += def.armorClass;
    } else if (def.armorTypeId != null) {
      if (def.armorClass > armorAc) {
        armorAc = def.armorClass;
        armorType = def.armorTypeId;
      }
    }
  }

  if (armorAc === 0) {
    return 10 + dexMod + shieldBonus;
  }

  let ac = armorAc;
  if (armorType === 1) {
    ac += dexMod;
  } else if (armorType === 2) {
    ac += Math.min(dexMod, 2);
  }

  return ac + shieldBonus;
}

function resetTypeToString(resetType: number | null): string | null {
  if (resetType === 1) return "short-rest";
  if (resetType === 2 || resetType === 4) return "long-rest";
  return null;
}

const ARTIFICER_SPELL_SLOTS: Record<number, number[]> = {
  1:  [2, 0, 0, 0, 0],
  2:  [2, 0, 0, 0, 0],
  3:  [3, 0, 0, 0, 0],
  4:  [3, 0, 0, 0, 0],
  5:  [4, 2, 0, 0, 0],
  6:  [4, 2, 0, 0, 0],
  7:  [4, 3, 0, 0, 0],
  8:  [4, 3, 0, 0, 0],
  9:  [4, 3, 2, 0, 0],
  10: [4, 3, 2, 0, 0],
  11: [4, 3, 3, 0, 0],
  12: [4, 3, 3, 0, 0],
  13: [4, 3, 3, 1, 0],
  14: [4, 3, 3, 1, 0],
  15: [4, 3, 3, 2, 0],
  16: [4, 3, 3, 2, 0],
  17: [4, 3, 3, 3, 1],
  18: [4, 3, 3, 3, 1],
  19: [4, 3, 3, 3, 2],
  20: [4, 3, 3, 3, 2],
};

const FULL_CASTER_SPELL_SLOTS: Record<number, number[]> = {
  1:  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  2:  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  3:  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  4:  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  5:  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  6:  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  7:  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  8:  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  9:  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
  11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

const HALF_CASTER_SPELL_SLOTS: Record<number, number[]> = {
  2:  [2, 0, 0, 0, 0],
  3:  [3, 0, 0, 0, 0],
  4:  [3, 0, 0, 0, 0],
  5:  [4, 2, 0, 0, 0],
  6:  [4, 2, 0, 0, 0],
  7:  [4, 3, 0, 0, 0],
  8:  [4, 3, 0, 0, 0],
  9:  [4, 3, 2, 0, 0],
  10: [4, 3, 2, 0, 0],
  11: [4, 3, 3, 0, 0],
  12: [4, 3, 3, 0, 0],
  13: [4, 3, 3, 1, 0],
  14: [4, 3, 3, 1, 0],
  15: [4, 3, 3, 2, 0],
  16: [4, 3, 3, 2, 0],
  17: [4, 3, 3, 3, 1],
  18: [4, 3, 3, 3, 1],
  19: [4, 3, 3, 3, 2],
  20: [4, 3, 3, 3, 2],
};

const FULL_CASTERS     = new Set(["wizard", "cleric", "druid", "bard", "sorcerer"]);
const HALF_CASTERS     = new Set(["paladin", "ranger"]);
const ARTIFICER_CASTERS = new Set(["artificer"]);

function getSpellSlotConsumables(rawClasses: { name: string; level: number }[]): ConsumableItem[] {
  const items: ConsumableItem[] = [];
  const levelLabel = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

  for (const cls of rawClasses) {
    const name = cls.name.toLowerCase();
    let table: Record<number, number[]> | null = null;

    if (FULL_CASTERS.has(name))          table = FULL_CASTER_SPELL_SLOTS;
    else if (HALF_CASTERS.has(name))     table = HALF_CASTER_SPELL_SLOTS;
    else if (ARTIFICER_CASTERS.has(name)) table = ARTIFICER_SPELL_SLOTS;

    if (!table) continue;

    const slots = table[cls.level] ?? [];
    slots.forEach((count, i) => {
      if (count > 0) {
        items.push({
          label: `${levelLabel[i]} Level Spell Slots`,
          stateKey: `${name}_spell_slots_${i + 1}`,
          uses: count,
          resetOn: "long-rest",
        });
      }
    });
  }

  return items;
}

function extractConsumables(
  actions: Record<string, any[]>,
  rawClasses: { name: string; level: number }[],
  profBonus: number,
  intMod: number
): ConsumableItem[] {
  const items: ConsumableItem[] = [];

  items.push(...getSpellSlotConsumables(rawClasses));

  for (const group of Object.values(actions)) {
    for (const action of group ?? []) {
      const lu = action.limitedUse;
      if (!lu) continue;

      let uses = lu.maxUses;
      if (lu.useProficiencyBonus)           uses = profBonus;
      else if (lu.statModifierUsesId === 4) uses = Math.max(1, intMod);
      else if (lu.statModifierUsesId === 3) uses = Math.max(1, intMod);

      if (uses <= 0) continue;

      const stateKey = action.name
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      items.push({
        label: action.name,
        stateKey,
        uses,
        resetOn: resetTypeToString(lu.resetType),
      });
    }
  }

  return items;
}

const ABILITY_KEY_MAP: Record<string, "str" | "dex" | "con" | "int" | "wis" | "cha"> = {
  strength: "str", dexterity: "dex", constitution: "con",
  intelligence: "int", wisdom: "wis", charisma: "cha",
};

const STAT_ID_MAP: Record<number, "str" | "dex" | "con" | "int" | "wis" | "cha"> = {
  1: "str", 2: "dex", 3: "con", 4: "int", 5: "wis", 6: "cha",
};

export function parseCharacter(data: any): CharacterStats {
  const name = data.name;
  const race = data.race?.fullName ?? data.race?.baseName ?? "Unknown";

  const rawClasses: { name: string; level: number }[] = (data.classes ?? []).map((c: any) => ({
    name: c.definition?.name ?? "Unknown",
    level: c.level,
  }));

  const classInfo: string[] = (data.classes ?? []).map((c: any) => {
    const subclass = c.subclassDefinition?.name;
    const className = c.definition?.name ?? "Unknown";
    return subclass ? `${className} (${subclass}) ${c.level}` : `${className} ${c.level}`;
  });

  const level = (data.classes ?? []).reduce((sum: number, c: any) => sum + c.level, 0);

  // Base stats from rolled/assigned values
// Step 1: base rolled stats
const baseStats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

for (const stat of data.stats ?? []) {
  const key = STAT_ID_MAP[stat.id];
  if (key) baseStats[key] = stat.value ?? 10;
}

// Step 2: override stats (DM-set absolute values, highest priority)
for (const stat of data.overrideStats ?? []) {
  if (stat.value == null) continue;
  const key = STAT_ID_MAP[stat.id];
  if (key) baseStats[key] = stat.value;
}

// Step 3: collect all modifiers by ability
const setBonuses: Partial<Record<keyof typeof baseStats, number>> = {};
const addBonuses: Partial<Record<keyof typeof baseStats, number>> = {};

for (const modGroup of Object.values(data.modifiers ?? {}) as any[][]) {
  for (const mod of modGroup ?? []) {
    const subType: string = mod.subType ?? "";
    if (!subType.endsWith("-score")) continue;

    const rawKey = subType.replace("-score", "");
    const key = ABILITY_KEY_MAP[rawKey];
    if (!key) continue;

    const val: number = mod.value ?? mod.fixedValue ?? 0;

    if (mod.type === "set") {
      // Take the highest set value (e.g. multiple items setting STR)
      setBonuses[key] = Math.max(setBonuses[key] ?? 0, val);
    } else if (mod.type === "bonus") {
      addBonuses[key] = (addBonuses[key] ?? 0) + val;
    }
  }
}

// Apply: set overrides base+bonus if it results in a higher value
for (const key of Object.keys(baseStats) as (keyof typeof baseStats)[]) {
  const withBonus = baseStats[key] + (addBonuses[key] ?? 0);
  const setVal = setBonuses[key];
  if (setVal != null) {
    // Use whichever is higher — set or base+bonus
    baseStats[key] = Math.max(withBonus, setVal);
  } else {
    baseStats[key] = withBonus;
  }
}

  const profBonus = level >= 17 ? 6 : level >= 13 ? 5 : level >= 9 ? 4 : level >= 5 ? 3 : 2;
  const dexMod = Math.floor((baseStats.dex - 10) / 2);
  const conMod = Math.floor((baseStats.con - 10) / 2);
  const intMod = Math.floor((baseStats.int - 10) / 2);

  // HP: baseHitPoints is hit dice total only — add CON mod per level
  const maxHp = (data.overrideHitPoints != null)
    ? data.overrideHitPoints
    : (data.baseHitPoints ?? 0) + (conMod * level) + (data.bonusHitPoints ?? 0);
  const removedHp = data.removedHitPoints ?? 0;
  const tempHp = data.temporaryHitPoints ?? 0;

  const ac = calculateAc(data.inventory ?? [], dexMod, data.overrideArmorClass ?? null);
  // Speed: base from race + any bonus modifiers
const baseSpeed = data.race?.weightSpeeds?.normal?.walk ?? 30;

const speedBonus = (Object.values(data.modifiers ?? {}) as any[][])
  .flat()
  .filter((m: any) => m.type === "bonus" && m.subType === "speed")
  .reduce((sum: number, m: any) => sum + (m.value ?? m.fixedValue ?? 0), 0);

const speed = baseSpeed + speedBonus;
  const skillProficiencies = extractSkillProficiencies(data.modifiers ?? {});
  const consumables = extractConsumables(data.actions ?? {}, rawClasses, profBonus, intMod);

// Passive scores = 10 + skill modifier
// Skill modifier = ability mod + proficiency if proficient
const wisMod = Math.floor((baseStats.wis - 10) / 2);
const intModFinal = Math.floor((baseStats.int - 10) / 2);

const allMods = (Object.values(data.modifiers ?? {}) as any[][]).flat();

const hasProficiency = (skill: string) =>
  allMods.some((m: any) => m.type === "proficiency" && m.subType === skill);

const hasExpertise = (skill: string) =>
  allMods.some((m: any) => m.type === "expertise" && m.subType === skill);

const skillMod = (abilityMod: number, skill: string) => {
  if (hasExpertise(skill)) return abilityMod + profBonus * 2;
  if (hasProficiency(skill)) return abilityMod + profBonus;
  return abilityMod;
};

const passives = {
  perception:    10 + skillMod(wisMod, "perception"),
  investigation: 10 + skillMod(intModFinal, "investigation"),
  insight:       10 + skillMod(wisMod, "insight"),
};

  return {
    name,
    race,
    classes: classInfo.join(" / "),
    level,
    ac,
    initiative: dexMod,
    speed,
    hp: { current: maxHp - removedHp, max: maxHp, temp: tempHp },
    abilities: baseStats,
    proficiencyBonus: profBonus,
    rawClasses,
    skillProficiencies,
    consumables,
	passives,
  };
}

export function mod(score: number): string {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}
