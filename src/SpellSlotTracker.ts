import { App } from "obsidian";
import { SpellSlot } from "./parser";

interface SpellSlotState {
  used: Record<number, number>;
}

// ─── Concentration ────────────────────────────────────────────────────────────

interface ConcentrationState { spell: string | null; }
const concentrationCache: Record<string, ConcentrationState> = {};

async function loadConcentrationState(app: App, charName: string): Promise<ConcentrationState> {
  if (concentrationCache[charName]) return concentrationCache[charName];
  const plugin = (app as any).plugins.plugins["ddb-importer"];
  const saved = await plugin?.loadData();
  const state: ConcentrationState = saved?.concentration?.[charName] ?? { spell: null };
  concentrationCache[charName] = state;
  return state;
}

async function saveConcentrationState(app: App, charName: string, state: ConcentrationState) {
  concentrationCache[charName] = state;
  const plugin = (app as any).plugins.plugins["ddb-importer"];
  if (!plugin) return;
  const saved = (await plugin.loadData()) ?? {};
  if (!saved.concentration) saved.concentration = {};
  saved.concentration[charName] = state;
  await plugin.saveData(saved);
}

export async function getConcentration(app: App, charName: string): Promise<string | null> {
  return (await loadConcentrationState(app, charName)).spell;
}

export async function setConcentration(app: App, charName: string, spellName: string | null): Promise<void> {
  await saveConcentrationState(app, charName, { spell: spellName });
}

// ─── Spell Slot State ─────────────────────────────────────────────────────────

const slotStateCache: Record<string, SpellSlotState> = {};

async function loadSlotState(app: App, charName: string): Promise<SpellSlotState> {
  if (slotStateCache[charName]) return slotStateCache[charName];
  const plugin = (app as any).plugins.plugins["ddb-importer"];
  const saved = await plugin?.loadData();
  const state: SpellSlotState = saved?.spellSlots?.[charName] ?? { used: {} };
  slotStateCache[charName] = state;
  return state;
}

async function saveSlotState(app: App, charName: string, state: SpellSlotState) {
  slotStateCache[charName] = state;
  const plugin = (app as any).plugins.plugins["ddb-importer"];
  if (!plugin) return;
  const saved = await plugin.loadData() ?? {};
  if (!saved.spellSlots) saved.spellSlots = {};
  saved.spellSlots[charName] = state;
  await plugin.saveData(saved);
}

export async function resetSlotsForLongRest(app: App, charName: string): Promise<void> {
  const state: SpellSlotState = { used: {} };
  slotStateCache[charName] = state;
  const plugin = (app as any).plugins.plugins["ddb-importer"];
  if (!plugin) return;
  const saved = (await plugin.loadData()) ?? {};
  if (!saved.spellSlots) saved.spellSlots = {};
  saved.spellSlots[charName] = state;
  await plugin.saveData(saved);
}

export async function renderSpellSlotsSection(
  container: HTMLElement,
  app: App,
  charName: string,
  slots: SpellSlot[]
) {
  if (!slots.length) return;

  const state = await loadSlotState(app, charName);

  // Clamp used counts if totals shrank (e.g. level-down after sync)
  let clamped = false;
  for (const { level, total } of slots) {
    const used = state.used[level] ?? 0;
    if (used > total) { state.used[level] = total; clamped = true; }
  }
  if (clamped) await saveSlotState(app, charName, state);

  const section = container.createDiv();
  section.style.cssText = "margin-bottom:10px";
  buildSlotUi(section, app, charName, slots, state);
}

function buildSlotUi(
  el: HTMLElement,
  app: App,
  charName: string,
  slots: SpellSlot[],
  state: SpellSlotState
) {
  el.empty();

  const header = el.createDiv({ text: "Spell Slots" });
  header.style.cssText = "font-size:0.75em; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.08em; border-bottom:1px solid var(--background-modifier-border); padding:4px 0 2px 0; margin-bottom:6px";

  for (const { level, total } of slots) {
    const used      = state.used[level] ?? 0;
    const remaining = total - used;

    const row = el.createDiv();
    row.style.cssText = "display:flex; align-items:center; gap:8px; padding:3px 0; border-bottom:1px solid var(--background-modifier-border-hover)";

    row.createDiv({ text: `L${level}` }).style.cssText =
      "font-size:0.82em; font-weight:700; color:var(--text-muted); min-width:22px; flex-shrink:0";

    const pips = row.createDiv();
    pips.style.cssText = "display:flex; gap:5px; flex:1; flex-wrap:wrap";

    for (let i = 0; i < total; i++) {
      const filled = i < remaining;
      const pip    = pips.createEl("span");
      pip.style.cssText = `
        width:14px; height:14px; border-radius:50%;
        border:1.5px solid var(--interactive-accent);
        background:${filled ? "var(--interactive-accent)" : "transparent"};
        cursor:pointer; flex-shrink:0; display:inline-block;
        transition:background 0.1s
      `.trim();
      pip.title = filled ? "Use slot" : "Restore slot";
      pip.onclick = () => {
        if (filled) state.used[level] = (state.used[level] ?? 0) + 1;
        else        state.used[level] = Math.max(0, (state.used[level] ?? 0) - 1);
        saveSlotState(app, charName, state).then(() =>
          buildSlotUi(el, app, charName, slots, state)
        );
      };
    }

    row.createDiv({ text: `${remaining}/${total}` }).style.cssText =
      "font-size:0.78em; color:var(--text-muted); min-width:28px; text-align:right; flex-shrink:0";
  }
}
