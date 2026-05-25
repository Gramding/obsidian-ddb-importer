import { CharacterStats, CLASS_HIT_DICE } from "./parser";

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function renderDefenses(char: CharacterStats): string {
  const { defenses: d } = char;

  if (
    d.resistances.length === 0 &&
    d.immunities.length === 0 &&
    d.vulnerabilities.length === 0 &&
    d.advantages.length === 0 &&
    d.disadvantages.length === 0
  ) return "";

  const items: string[] = [];

  for (const r of d.resistances)      items.push(`  - label: "Resistance"\n    value: "${r}"`);
  for (const i of d.immunities)       items.push(`  - label: "Immunity"\n    value: "${i}"`);
  for (const v of d.vulnerabilities)  items.push(`  - label: "Vulnerability"\n    value: "${v}"`);
  for (const a of d.advantages)       items.push(`  - label: "Advantage"\n    value: "${a}"`);
  for (const da of d.disadvantages)   items.push(`  - label: "Disadvantage"\n    value: "${da}"`);

  return `\`\`\`badges
items:
${items.join("\n")}
\`\`\``;
}
function renderProficiencies(char: CharacterStats): string {
  const rows = [
    ["Armor",     char.proficiencies.armor.join(", ")     || "—"],
    ["Weapons",   char.proficiencies.weapons.join(", ")   || "—"],
    ["Tools",     char.proficiencies.tools.join(", ")     || "—"],
    ["Languages", char.proficiencies.languages.join(", ") || "—"],
  ];

  const table = rows.map(([cat, vals]) => `| **${cat}** | ${vals} |`).join("\n");

  return `## Proficiencies & Training

| Type | Proficiencies |
|---|---|
${table}`;
}

function getHitDice(char: CharacterStats): string {
  const classes = char.rawClasses ?? [];
  if (classes.length === 0) return `  dice: d8\n  value: ${char.level}`;
  if (classes.length === 1) {
    const cls = classes[0];
    if (!cls) return `  dice: d8\n  value: ${char.level}`;
    const die = CLASS_HIT_DICE[cls.name.toLowerCase()] ?? "d8";
    return `  dice: ${die}\n  value: ${cls.level}`;
  }
  return classes.map(c => {
    const die = CLASS_HIT_DICE[c.name.toLowerCase()] ?? "d8";
    return `  - dice: ${die} # ${c.name}\n    value: ${c.level}`;
  }).join("\n");
}
function renderSkills(skills: string[]): string {
  if (skills.length === 0) return "";
  return `\`\`\`skills
proficiencies:
${skills.map(s => `  - ${s}`).join("\n")}
\`\`\``;
}

function renderConsumables(char: CharacterStats): string {
  if (char.consumables.length === 0) return "";
  const items = char.consumables.map(c => {
    const reset = c.resetOn ? `\n    reset_on: "${c.resetOn}"` : `\n    reset_on:`;
    return `  - label: "${c.label}"\n    state_key: ${c.stateKey}\n    uses: ${c.uses}${reset}`;
  }).join("\n");

  return `\`\`\`consumable
items:
${items}
\`\`\``;
}

export function renderNote(char: CharacterStats, characterId: string, portraitPath: string | null = null): string {
  const baseName = char.name;
 // Portrait frontmatter — use just the filename for Obsidian wikilink
  const portraitFrontmatter = portraitPath
    ? `portrait: "[[${portraitPath}]]"`
    : `portrait: null`;

  return `---
name: "${char.name}"
race: "${char.race}"
class: "${char.classes}"
level: ${char.level}
proficiency_bonus: ${char.proficiencyBonus}
ac: ${char.ac}
speed: ${char.speed}
synced_at: "${new Date().toISOString()}"
${portraitFrontmatter}
skill_proficiencies: [${char.skillProficiencies.map(s => `"${s}"`).join(", ")}]
resistances: [${char.defenses.resistances.map(s => `"${s}"`).join(", ")}]
immunities: [${char.defenses.immunities.map(s => `"${s}"`).join(", ")}]
vulnerabilities: [${char.defenses.vulnerabilities.map(s => `"${s}"`).join(", ")}]
advantages: [${char.defenses.advantages.map(s => `"${s}"`).join(", ")}]
disadvantages: [${char.defenses.disadvantages.map(s => `"${s}"`).join(", ")}]
passive_perception: ${char.passives.perception}
passive_investigation: ${char.passives.investigation}
passive_insight: ${char.passives.insight}
str_save: ${char.savingThrows.str}
dex_save: ${char.savingThrows.dex}
con_save: ${char.savingThrows.con}
int_save: ${char.savingThrows.int}
wis_save: ${char.savingThrows.wis}
cha_save: ${char.savingThrows.cha}
hp_current: ${char.hp.current}
hp_max: ${char.hp.max}
hp_temp: ${char.hp.temp}
str: ${char.abilities.str}
dex: ${char.abilities.dex}
con: ${char.abilities.con}
int: ${char.abilities.int}
wis: ${char.abilities.wis}
cha: ${char.abilities.cha}
cp: ${char.currencies.cp}
sp: ${char.currencies.sp}
ep: ${char.currencies.ep}
gp: ${char.currencies.gp}
pp: ${char.currencies.pp}
hit_dice: ${JSON.stringify(char.hitDice)}
---
# ${char.name}


\`\`\`ddb-sheet
\`\`\`
\`\`\`ddb-tabs
\`\`\`
\`\`\`ddb-currency
\`\`\`

> [!abstract]- Proficiencies & Training
> ![[Proficiencies]]

> [!abstract]- Actions
> ![[${baseName} - Actions]]

> [!abstract]- Features & Traits
> ![[${baseName} - Features.base]]

> [!abstract]- Spells
> ![[${baseName} - Spells.base]]

> [!abstract]- Inventory
> ![[${baseName} - Inventory.base]]

> Synced from [D&D Beyond](https://www.dndbeyond.com/characters/${characterId}) · ${new Date().toLocaleString()}
`;
}
