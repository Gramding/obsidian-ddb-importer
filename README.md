# obsidian-dndbeyond-sync

> [!WARNING]
> ## ⚠️ COMPLETELY VIBE CODED ⚠️
> This plugin was entirely vibe coded from start to finish. No guarantees, no warranties, no promises.
> It works on my machine. It might work on yours. It might delete your notes, summon a demon, or roll a nat 1.
> Use at your own risk. Back up your vault. You have been warned.

---

A plugin for [Obsidian](https://obsidian.md) that syncs your D&D Beyond character sheets directly into your vault — including stats, HP, spells, inventory, consumables, and more.

## Features

- Sync character stats, ability scores, AC, HP, speed, and passives
- Renders using the [obsidian-dnd-ui-toolkit](https://github.com/hay-kot/obsidian-dnd-ui-toolkit) blocks (`badges`, `healthpoints`, `ability`, `skills`, `consumable`)
- Individual spell notes with school, casting time, range, damage, healing, attack bonus, and save DC
- Individual inventory item notes with type, rarity, weight, AC, and damage
- Spell and inventory master views as Obsidian `.base` files with multiple views
- Supports multiple characters — each syncs into its own folder
- Subclass granted spells parsed from feature descriptions (even when the API omits them)
- Correct AC calculation for light, medium, and heavy armor plus shields
- Handles `set` and `bonus` stat modifiers (e.g. Belt of Giant Strength)
- Speed bonuses from class features (e.g. Monk Unarmored Movement)

## Requirements

- Obsidian 1.9.2 or later (for `.base` file support)
- [obsidian-dnd-ui-toolkit](https://github.com/hay-kot/obsidian-dnd-ui-toolkit) plugin installed and enabled
- A D&D Beyond account with at least one character set to **Public**, or a CobaltSession token for private characters

## Installation

1. Clone or download this repo into your vault's `.obsidian/plugins/` folder
2. Run `npm install` then `npm run build` inside the plugin folder
3. Enable the plugin in Obsidian under Settings → Community Plugins

## Usage

1. Open Settings → D&D Beyond Sync
2. Click **+ Add Character** and enter your character ID
   - Your character ID is the number at the end of your D&D Beyond URL: `dndbeyond.com/characters/12345678`
3. Optionally paste your `CobaltSession` cookie for private characters
4. Click **Sync** next to a character or **Sync All** to sync everything

Each character syncs into a folder named after the character:
