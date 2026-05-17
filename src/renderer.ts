import { CharacterStats } from "./parser";

const CLASS_HIT_DICE: Record<string, string> = {
  barbarian: "d12", fighter: "d10", paladin: "d10", ranger: "d10",
  bard: "d8", cleric: "d8", druid: "d8", monk: "d8", rogue: "d8", warlock: "d8",
  sorcerer: "d6", wizard: "d6", artificer: "d8",
};

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

export function renderNote(char: CharacterStats, characterId: string): string {
  const { abilities: ab } = char;
  const hitdice = getHitDice(char);
  const stateKey = char.name.toLowerCase().replace(/\s+/g, "_");
  const baseName = char.name;

  return `---
name: "${char.name}"
race: "${char.race}"
class: "${char.classes}"
level: ${char.level}
proficiency_bonus: ${char.proficiencyBonus}
ac: ${char.ac}
speed: ${char.speed}
synced_at: "${new Date().toISOString()}"
---

# ${char.name}

\`\`\`badges
items:
  - label: Race
    value: "${char.race}"
  - label: Class
    value: "${char.classes}"
  - label: Level
    value: "{{ frontmatter.level }}"
  - label: AC
    value: "${char.ac}"
  - label: Initiative
    value: "+{{ modifier abilities.dexterity }}"
  - label: Speed
    value: "${char.speed} ft"
  - label: Spell Modifier
    value: "+${Math.floor((char.abilities.int - 10) / 2)}"
  - label: Spell Attack
    value: "+${char.proficiencyBonus + Math.floor((char.abilities.int - 10) / 2)}"
  - label: Spell Save DC
    value: "${8 + char.proficiencyBonus + Math.floor((char.abilities.int - 10) / 2)}"
\`\`\`

\`\`\`healthpoints
state_key: ${stateKey}_health
health: ${char.hp.max}
hitdice:
${hitdice}
reset_on: long-rest
\`\`\`

\`\`\`ability
abilities:
  strength: ${ab.str}
  dexterity: ${ab.dex}
  constitution: ${ab.con}
  intelligence: ${ab.int}
  wisdom: ${ab.wis}
  charisma: ${ab.cha}
\`\`\`

${renderSkills(char.skillProficiencies)}

${renderConsumables(char)}

> [!info]- Spells
> ![[${baseName} - Spells.base]]

> [!info]- Inventory
> ![[${baseName} - Inventory.base]]

> Synced from [D&D Beyond](https://www.dndbeyond.com/characters/${characterId}) · ${new Date().toLocaleString()}
`;
}
