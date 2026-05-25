import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl } from "obsidian";
import { DdbSyncSettings, DEFAULT_SETTINGS, CharacterEntry } from "./settings";
import { fetchCharacter } from "./fetcher";
import { parseCharacter } from "./parser";
import { renderNote } from "./renderer";
import { parseSpells, renderSpellFiles, renderSpellBase } from "./spellParser";
import { parseInventory, renderItemFiles, renderInventoryBase } from "./inventoryParser";
import { parseFeatures, renderFeatureFiles, renderFeaturesBase } from "./featuresParser";
import { parseActions, renderActionsNote } from "./actionsParser";
import { renderProficiencyFile } from "./proficienciesParser";
import { registerBlocks } from "./BlockRenderer";

export default class DdbSyncPlugin extends Plugin {
  settings: DdbSyncSettings;

  async onload() {
    await this.loadSettings();
    registerBlocks(this);
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

  const root       = entry.folder ? `${entry.folder}/${stats.name}` : stats.name;
  const sheetPath  = `${root}/${stats.name}.md`;
  const basePath   = `${root}/Components`;
  const baseName   = `${root}/${stats.name}`;
 const features  = parseFeatures(data); 
let portraitPath: string | null = null;
if (entry.downloadPortrait) {
  portraitPath = await this.downloadPortrait(data, basePath, stats.name);
}

  await this.writeFile(sheetPath, renderNote(stats, entry.id, portraitPath));
		await this.writeFile(`${baseName} - Spells.base`,    renderSpellBase(stats.name, basePath));
  await this.writeFile(`${baseName} - Inventory.base`, renderInventoryBase(stats.name, basePath));
await this.writeFile(`${baseName} - Features.base`, renderFeaturesBase(stats.name, basePath));
const profFile = renderProficiencyFile(stats.name, stats.proficiencies, basePath);
await this.writeFile(profFile.path, profFile.content);

  for (const f of renderSpellFiles(stats.name, spells, basePath)) {
    await this.writeFile(f.path, f.content);
  }
  for (const f of renderItemFiles(stats.name, inventory, basePath)) {
    await this.writeFile(f.path, f.content);
  }
for (const f of renderFeatureFiles(stats.name, features, basePath)) {
  await this.writeFile(f.path, f.content);
}

const strMod = Math.floor((stats.abilities.str - 10) / 2);
const dexMod = Math.floor((stats.abilities.dex - 10) / 2);
const actions = parseActions(data, stats.proficiencyBonus, strMod, dexMod, spells);

await this.writeFile(`${root}/${stats.name} - Actions.md`, renderActionsNote(stats.name, actions));

new Notice(`✅ ${stats.name} synced! (${spells.length} spells, ${inventory.length} items, ${features.length} features)`);



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

async downloadPortrait(data: any, basePath: string, charName: string): Promise<string | null> {
  try {
    const avatarUrl: string | null = data.decorations?.avatarUrl ?? null;
    console.log("DDB Portrait: avatarUrl =", avatarUrl);
    if (!avatarUrl) {
      console.log("DDB Portrait: no avatarUrl found");
      return null;
    }

    const cleanUrl = avatarUrl.split("?")[0] ?? avatarUrl;
    console.log("DDB Portrait: fetching", cleanUrl);

    const response = await requestUrl({ url: cleanUrl, method: "GET" });
    console.log("DDB Portrait: response status", response.status);
    console.log("DDB Portrait: arrayBuffer size", response.arrayBuffer.byteLength);

    const ext = cleanUrl.split(".").pop()?.toLowerCase() ?? "jpg";
    const portraitPath = `${basePath}/portrait.${ext}`;
    console.log("DDB Portrait: writing to", portraitPath);

    const existing = this.app.vault.getAbstractFileByPath(portraitPath);
    if (existing instanceof TFile) {
      await this.app.vault.modifyBinary(existing, response.arrayBuffer);
    } else {
      const folder = portraitPath.substring(0, portraitPath.lastIndexOf("/"));
      console.log("DDB Portrait: creating folder", folder);
      if (folder) await this.app.vault.createFolder(folder).catch((e) => {
        console.log("DDB Portrait: folder already exists or error", e);
      });
      await this.app.vault.createBinary(portraitPath, response.arrayBuffer);
    }

    console.log("DDB Portrait: done, path =", portraitPath);
    return portraitPath;
  } catch (e) {
    console.error("DDB Portrait: download failed", e);
    return null;
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
    folder: "",
    downloadPortrait: false,
  }];
  await this.saveSettings();
}  }

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
  containerEl.createEl("h2", { text: "DDB Importer" });

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
      .setName("Sync folder")
      .setDesc("Folder to sync this character into. Leave empty for vault root.")
      .addText(t => t
        .setPlaceholder("e.g. DnD/Characters")
        .setValue(entry.folder)
        .onChange(async v => {
          this.plugin.settings.characters[idx]!.folder = v.trim().replace(/\/$/, "");
          await this.plugin.saveSettings();
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

    new Setting(containerEl)
      .setName("Download portrait")
      .setDesc("Download the character portrait and store it in the Components folder.")
      .addToggle(t => t
        .setValue(this.plugin.settings.characters[idx]?.downloadPortrait ?? false)
        .onChange(async v => {
          this.plugin.settings.characters[idx]!.downloadPortrait = v;
          await this.plugin.saveSettings();
        }));
  } // <-- end of for loop

  new Setting(containerEl)
    .setName("Add character")
    .setDesc("Add another D&D Beyond character to sync.")
    .addButton(b => b
      .setButtonText("+ Add Character")
      .setCta()
      .onClick(async () => {
        this.plugin.settings.characters.push({ id: "", cobaltToken: "", folder: "", downloadPortrait: false });
        await this.plugin.saveSettings();
        this.display();
      }));

  new Setting(containerEl)
    .setName("Sync all")
    .setDesc("Sync all configured characters at once.")
    .addButton(b => b
      .setButtonText("Sync All")
      .setCta()
      .onClick(() => this.plugin.syncAllCharacters()));
}
}
