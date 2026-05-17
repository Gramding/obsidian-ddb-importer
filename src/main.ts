import { App, Notice, Plugin, PluginSettingTab, Setting, TFile } from "obsidian";
import { DdbSyncSettings, DEFAULT_SETTINGS, CharacterEntry } from "./settings";
import { fetchCharacter } from "./fetcher";
import { parseCharacter } from "./parser";
import { renderNote } from "./renderer";
import { parseSpells, renderSpellFiles, renderSpellBase } from "./spellParser";
import { parseInventory, renderItemFiles, renderInventoryBase } from "./inventoryParser";

export default class DdbSyncPlugin extends Plugin {
  settings: DdbSyncSettings;

  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("dice", "Sync D&D Beyond", () => this.syncAllCharacters());
    this.addCommand({
      id: "sync-all-ddb-characters",
      name: "Sync all characters from D&D Beyond",
      callback: () => this.syncAllCharacters(),
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

  async syncCharacter(entry: CharacterEntry) {
    const data = await fetchCharacter(
      entry.id,
      entry.cobaltToken || undefined
    );

    const stats     = parseCharacter(data);
    const intMod    = Math.floor((stats.abilities.int - 10) / 2);
    const spells    = parseSpells(data, stats.proficiencyBonus, intMod);
    const inventory = parseInventory(data);

    const charFolder = stats.name;
    const sheetPath  = `${charFolder}/${stats.name}.md`;
    const basePath   = `${charFolder}/Components`;
    const baseName   = `${charFolder}/${stats.name}`;

    await this.writeFile(sheetPath, renderNote(stats, entry.id));
    await this.writeFile(`${baseName} - Spells.base`,    renderSpellBase(stats.name, basePath));
    await this.writeFile(`${baseName} - Inventory.base`, renderInventoryBase(stats.name, basePath));

    for (const f of renderSpellFiles(stats.name, spells, basePath)) {
      await this.writeFile(f.path, f.content);
    }
    for (const f of renderItemFiles(stats.name, inventory, basePath)) {
      await this.writeFile(f.path, f.content);
    }

    return stats.name;
  }

  async syncAllCharacters() {
    if (this.settings.characters.length === 0) {
      new Notice("D&D Beyond Sync: No characters configured in settings.");
      return;
    }

    new Notice(`Syncing ${this.settings.characters.length} character(s)…`);

    const results: string[] = [];
    const errors: string[] = [];

    for (const entry of this.settings.characters) {
      try {
        const name = await this.syncCharacter(entry);
        results.push(name);
      } catch (e: unknown) {
        console.error(`DDB Sync error for character ${entry.id}:`, e);
        errors.push(`${entry.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (results.length > 0) {
      new Notice(`✅ Synced: ${results.join(", ")}`);
    }
    if (errors.length > 0) {
      new Notice(`❌ Failed: ${errors.join(", ")}`);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    // Migrate old single-character settings if present
    const raw = await this.loadData() as any;
    if (raw?.characterId && this.settings.characters.length === 0) {
      this.settings.characters = [{
        id: raw.characterId,
        cobaltToken: raw.cobaltToken ?? "",
      }];
      await this.saveSettings();
    }
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

    // Per-character settings
    for (let i = 0; i < this.plugin.settings.characters.length; i++) {
      const entry = this.plugin.settings.characters[i]!;
      const idx = i;

      containerEl.createEl("h3", { text: `Character ${i + 1}` });

      new Setting(containerEl)
        .setName("Character ID")
        .setDesc("The number at the end of your D&D Beyond character URL.")
        .addText(t => t
          .setPlaceholder("e.g. 12345678")
          .setValue(entry.id)
          .onChange(async v => {
            this.plugin.settings.characters[idx]!.id = v.trim();
            await this.plugin.saveSettings();
          }))
        .addButton(b => b
          .setButtonText("Sync")
          .onClick(async () => {
            try {
              new Notice(`Syncing character ${entry.id}…`);
              const name = await this.plugin.syncCharacter(entry);
              new Notice(`✅ ${name} synced!`);
            } catch (e: unknown) {
              new Notice(`❌ Failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }))
        .addButton(b => b
          .setButtonText("Remove")
          .setWarning()
          .onClick(async () => {
            this.plugin.settings.characters.splice(idx, 1);
            await this.plugin.saveSettings();
            this.display();
          }));

      new Setting(containerEl)
        .setName("CobaltSession token (optional)")
        .setDesc("Only needed for private characters.")
        .addText(t => t
          .setPlaceholder("paste token here")
          .setValue(entry.cobaltToken)
          .onChange(async v => {
            this.plugin.settings.characters[idx]!.cobaltToken = v.trim();
            await this.plugin.saveSettings();
          }));
    }

    // Add character button
    new Setting(containerEl)
      .setName("Add character")
      .setDesc("Add another D&D Beyond character to sync.")
      .addButton(b => b
        .setButtonText("+ Add Character")
        .setCta()
        .onClick(async () => {
          this.plugin.settings.characters.push({ id: "", cobaltToken: "" });
          await this.plugin.saveSettings();
          this.display();
        }));

    // Sync all button
    new Setting(containerEl)
      .setName("Sync all")
      .setDesc("Sync all configured characters at once.")
      .addButton(b => b
        .setButtonText("Sync All")
        .setCta()
        .onClick(() => this.plugin.syncAllCharacters()));
  }
}
