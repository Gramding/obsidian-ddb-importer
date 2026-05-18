import { htmlToMarkdown } from "./utils";
export interface Spell {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  components: string;
  description: string;
  source: string;
  requiresAttackRoll: boolean;
  requiresSavingThrow: boolean;
  saveDcAbilityId: number | null;
  attackBonus: string | null;
  saveDc: string | null;
  damage: string | null;
  healing: string | null;
}

export interface SpellFile {
  path: string;
  content: string;
}

const ACTIVATION_MAP: Record<number, string> = {
  1: "1 Action", 2: "1 Bonus Action", 3: "1 Reaction",
  4: "1 Minute", 5: "10 Minutes", 6: "1 Minute",
  7: "Special", 8: "No Action", 9: "Hours", 10: "Special",
};

const COMPONENT_MAP: Record<number, string> = {
  1: "V", 2: "S", 3: "M",
};

const DAMAGE_TYPES = [
  "acid", "bludgeoning", "cold", "fire", "force", "lightning",
  "necrotic", "piercing", "poison", "psychic", "radiant",
  "slashing", "thunder",
];

function parseActivation(activation: any): string {
  if (!activation) return "Unknown";
  const time = activation.activationTime ?? 1;
  const type = ACTIVATION_MAP[activation.activationType] ?? "Special";
  if (time === 1) return type;
  return `${time} ${type}`;
}

function parseRange(range: any): string {
  if (!range) return "Unknown";
  if (range.origin === "Touch") return "Touch";
  if (range.origin === "Self") return "Self";
  if (range.rangeValue) return `${range.rangeValue} ft`;
  return range.origin ?? "Unknown";
}

function parseDuration(duration: any): string {
  if (!duration) return "Unknown";
  if (duration.durationType === "Instantaneous") return "Instantaneous";
  if (duration.durationInterval && duration.durationUnit) {
    return `${duration.durationInterval} ${duration.durationUnit}`;
  }
  return duration.durationType ?? "Unknown";
}

function parseComponents(components: number[], componentsDescription: string): string {
  const comps = (components ?? []).map((c: number) => COMPONENT_MAP[c] ?? "").filter(Boolean).join(", ");
  if (componentsDescription) return `${comps} (${componentsDescription})`;
  return comps;
}


function parseDiceFromDescription(description: string): { damage: string | null; healing: string | null } {
  const damageRegex = /(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+(\w+)\s+damage/gi;
  const damageMatches: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = damageRegex.exec(description)) !== null) {
    const dice = m[1] ?? "";
    const type = (m[2] ?? "").toLowerCase();
    if (DAMAGE_TYPES.includes(type)) {
      damageMatches.push(`${dice} ${type}`);
    }
  }

  // Match patterns like:
  // "regains a number of hit points equal to 1d8"
  // "restore 1d8 hit points"
  // "heals 1d8"
  // "regain 1d8"
  const healRegex = /(?:regain|restore|heal)\w*(?:[^.]{0,40}?)(\d+d\d+)/gi;
  const healMatches: string[] = [];
  while ((m = healRegex.exec(description)) !== null) {
    if (m[1]) healMatches.push(m[1]);
  }

  return {
    damage: damageMatches.length > 0 ? damageMatches.join(" + ") : null,
    healing: healMatches.length > 0 ? healMatches[0] ?? null : null,
  };
}
function computeSpellStats(
  description: string,
  profBonus: number,
  intMod: number,
  requiresAttackRoll: boolean,
  requiresSavingThrow: boolean,
): { attackBonus: string | null; saveDc: string | null; damage: string | null; healing: string | null } {
  const spellAttackBonus = profBonus + intMod;
  const spellSaveDc = 8 + profBonus + intMod;
  const { damage, healing } = parseDiceFromDescription(description);

  let healingWithMod = healing;
  if (healing) {
    const modStr = intMod >= 0 ? `+${intMod}` : `${intMod}`;
    healingWithMod = `${healing}${modStr}`;
  }

  return {
    attackBonus: requiresAttackRoll ? `+${spellAttackBonus}` : null,
    saveDc: requiresSavingThrow ? `DC ${spellSaveDc}` : null,
    damage,
    healing: healingWithMod,
  };
}

