import { CharacterStats, mod } from "./parser";

export function renderNote(char: CharacterStats): string {
  const { abilities: ab } = char;

  return `---
name: "${char.name}"
race: "${char.race}"
class: "${char.classes}"
level: ${char.level}
hp_current: ${char.hp.current}
hp_max: ${char.hp.max}
hp_temp: ${char.hp.temp}
ac: ${char.ac}
initiative: ${char.initiative}
speed: ${char.speed}
str: ${ab.str}
dex: ${ab.dex}
con: ${ab.con}
int: ${ab.int}
wis: ${ab.wis}
cha: ${ab.cha}
proficiency_bonus: ${char.proficiencyBonus}
synced_at: "${new Date().toISOString()}"
---

# ${char.name}
**${char.race}** · ${char.classes} · Level ${char.level}

## Hit Points
| Current | Max | Temp |
|---------|-----|------|
| ${char.hp.current} | ${char.hp.max} | ${char.hp.temp} |

## Combat
| AC | Initiative | Speed | Proficiency |
|----|-----------|-------|-------------|
| ${char.ac} | ${mod(ab.dex)} | ${char.speed} ft | +${char.proficiencyBonus} |

## Ability Scores
| STR | DEX | CON | INT | WIS | CHA |
|-----|-----|-----|-----|-----|-----|
| ${ab.str} (${mod(ab.str)}) | ${ab.dex} (${mod(ab.dex)}) | ${ab.con} (${mod(ab.con)}) | ${ab.int} (${mod(ab.int)}) | ${ab.wis} (${mod(ab.wis)}) | ${ab.cha} (${mod(ab.cha)}) |

> Synced from [D&D Beyond](https://www.dndbeyond.com/characters/${/* id injected in main */ ""}) at ${new Date().toLocaleString()}
`;
}
