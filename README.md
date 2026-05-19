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

\*D&D Beyond is a trademark of Wizards of the Coast LLC. This plugin is unofficial, unaffiliated with,
and not endorsed by Wizards of the Coast, D&D Beyond, or Hasbro in any way.

## Features

- Import character stats, ability scores, AC, HP, speed, saving throws, and passives
- Renders using the [obsidian-dnd-ui-toolkit](https://github.com/hay-kot/obsidian-dnd-ui-toolkit) blocks (`badges`, `healthpoints`, `ability`, `skills`, `consumable`)
- Individual spell notes with school, casting time, range, damage, healing, attack bonus, and save DC
- Individual inventory item notes with type, rarity, weight, AC, and damage
- Individual feature and trait notes with full descriptions and converted HTML tables
- Spell and inventory master views as Obsidian `.base` files with multiple views
- Proficiencies file with armor, weapons, tools, and languages
- Actions overview with weapons, spell attacks, and class actions
- Defenses block with resistances, immunities, vulnerabilities, advantages, and disadvantages
- Supports multiple characters — each imports into its own configurable folder
- Subclass granted spells parsed from feature descriptions (even when the API omits them)
- Correct AC calculation for light, medium, and heavy armor plus shields
- Handles `set` and `bonus` stat modifiers (e.g. Belt of Giant Strength)
- Speed bonuses from class features (e.g. Monk Unarmored Movement)
- Optional character portrait download

## Requirements

- Obsidian 1.9.2 or later (for `.base` file support)
- [obsidian-dnd-ui-toolkit](https://github.com/hay-kot/obsidian-dnd-ui-toolkit) plugin installed and enabled
- A D&D Beyond account with at least one character set to **Public**, or a CobaltSession token for private characters

## Installation via BRAT

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin in Obsidian
2. Open BRAT settings → **Add Beta Plugin**
3. Enter `Gramding/obsidian-ddb-importer`
4. Click **Add Plugin** and enable it in Community Plugins

## Manual Installation

1. Clone or download this repo into your vault's `.obsidian/plugins/` folder
2. Run `npm install` then `npm run build` inside the plugin folder
3. Enable the plugin in Obsidian under Settings → Community Plugins

## Usage

1. Open Settings → DDB Importer
2. Click **+ Add Character** and enter your character ID
   - Your character ID is the number at the end of the character URL: `dndbeyond.com/characters/12345678`
3. Optionally set a folder to sync into, and paste your `CobaltSession` cookie for private characters
4. Click **Sync** next to a character or **Sync All** to import everything

Each character imports into a folder named after the character.

## Important Disclaimers

- This plugin uses D&D Beyond's **unofficial internal API** which is not publicly documented and may change or break at any time without notice
- This plugin is not affiliated with, endorsed by, or connected to Wizards of the Coast, D&D Beyond, or Hasbro
- This plugin is not affiliated with the [DDB-Importer](https://github.com/MrPrimate/ddb-importer) Foundry VTT plugin by MrPrimate
- Use responsibly and in accordance with D&D Beyond's Terms of Service
- D&D Beyond™ is a trademark of Wizards of the Coast LLC
- Dungeons & Dragons™ is a trademark of Wizards of the Coast LLC
