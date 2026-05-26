import { CharacterStats } from "./parser";

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
spell_slots: ${JSON.stringify(char.spellSlots)}
---
# ${char.name}


\`\`\`ddb-sheet
\`\`\`
\`\`\`ddb-tabs
\`\`\`
\`\`\`ddb-currency
\`\`\`
\`\`\`ddb-conditions
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
