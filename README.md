# obsidian-ddb-importer

> [!WARNING]
> ## ⚠️ COMPLETELY VIBE CODED ⚠️
> This plugin was entirely vibe coded from start to finish. No guarantees, no warranties, no promises.
> It works on my machine. It might work on yours. It might delete your notes, summon a demon, or roll a nat 1.
> Use at your own risk. Back up your vault. You have been warned.

---

> **Disclaimer**: This project is not affiliated with, endorsed by, or in any way connected to the
> [DDB-Importer](https://github.com/MrPrimate/ddb-importer) project for Foundry VTT by MrPrimate.
> They are completely separate projects that happen to share a similar abbreviation. Go check their
> work out though — it's excellent.

---

A plugin for [Obsidian](https://obsidian.md) that imports your D&D Beyond\* character sheets directly
into your vault — including stats, HP, spells, inventory, consumables, features, proficiencies, and more.
It also includes a set of custom code block renderers that display your character sheet natively inside
Obsidian, no external plugin required.

\*D&D Beyond is a trademark of Wizards of the Coast LLC. This plugin is unofficial, unaffiliated with,
and not endorsed by Wizards of the Coast, D&D Beyond, or Hasbro in any way.

## Features

### Importing
- Import character stats, ability scores, AC, HP, speed, saving throws, and passives
- Correct AC calculation for light, medium, and heavy armor plus shields
- Handles `set` and `bonus` stat modifiers (e.g. Belt of Giant Strength)
- Speed bonuses from class features (e.g. Monk Unarmored Movement)
- Subclass granted spells parsed from feature descriptions (even when the API omits them)
- Individual spell notes with school, casting time, range, damage, healing, attack bonus, and save DC
- Individual inventory item notes with type, rarity, weight, AC, and damage
- Individual feature and trait notes with full descriptions and converted HTML tables
- Spell, inventory, and feature master views as Obsidian `.base` files with multiple views
- Proficiencies file with armor, weapons, tools, and languages
- Actions overview with weapons, spell attacks, and class actions
- Defenses with resistances, immunities, vulnerabilities, advantages, and disadvantages
- Optional character portrait download
- Supports multiple characters — each imports into its own configurable folder

### Rendering
A set of native Obsidian code block renderers that display your character sheet without any external plugin dependency:

| Block | Description |
|-------|-------------|
| `ddb-sheet` | Master block — renders the full character sheet in a condensed two-column layout |
| `ddb-header` | Portrait, name, race, class, level, quick stats |
| `ddb-abilities` | Six ability scores with modifiers |
| `ddb-combat` | AC, initiative, speed, proficiency, spell stats |
| `ddb-hp` | Interactive HP tracker with healing, damage, temp HP, and max override — state persists across sessions |
| `ddb-saves` | Saving throws with proficiency indicators |
| `ddb-skills` | All 18 skills with proficiency, expertise, and disadvantage markers |
| `ddb-defenses` | Resistances, immunities, vulnerabilities, advantages, disadvantages |
| `ddb-passives` | Passive perception, investigation, and insight |
| `ddb-actions` | Attack and action table |
| `ddb-spells` | Spell slots and spell list by level |
| `ddb-inventory` | Equipped and carried items |
| `ddb-features` | Features and traits grouped by source |
| `ddb-consumables` | Limited use resources with use tracking |

## Requirements

- Obsidian 1.9.2 or later (for `.base` file support)
- A D&D Beyond account with at least one character set to **Public**, or a CobaltSession token for private characters
- Optionally: [obsidian-dnd-ui-toolkit](https://github.com/hay-kot/obsidian-dnd-ui-toolkit) for additional UI blocks

## Installation via BRAT

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin in Obsidian
2. Open BRAT settings → **Add Beta Plugin**
3. Enter `Gramding/obsidian-ddb-importer`
4. Click **Add Plugin** and enable it in Community Plugins

## Manual Installation

1. Clone or download this repo into your vault's `.obsidian/plugins/` folder:

```bash
cd /path/to/vault/.obsidian/plugins
git clone https://github.com/Gramding/obsidian-ddb-importer
cd obsidian-ddb-importer
npm install && npm run build
```

2. Enable the plugin in Obsidian under Settings → Community Plugins

## Usage

1. Open Settings → DDB Importer
2. Click **+ Add Character** and enter your character ID
   - Your character ID is the number at the end of the character URL: `dndbeyond.com/characters/12345678`
3. Optionally set a sync folder, enable portrait download, and paste your `CobaltSession` token for private characters
4. Click **Sync** next to a character or **Sync All** to import everything

Each character imports into a folder named after the character:

```
Ranfred/
  Ranfred.md                  ← main character sheet with ddb-sheet block
  Ranfred - Spells.base       ← spell database (All / Cantrips / Leveled views)
  Ranfred - Inventory.base    ← inventory database (All / Equipped / Magic Items views)
  Ranfred - Features.base     ← features database (All / Class / Racial / Feats views)
  Ranfred - Actions.md        ← action overview
  Components/
    portrait.jpeg             ← character portrait (optional)
    Proficiencies.md
    Spells/
      Cure Wounds.md
      Ray of Sickness.md
      ...
    Items/
      Scale Mail.md
      Bag of Holding.md
      ...
    Features/
      Magical Tinkering.md
      Armored Casing.md
      ...
```

## Using the Code Blocks

The `ddb-sheet` block renders everything automatically from your character note's frontmatter:

````markdown
```ddb-sheet
```
````

Or use individual blocks for a custom layout:

````markdown
```ddb-header
```

```ddb-hp
```

```ddb-abilities
```
````

The interactive HP tracker (`ddb-hp`) saves its state to the plugin's data store — current HP, temp HP, and max overrides persist across Obsidian restarts and sync operations.

## Getting your CobaltSession token

Only needed for private characters:

1. Log into D&D Beyond in your browser
2. Open DevTools (`F12`) → Application → Cookies → `dndbeyond.com`
3. Copy the value of the `CobaltSession` cookie
4. Paste it into the plugin settings

## Important Disclaimers

- This plugin uses D&D Beyond's **unofficial internal API** which is not publicly documented and may change or break at any time without notice
- This plugin is not affiliated with, endorsed by, or connected to Wizards of the Coast, D&D Beyond, or Hasbro
- This plugin is not affiliated with the [DDB-Importer](https://github.com/MrPrimate/ddb-importer) Foundry VTT plugin by MrPrimate
- Use responsibly and in accordance with D&D Beyond's Terms of Service
- D&D Beyond™ is a trademark of Wizards of the Coast LLC
- Dungeons & Dragons™ is a trademark of Wizards of the Coast LLC
