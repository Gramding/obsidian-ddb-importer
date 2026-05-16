import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { DdbSyncSettings, DEFAULT_SETTINGS } from "./settings";
import { fetchCharacter } from "./fetcher";
import { parseCharacter } from "./parser";
import { renderNote } from "./renderer";

export default class DdbSyncPlugin extends Plugin {
  settings: DdbSyncSettings;

  async onload() {
    await this.loadSettings();

    // Ribbon button
    this.addRibbonIcon("dice", "Sync D&D Beyond", () => this.syncCharacter());

    // Command palette
    this.addCommand({
      id: "sync-ddb-character",
      name: "Sync character from D&D Beyond",
      callback: () => this.syncCharacter(),
    });

    this.addSettingTab(new DdbSettingTab(this.app, this));
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
      const stats = parseCharacter(data);
      const content = renderNote(stats);

      const path = this.settings.targetNotePath;
      const existing = this.app.vault.getAbstractFileByPath(path);

      if (existing) {
        await this.app.vault.modify(existing as any, content);
      } else {
        await this.app.vault.create(path, content);
      }

      new Notice(`✅ ${stats.name} synced!`);
    } catch (e) {
      console.error(e);
      new Notice(`❌ Sync failed: ${e.message}`);
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

    new Setting(containerEl)
      .setName("Character ID")
      .setDesc("The number at the end of your DnD Beyond character URL.")
      .addText(t => t
        .setPlaceholder("e.g. 12345678")
        .setValue(this.plugin.settings.characterId)
        .onChange(async v => {
          this.plugin.settings.characterId = v.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Target note path")
      .setDesc("Where to write the character sheet in your vault.")
      .addText(t => t
        .setPlaceholder("DnD/Character Sheet.md")
        .setValue(this.plugin.settings.targetNotePath)
        .onChange(async v => {
          this.plugin.settings.targetNotePath = v.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("CobaltSession token (optional)")
      .setDesc("Only needed for private characters. Get it from your browser cookies on dndbeyond.com.")
      .addText(t => t
        .setPlaceholder("paste token here")
        .setValue(this.plugin.settings.cobaltToken)
        .onChange(async v => {
          this.plugin.settings.cobaltToken = v.trim();
          await this.plugin.saveSettings();
        }));
  }
}