function parseSpellEntry(entry: any, source: string, profBonus: number, intMod: number): Spell {
  const def = entry.definition;
  const requiresAttackRoll: boolean = def.requiresAttackRoll ?? false;
  const requiresSavingThrow: boolean = def.requiresSavingThrow ?? false;
  const saveDcAbilityId: number | null = def.saveDcAbilityId ?? null;
  const description = htmlToMarkdown(def.description ?? def.snippet ?? "");

  const { attackBonus, saveDc, damage, healing } = computeSpellStats(
    description, profBonus, intMod, requiresAttackRoll, requiresSavingThrow
  );

  return {
    name: def.name,
    level: def.level,
    school: def.school ?? "Unknown",
    castingTime: parseActivation(def.activation),
    range: parseRange(def.range),
    duration: parseDuration(def.duration),
    concentration: def.concentration ?? false,
    ritual: def.ritual ?? false,
    components: parseComponents(def.components ?? [], def.componentsDescription ?? ""),
    description,
    source,
    requiresAttackRoll,
    requiresSavingThrow,
    saveDcAbilityId,
    attackBonus,
    saveDc,
    damage,
    healing,
  };
}

function parseSubclassSpellsFromFeatures(data: any): Map<string, number> {
  const spellLevelMap = new Map<string, number>();
  const ordinalMap: Record<string, number> = {
    "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5,
    "6th": 6, "7th": 7, "8th": 8, "9th": 9,
    "10th": 10, "11th": 11, "12th": 12, "13th": 13,
    "14th": 14, "15th": 15, "16th": 16, "17th": 17,
    "18th": 18, "19th": 19, "20th": 20,
  };

  for (const cls of data.classes ?? []) {
    const subDef = cls.subclassDefinition;
    if (!subDef) continue;

    for (const feature of subDef.classFeatures ?? []) {
      if (!feature.name?.toLowerCase().includes("spells")) continue;

      const html: string = feature.description ?? "";
      // Use a non-dotAll regex split approach for wider TS target compat
      const rows = html.split(/<\/tr>/i);
      for (const row of rows) {
        const cellMatch = row.match(/<td>\s*<p>(\w+)<\/p>\s*<\/td>\s*<td>\s*<p>([\s\S]*?)<\/p>/i);
        if (!cellMatch) continue;
        const ordinal = (cellMatch[1] ?? "").trim();
        const requiredLevel = ordinalMap[ordinal];
        if (!requiredLevel) continue;

        const spellText = (cellMatch[2] ?? "")
          .replace(/<[^>]+>/g, "")
          .replace(/&rsquo;/g, "'")
          .replace(/&amp;/g, "&");

        const names = spellText.split(",").map((s: string) => s.trim()).filter(Boolean);
        for (const name of names) {
          spellLevelMap.set(name.toLowerCase(), requiredLevel);
        }
      }
    }
  }

  return spellLevelMap;
}

