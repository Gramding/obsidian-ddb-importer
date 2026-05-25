import { MarkdownPostProcessorContext, Plugin, App } from "obsidian";
import { renderHpTracker } from "./HpTracker";
import { renderCurrencyTracker } from "./CurrencyTracker";
import { renderTabBlock } from "./TabBlock";

export interface CharacterFrontmatter {
  name: string;
  race: string;
  class: string;
  level: number;
  proficiency_bonus: number;
  ac: number;
  speed: number;
  hp_current: number;
  hp_max: number;
  hp_temp: number;
  str: number; dex: number; con: number;
  int: number; wis: number; cha: number;
  str_save: number; dex_save: number; con_save: number;
  int_save: number; wis_save: number; cha_save: number;
  passive_perception: number;
  passive_investigation: number;
  passive_insight: number;
  skill_proficiencies: string[];
  skill_expertise: string[];
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
  advantages: string[];
  disadvantages: string[];
  portrait: string | null;
  synced_at: string;
  inspiration: boolean;
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
  [key: string]: any;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function mod(score: number): string {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function getFrontmatter(ctx: MarkdownPostProcessorContext): CharacterFrontmatter | null {
  const app = (window as any).app as App;
  if (!app) return null;
  const cache = app.metadataCache.getCache(ctx.sourcePath);
  if (!cache?.frontmatter) return null;
  return cache.frontmatter as CharacterFrontmatter;
}

function wrap(el: HTMLElement): HTMLElement {
  el.style.cssText = "font-family:var(--font-interface); font-size:1em; line-height:1.4";
  return el;
}

function sectionHeader(text: string): HTMLElement {
  const h = document.createElement("div");
  h.style.cssText = "font-size:0.8em; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); border-bottom:1px solid var(--background-modifier-border); padding-bottom:2px; margin:8px 0 4px 0";
  h.textContent = text;
  return h;
}

function statBox(label: string, value: string, sub?: string): HTMLElement {
  const box = document.createElement("div");
  box.style.cssText = "display:flex; flex-direction:column; align-items:center; justify-content:center; border:1px solid var(--background-modifier-border); border-radius:6px; padding:5px 2px; background:var(--background-secondary); text-align:center; min-width:0";
  box.innerHTML = `
    <div style="font-size:0.72em; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.05em; white-space:nowrap">${label}</div>
    <div style="font-size:1.25em; font-weight:700; color:var(--text-normal)">${value}</div>
    ${sub ? `<div style="font-size:0.72em; color:var(--text-muted)">${sub}</div>` : ""}
  `;
  return box;
}

function profIcon(level: 0 | 1 | 2, disadvantage = false): string {
  if (disadvantage) return `<span style="color:var(--color-red)">⊖</span>`;
  if (level === 2)   return `<span style="color:var(--color-yellow)">◆</span>`;
  if (level === 1)   return `<span style="color:var(--color-green)">◈</span>`;
  return `<span style="color:var(--text-faint)">◇</span>`;
}

function skillRow(name: string, bonus: string, dot: string, ability: string): HTMLElement {
  const row = document.createElement("div");
  row.style.cssText = "display:grid; grid-template-columns:16px 1fr auto auto; gap:3px; align-items:center; padding:2px 0";
  row.innerHTML = `
    <span style="font-size:1em">${dot}</span>
    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${name}</span>
    <span style="color:var(--text-faint); font-size:0.8em; text-align:right">${ability}</span>
    <span style="font-weight:600; text-align:right; min-width:26px">${bonus}</span>
  `;
  return row;
}

function dataRow(label: string, value: string): HTMLElement {
  const row = document.createElement("div");
  row.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:3px 0; border-bottom:1px solid var(--background-modifier-border-hover)";
  row.innerHTML = `<span style="color:var(--text-muted)">${label}</span><span style="font-weight:600">${value}</span>`;
  return row;
}

// ─── Register ────────────────────────────────────────────────────────────────

export function registerBlocks(plugin: Plugin) {
  plugin.registerMarkdownCodeBlockProcessor("ddb-header",      (src, el, ctx) => renderHeader(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-combat",      (src, el, ctx) => renderCombat(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-abilities",   (src, el, ctx) => renderAbilities(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-saves",       (src, el, ctx) => renderSaves(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-skills",      (src, el, ctx) => renderSkills(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-defenses",    (src, el, ctx) => renderDefenses(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-passives",    (src, el, ctx) => renderPassives(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-actions",     (src, el, ctx) => renderActions(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-spells",      (src, el, ctx) => renderSpells(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-inventory",   (src, el, ctx) => renderInventory(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-features",    (src, el, ctx) => renderFeatures(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-consumables", (src, el, ctx) => renderConsumables(el, ctx));
  // Master block — renders everything in two-column layout
  plugin.registerMarkdownCodeBlockProcessor("ddb-sheet",       (src, el, ctx) => renderSheet(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-hp",       (src, el, ctx) => renderHpTracker(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-currency", (src, el, ctx) => renderCurrencyTracker(el, ctx));
  plugin.registerMarkdownCodeBlockProcessor("ddb-tabs",     (src, el, ctx) => renderTabBlock(el, ctx));
}

// ─── Master Sheet ────────────────────────────────────────────────────────────

function renderSheet(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const fm = getFrontmatter(ctx);
  if (!fm) { el.setText("No frontmatter found."); return; }

  wrap(el);

  // Header bar
  renderHeader(el, ctx);

  // Ability scores full width
  const abilityEl = el.createDiv();
  renderAbilities(abilityEl, ctx);
  el.appendChild(abilityEl);

  // Two column layout
  const columns = el.createDiv();
  columns.style.cssText = "display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:8px";

  const left  = columns.createDiv();
  const right = columns.createDiv();

  // Left: saves, skills
  renderSaves(left, ctx);
  renderSkills(left, ctx);

  // HP tracker gets its own div
const hpEl = right.createDiv();
hpEl.style.cssText = "margin-top:6px";
renderHpTracker(hpEl, ctx);

  // Right: combat, passives, defenses, consumables, features
  renderCombat(right, ctx);
  renderPassives(right, ctx);
  renderDefenses(right, ctx);
  renderConsumables(right, ctx);
  renderFeatures(right, ctx);
}

// ─── Header ──────────────────────────────────────────────────────────────────

function renderHeader(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const app = (window as any).app as App;
  const fm = getFrontmatter(ctx);
  if (!fm) return;

  wrap(el);

  const header = el.createDiv();
  header.style.cssText = "display:flex; gap:12px; align-items:center; padding-bottom:8px; border-bottom:2px solid var(--background-modifier-border); margin-bottom:8px";

  // Portrait
  if (fm.portrait && fm.portrait !== "null") {
    const imgPath = String(fm.portrait).replace(/^\[\[/, "").replace(/\]\]$/, "");
    const imgFile = app.vault.getAbstractFileByPath(imgPath);
    if (imgFile) {
      const img = header.createEl("img");
      img.style.cssText = "width:56px; height:56px; border-radius:50%; object-fit:cover; border:2px solid var(--background-modifier-border); flex-shrink:0";
      img.src = app.vault.getResourcePath(imgFile as any);
    }
  }

  // Name + subtitle
  const info = header.createDiv();
  info.style.cssText = "flex:1; min-width:0";
  info.createEl("strong", { text: fm.name }).style.cssText = "font-size:1.2em; display:block";
  info.createDiv({ text: `${fm.race} · ${fm.class}` }).style.cssText = "color:var(--text-muted); font-size:0.8em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis";
  if (fm.synced_at) {
    info.createDiv({ text: `Synced ${new Date(fm.synced_at).toLocaleDateString()}` }).style.cssText = "color:var(--text-faint); font-size:0.7em";
  }

  // Quick stats — no HP here
  const quick = header.createDiv();
  quick.style.cssText = "display:grid; grid-template-columns:repeat(3,1fr); gap:4px; flex-shrink:0";
  quick.appendChild(statBox("Level", String(fm.level)));
  quick.appendChild(statBox("AC",    String(fm.ac)));
  quick.appendChild(statBox("Prof",  `+${fm.proficiency_bonus}`));
  quick.appendChild(statBox("Speed", `${fm.speed}ft`));
  quick.appendChild(statBox("Init",  mod(fm.dex)));
  quick.appendChild(statBox("Spell DC", String(8 + fm.proficiency_bonus + Math.floor((fm.int - 10) / 2))));
}

// ─── Abilities ───────────────────────────────────────────────────────────────

function renderAbilities(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const fm = getFrontmatter(ctx);
  if (!fm) return;

  wrap(el);

  const grid = el.createDiv();
  grid.style.cssText = "display:grid; grid-template-columns:repeat(6,1fr); gap:4px; margin-bottom:8px";

  const stats: [string, number][] = [
    ["STR", fm.str], ["DEX", fm.dex], ["CON", fm.con],
    ["INT", fm.int], ["WIS", fm.wis], ["CHA", fm.cha],
  ];

  for (const [label, score] of stats) {
    const box = grid.createDiv();
    box.style.cssText = "display:flex; flex-direction:column; align-items:center; justify-content:center; border:1px solid var(--background-modifier-border); border-radius:6px; padding:6px 4px; background:var(--background-secondary); text-align:center";
    box.innerHTML = `
      <div style="font-size:0.72em; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.05em">${label}</div>
      <div style="font-size:1.4em; font-weight:700">${mod(score)}</div>
      <div style="font-size:0.8em; color:var(--text-muted)">${score}</div>
    `;
  }
}

// ─── Combat ──────────────────────────────────────────────────────────────────

function renderCombat(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const fm = getFrontmatter(ctx);
  if (!fm) return;

  wrap(el);
  el.appendChild(sectionHeader("Combat"));

  el.appendChild(dataRow("Armor Class",  String(fm.ac)));
  el.appendChild(dataRow("Initiative",   mod(fm.dex)));
  el.appendChild(dataRow("Speed",        `${fm.speed} ft`));
  el.appendChild(dataRow("Proficiency",  `+${fm.proficiency_bonus}`));
  el.appendChild(dataRow("Spell Attack", `+${fm.proficiency_bonus + Math.floor((fm.int - 10) / 2)}`));
  el.appendChild(dataRow("Spell DC",     String(8 + fm.proficiency_bonus + Math.floor((fm.int - 10) / 2))));
  if (fm.inspiration) el.appendChild(dataRow("Inspiration", "★"));
}

// ─── Saving Throws ───────────────────────────────────────────────────────────

function renderSaves(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const fm = getFrontmatter(ctx);
  if (!fm) return;

  wrap(el);
  el.appendChild(sectionHeader("Saving Throws"));

  const saves: [string, number, number][] = [
    ["Strength",     fm.str_save, fm.str],
    ["Dexterity",    fm.dex_save, fm.dex],
    ["Constitution", fm.con_save, fm.con],
    ["Intelligence", fm.int_save, fm.int],
    ["Wisdom",       fm.wis_save, fm.wis],
    ["Charisma",     fm.cha_save, fm.cha],
  ];

  for (const [label, save, base] of saves) {
    const isProf = save !== Math.floor((base - 10) / 2);
    el.appendChild(skillRow(label, signed(save), profIcon(isProf ? 1 : 0), ""));
  }
}

// ─── Skills ──────────────────────────────────────────────────────────────────

function renderSkills(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const fm = getFrontmatter(ctx);
  if (!fm) return;

  wrap(el);
  el.appendChild(sectionHeader("Skills"));

  const SKILLS: [string, keyof CharacterFrontmatter, string][] = [
    ["Acrobatics",     "dex", "DEX"], ["Animal Handling", "wis", "WIS"],
    ["Arcana",         "int", "INT"], ["Athletics",       "str", "STR"],
    ["Deception",      "cha", "CHA"], ["History",         "int", "INT"],
    ["Insight",        "wis", "WIS"], ["Intimidation",    "cha", "CHA"],
    ["Investigation",  "int", "INT"], ["Medicine",        "wis", "WIS"],
    ["Nature",         "int", "INT"], ["Perception",      "wis", "WIS"],
    ["Performance",    "cha", "CHA"], ["Persuasion",      "cha", "CHA"],
    ["Religion",       "int", "INT"], ["Sleight of Hand", "dex", "DEX"],
    ["Stealth",        "dex", "DEX"], ["Survival",        "wis", "WIS"],
  ];

  const profs:   string[] = fm.skill_proficiencies ?? [];
  const experts: string[] = fm.skill_expertise     ?? [];
  const disadvs: string[] = fm.disadvantages       ?? [];

  for (const [skill, ability, abilLabel] of SKILLS) {
    const key      = skill.toLowerCase().replace(/\s+/g, "-");
    const base     = fm[ability as string] as number ?? 10;
    const baseMod  = Math.floor((base - 10) / 2);
    const isExpert = experts.includes(key);
    const isProf   = profs.includes(key);
    const hasDisadv = disadvs.some(d => d.toLowerCase().includes(skill.toLowerCase()));
    const bonus    = baseMod + (isExpert ? fm.proficiency_bonus * 2 : isProf ? fm.proficiency_bonus : 0);
    const level    = isExpert ? 2 : isProf ? 1 : 0;

    el.appendChild(skillRow(
      skill,
      signed(bonus),
      profIcon(level as 0|1|2, hasDisadv),
      abilLabel
    ));
  }
}

// ─── Defenses ────────────────────────────────────────────────────────────────

function renderDefenses(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const fm = getFrontmatter(ctx);
  if (!fm) return;

  const sections: [string, string[]][] = [
    ["Resistances",     fm.resistances     ?? []],
    ["Immunities",      fm.immunities      ?? []],
    ["Vulnerabilities", fm.vulnerabilities ?? []],
    ["Advantages",      fm.advantages      ?? []],
    ["Disadvantages",   fm.disadvantages   ?? []],
  ];

  const hasAny = sections.some(([, items]) => items.length > 0);
  if (!hasAny) return;

  wrap(el);
  el.appendChild(sectionHeader("Defenses"));

  for (const [title, items] of sections) {
    if (!items.length) continue;
    const row = el.createDiv();
    row.style.cssText = "display:flex; flex-wrap:wrap; gap:3px; margin-bottom:3px; align-items:center";
    row.createEl("span", { text: `${title}:` }).style.cssText = "color:var(--text-muted); font-size:0.8em; margin-right:2px";
    for (const item of items) {
      const tag = row.createEl("span", { text: item });
      tag.style.cssText = "background:var(--background-secondary); border:1px solid var(--background-modifier-border); border-radius:4px; padding:1px 5px; font-size:0.78em";
    }
  }
}

// ─── Passives ────────────────────────────────────────────────────────────────

function renderPassives(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const fm = getFrontmatter(ctx);
  if (!fm) return;

  wrap(el);
  el.appendChild(sectionHeader("Passive Scores"));

  el.appendChild(dataRow("Perception",    String(fm.passive_perception    ?? "—")));
  el.appendChild(dataRow("Investigation", String(fm.passive_investigation ?? "—")));
  el.appendChild(dataRow("Insight",       String(fm.passive_insight       ?? "—")));
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function renderActions(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const fm = getFrontmatter(ctx);
  if (!fm) return;

  const actions: any[] = fm.actions ?? [];
  if (!actions.length) return;

  wrap(el);
  el.appendChild(sectionHeader("Actions"));

  const table = el.createEl("table");
  table.style.cssText = "width:100%; border-collapse:collapse; font-size:0.82em";

  const thead = table.createEl("thead");
  const hrow  = thead.createEl("tr");
  for (const h of ["Name", "Hit", "Dmg", "Range"]) {
    const th = hrow.createEl("th", { text: h });
    th.style.cssText = "text-align:left; padding:2px 4px; border-bottom:1px solid var(--background-modifier-border); color:var(--text-muted); font-weight:600; white-space:nowrap";
  }

  const tbody = table.createEl("tbody");
  for (const a of actions) {
    const tr = tbody.createEl("tr");
    for (const val of [a.name, a.hit ?? "—", a.damage ?? "—", a.range ?? "—"]) {
      const td = tr.createEl("td", { text: String(val) });
      td.style.cssText = "padding:2px 4px; border-bottom:1px solid var(--background-modifier-border-hover); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px";
    }
  }
}

// ─── Spells ──────────────────────────────────────────────────────────────────

function renderSpells(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const fm = getFrontmatter(ctx);
  if (!fm) return;

  const spells: any[] = fm.spells ?? [];
  if (!spells.length) return;

  wrap(el);
  el.appendChild(sectionHeader("Spells"));

  // Spell slots row
  const slots: any[] = fm.spell_slots ?? [];
  if (slots.length) {
    const slotRow = el.createDiv();
    slotRow.style.cssText = "display:flex; flex-wrap:wrap; gap:3px; margin-bottom:5px";
    for (const s of slots.filter((s: any) => s.total > 0)) {
      const chip = slotRow.createEl("span");
      chip.style.cssText = "background:var(--background-secondary); border:1px solid var(--background-modifier-border); border-radius:4px; padding:1px 6px; font-size:0.78em";
      chip.setText(`L${s.level}: ${s.used}/${s.total}`);
    }
  }

  const byLevel: Record<number, any[]> = {};
  for (const s of spells) {
    if (!byLevel[s.level]) byLevel[s.level] = [];
    byLevel[s.level].push(s);
  }

  for (const [lvl, list] of Object.entries(byLevel).sort(([a],[b]) => Number(a) - Number(b))) {
    const lvlHeader = el.createDiv();
    lvlHeader.style.cssText = "font-size:0.72em; color:var(--text-muted); margin:4px 0 2px 0; text-transform:uppercase; letter-spacing:0.05em";
    lvlHeader.setText(Number(lvl) === 0 ? "Cantrips" : `Level ${lvl}`);

    for (const s of list) {
      const row = el.createDiv();
      row.style.cssText = "display:grid; grid-template-columns:1fr auto auto; gap:4px; align-items:center; padding:1px 0; border-bottom:1px solid var(--background-modifier-border-hover)";
      row.innerHTML = `
        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${s.name}${s.concentration ? ' <span style="color:var(--text-faint);font-size:0.8em">C</span>' : ""}</span>
        <span style="color:var(--text-muted); font-size:0.8em">${s.save_dc ?? s.attack_bonus ?? ""}</span>
        <span style="font-weight:600; font-size:0.85em">${s.damage ?? s.healing ?? "—"}</span>
      `;
    }
  }
}

// ─── Inventory ───────────────────────────────────────────────────────────────

function renderInventory(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const fm = getFrontmatter(ctx);
  if (!fm) return;

  const inventory: any[] = fm.inventory ?? [];
  if (!inventory.length) return;

  wrap(el);
  el.appendChild(sectionHeader("Inventory"));

  const equipped   = inventory.filter((i: any) => i.equipped);
  const unequipped = inventory.filter((i: any) => !i.equipped);

  for (const group of [["Equipped", equipped], ["Carried", unequipped]] as [string, any[]][]) {
    if (!group[1].length) continue;
    const groupHeader = el.createDiv({ text: group[0] });
    groupHeader.style.cssText = "font-size:0.72em; color:var(--text-muted); margin:4px 0 2px 0; text-transform:uppercase";

    for (const i of group[1]) {
      const row = el.createDiv();
      row.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:1px 0; border-bottom:1px solid var(--background-modifier-border-hover); gap:4px";
      row.innerHTML = `
        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1">${i.quantity > 1 ? `${i.quantity}× ` : ""}${i.name}${i.magic ? " ✨" : ""}${i.attuned ? " 🔗" : ""}</span>
        <span style="color:var(--text-muted); font-size:0.8em; flex-shrink:0">${i.damage ?? (i.ac ? `AC ${i.ac}` : "")}</span>
      `;
    }
  }
}

// ─── Features ────────────────────────────────────────────────────────────────

function renderFeatures(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const fm = getFrontmatter(ctx);
  if (!fm) return;

  const features: any[] = fm.features ?? [];
  if (!features.length) return;

  wrap(el);
  el.appendChild(sectionHeader("Features & Traits"));

  const bySource: Record<string, string[]> = {};
  for (const f of features) {
    if (!bySource[f.source]) bySource[f.source] = [];
    bySource[f.source].push(f.name);
  }

  for (const [source, names] of Object.entries(bySource)) {
    const row = el.createDiv();
    row.style.cssText = "padding:2px 0; border-bottom:1px solid var(--background-modifier-border-hover)";
    row.innerHTML = `<span style="color:var(--text-muted); font-size:0.75em">${source}: </span>${names.join(", ")}`;
  }
}

// ─── Consumables ─────────────────────────────────────────────────────────────

function renderConsumables(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const fm = getFrontmatter(ctx);
  if (!fm) return;

  const consumables: any[] = fm.consumables ?? [];
  if (!consumables.length) return;

  wrap(el);
  el.appendChild(sectionHeader("Resources"));

  for (const c of consumables) {
    const row = el.createDiv();
    row.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:2px 0; border-bottom:1px solid var(--background-modifier-border-hover); gap:6px";

    row.createDiv({ text: c.label }).style.cssText = "flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis";

    const dots = row.createDiv();
    dots.style.cssText = "display:flex; gap:3px; flex-shrink:0";
    for (let i = 0; i < (c.uses ?? 0); i++) {
      const dot = dots.createEl("span");
      dot.style.cssText = "width:10px; height:10px; border-radius:50%; background:var(--interactive-accent); border:1px solid var(--background-modifier-border); display:inline-block";
    }

    if (c.reset_on) {
      row.createEl("span", { text: c.reset_on }).style.cssText = "font-size:0.7em; color:var(--text-faint); flex-shrink:0";
    }
  }
}