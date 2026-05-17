import { App, Notice, Plugin, PluginSettingTab, Setting, TFile } from "obsidian";
import { DdbSyncSettings, DEFAULT_SETTINGS } from "./settings";
import { fetchCharacter } from "./fetcher";
import { parseCharacter } from "./parser";
import { renderNote } from "./renderer";
import { parseSpells, renderSpellFiles, renderSpellBase } from "./spellParser";
import { parseInventory, renderItemFiles, renderInventoryBase } from "./inventoryParser";

export default class DdbSyncPlugin extends Plugin {
  settings: DdbSyncSettings;

  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("dice", "Sync D&D Beyond", () => this.syncCharacter());
    this.addCommand({
      id: "sync-ddb-character",
      name: "Sync character from D&D Beyond",
      callback: () => this.syncCharacter(),
    });
    this.addSettingTab(new DdbSettingTab(this.app, this));
  }

  async writeFile(path: string, content: string) {
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, content);
    } else {
      const folder = path.substring(0, path.lastIndexOf("/"));
      if (folder) {
        await this.app.vault.createFolder(folder).catch(() => {});
      }
      await this.app.vault.create(path, content);
    }
  }

async syncCharacter() {
  if (!this.settings.characterId) {
    new Notice("D&D Beyond Sync: No character ID set in settings.");
    return;
  }

  try {
    new Notice("Fetching character from D&D Beyond…");

    const data = await fetchCharacter(
      this.settings.characterId,
      this.settings.cobaltToken || undefined
    );

    const stats     = parseCharacter(data);
    const intMod    = Math.floor((stats.abilities.int - 10) / 2);
    const spells    = parseSpells(data, stats.proficiencyBonus, intMod);
    const inventory = parseInventory(data);

    // All files go into a folder named after the character, always

    const charFolder = stats.name;
const sheetPath  = `${charFolder}/${stats.name}.md`;
const basePath   = `${charFolder}/Components`;
const baseName   = `${charFolder}/${stats.name}`;

await this.writeFile(sheetPath, renderNote(stats, this.settings.characterId));
await this.writeFile(`${baseName} - Spells.base`,    renderSpellBase(stats.name, basePath));
await this.writeFile(`${baseName} - Inventory.base`, renderInventoryBase(stats.name, basePath));

    const spellFiles = renderSpellFiles(stats.name, spells, basePath);
    for (const f of spellFiles) {
      await this.writeFile(f.path, f.content);
    }

    const itemFiles = renderItemFiles(stats.name, inventory, basePath);
    for (const f of itemFiles) {
      await this.writeFile(f.path, f.content);
    }

    new Notice(`✅ ${stats.name} synced! (${spells.length} spells, ${inventory.length} items)`);
  } catch (e: unknown) {
    console.error("DDB Sync error:", e);
    new Notice(`❌ Sync failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class DdbSettingTab extends PluginSettingTab {
  plugin: DdbSyncPlugin;

  constructor(app: App, plugin: DdbSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "D&D Beyond Sync" });

    new Setting(containerEl)
      .setName("Character ID")
      .setDesc("The number at the end of your D&D Beyond character URL.")
      .addText(t => t
        .setPlaceholder("e.g. 12345678")
        .setValue(this.plugin.settings.characterId)
        .onChange(async v => {
          this.plugin.settings.characterId = v.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Target note path")
      .setDesc("Path for the main character sheet. Spell and item folders will be created alongside it.")
      .addText(t => t
        .setPlaceholder("DnD/Ranfred.md")
        .setValue(this.plugin.settings.targetNotePath)
        .onChange(async v => {
          this.plugin.settings.targetNotePath = v.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("CobaltSession token (optional)")
      .setDesc("Only needed for private characters. Find it in your browser cookies on dndbeyond.com.")
      .addText(t => t
        .setPlaceholder("paste token here")
        .setValue(this.plugin.settings.cobaltToken)
        .onChange(async v => {
          this.plugin.settings.cobaltToken = v.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Sync now")
      .setDesc("Manually trigger a sync.")
      .addButton(b => b
        .setButtonText("Sync")
        .setCta()
        .onClick(() => this.plugin.syncCharacter()));
  }
}