export function parseSpells(data: any, profBonus: number, intMod: number): Spell[] {
  const spells: Spell[] = [];
  const seen = new Set<string>();

  // Class spells (prepared/known)
  for (const classSpellGroup of data.classSpells ?? []) {
    for (const entry of classSpellGroup.spells ?? []) {
      const name = entry.definition?.name;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      spells.push(parseSpellEntry(entry, "class", profBonus, intMod));
    }
  }

  // Spells from race, background, feats, items
  for (const [source, entries] of Object.entries(data.spells ?? {}) as [string, any[]][]) {
    for (const entry of entries ?? []) {
      const name = entry.definition?.name;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      spells.push(parseSpellEntry(entry, source, profBonus, intMod));
    }
  }

  // Inject subclass spells parsed from feature HTML that the API omits
  const characterLevel = (data.classes ?? []).reduce((sum: number, c: any) => sum + c.level, 0);
  const subclassSpellMap = parseSubclassSpellsFromFeatures(data);

  for (const [spellName, requiredLevel] of subclassSpellMap.entries()) {
    if (characterLevel < requiredLevel) continue;
    if (seen.has(spellName)) continue;
    seen.add(spellName);

    spells.push({
      name: spellName.replace(/\b\w/g, (c: string) => c.toUpperCase()),
      level: 1,
      school: "Unknown",
      castingTime: "—",
      range: "—",
      duration: "—",
      concentration: false,
      ritual: false,
      components: "—",
      description: "Subclass granted spell. Full details on D&D Beyond.",
      source: "subclass",
      requiresAttackRoll: false,
      requiresSavingThrow: false,
      saveDcAbilityId: null,
      attackBonus: null,
      saveDc: null,
      damage: null,
      healing: null,
    });
  }

  return spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export function renderSpellFiles(charName: string, spells: Spell[], basePath: string): SpellFile[] {
  return spells.map(s => {
    const safeName = s.name.replace(/[\\/:*?"<>|]/g, "");
    const content = `---
name: "${s.name}"
level: ${s.level}
school: "${s.school}"
casting_time: "${s.castingTime}"
range: "${s.range}"
duration: "${s.duration}"
concentration: ${s.concentration}
ritual: ${s.ritual}
components: "${s.components}"
attack_bonus: "${s.attackBonus ?? '—'}"
save_dc: "${s.saveDc ?? '—'}"
damage: "${s.damage ?? '—'}"
healing: "${s.healing ?? '—'}"
source: "${s.source}"
character: "${charName}"
tags:
  - dnd/spell
  - dnd/${charName.toLowerCase().replace(/\s+/g, "-")}
---

# ${s.name}

| | |
|---|---|
| **Level** | ${s.level === 0 ? "Cantrip" : `Level ${s.level}`} |
| **School** | ${s.school} |
| **Casting Time** | ${s.castingTime} |
| **Range** | ${s.range} |
| **Duration** | ${s.duration} |
| **Components** | ${s.components} |
| **Concentration** | ${s.concentration ? "Yes" : "No"} |
| **Ritual** | ${s.ritual ? "Yes" : "No"} |
| **Attack Bonus** | ${s.attackBonus ?? "—"} |
| **Save DC** | ${s.saveDc ?? "—"} |
| **Damage** | ${s.damage ?? "—"} |
| **Healing** | ${s.healing ?? "—"} |

${s.description}
`;
    return {
      path: `${basePath}/Spells/${safeName}.md`,
      content,
    };
  });
}

export function renderSpellBase(charName: string, basePath: string): string {
  const folder = `${basePath}/Spells`;
  return `filters:
  and:
    - file.inFolder("${folder}")
properties:
  level:
    displayName: Level
  school:
    displayName: School
  casting_time:
    displayName: Casting Time
  range:
    displayName: Range
  duration:
    displayName: Duration
  concentration:
    displayName: C
  ritual:
    displayName: R
  attack_bonus:
    displayName: Attack
  save_dc:
    displayName: Save DC
  damage:
    displayName: Damage
  healing:
    displayName: Healing
views:
  - type: table
    name: All Spells
    order:
      - file.name
      - level
      - school
      - casting_time
      - range
      - duration
      - concentration
      - ritual
      - attack_bonus
      - save_dc
      - damage
      - healing
    sort:
      - property: level
        direction: ASC
      - property: file.name
        direction: ASC
  - type: table
    name: Cantrips
    filters:
      and:
        - level == 0
    order:
      - file.name
      - school
      - casting_time
      - range
      - duration
      - damage
  - type: table
    name: Leveled
    filters:
      and:
        - level > 0
    order:
      - file.name
      - level
      - school
      - casting_time
      - concentration
      - attack_bonus
      - save_dc
      - damage
      - healing
    sort:
      - property: level
        direction: ASC
      - casting_time
      - range
      - duration
      - damage
  - type: table
    name: Leveled
    filters:
      and:
        - level > 0
    order:
      - file.name
      - level
      - school
      - casting_time
      - concentration
      - attack_bonus
      - save_dc
      - damage
      - healing
    sort:
      - property: level
        direction: ASC
`;
}


