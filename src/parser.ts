export interface CharacterStats {
  name: string;
  race: string;
  classes: string;         // e.g. "Fighter 3 / Wizard 2"
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
}

export function parseCharacter(data: any): CharacterStats {
  // Basic info
  const name = data.name;
  const race = data.race?.fullName ?? data.race?.baseName ?? "Unknown";

  // Classes and total level
  const classInfo: string[] = (data.classes ?? []).map((c: any) => {
    const subclass = c.subclassDefinition?.name;
    const name = c.definition?.name ?? "Unknown";
    return subclass ? `${name} (${subclass}) ${c.level}` : `${name} ${c.level}`;
  });
  const level = (data.classes ?? []).reduce((sum: number, c: any) => sum + c.level, 0);

  // Ability scores — base + racial + ASI bonuses all live in different places
  const baseStats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const statMap: Record<number, keyof typeof baseStats> = {
    1: "str", 2: "dex", 3: "con", 4: "int", 5: "wis", 6: "cha",
  };

  // Apply base stats
  for (const stat of data.stats ?? []) {
    const key = statMap[stat.id];
    if (key) baseStats[key] = stat.value ?? 10;
  }

  // Apply racial bonuses
  for (const mod of data.race?.racialTraits?.flatMap((t: any) => t.definition?.modifiers ?? []) ?? []) {
    if (mod.type === "bonus" && mod.subType?.includes("-score")) {
      const key = mod.subType.replace("-score", "") as keyof typeof baseStats;
      if (key in baseStats) baseStats[key] += mod.value ?? 0;
    }
  }

  // Proficiency bonus
  const profBonus = Math.ceil(1 + level / 4);

  // HP: baseHitPoints is the rolled/fixed total; removedHitPoints is damage taken
  const maxHp = data.baseHitPoints ?? 0;
  const removedHp = data.removedHitPoints ?? 0;
  const tempHp = data.temporaryHitPoints ?? 0;

  // AC: pull from inventory equipped items or override
  const overrideAc = data.overrideArmorClass;
  // Simple fallback — full AC calc requires gear parsing
  const ac = overrideAc ?? 10 + Math.floor((baseStats.dex - 10) / 2);

  // Initiative
  const initiative = Math.floor((baseStats.dex - 10) / 2);

  // Speed
  const speed = data.race?.weightSpeeds?.normal?.walk ?? 30;

  return {
    name, race,
    classes: classInfo.join(" / "),
    level,
    ac, initiative, speed,
    hp: { current: maxHp - removedHp, max: maxHp, temp: tempHp },
    abilities: baseStats,
    proficiencyBonus: profBonus,
  };
}

function mod(score: number): string {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

export { mod };
