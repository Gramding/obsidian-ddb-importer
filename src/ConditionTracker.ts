import { MarkdownPostProcessorContext, App } from "obsidian";

const CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Frightened", "Grappled",
  "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned",
  "Prone", "Restrained", "Stunned", "Unconscious",
];

interface ConditionState {
  active: string[];
  exhaustion: number;
}

const conditionCache: Record<string, ConditionState> = {};

async function loadConditionState(app: App, charName: string): Promise<ConditionState> {
  if (conditionCache[charName]) return conditionCache[charName];
  const plugin = (app as any).plugins.plugins["ddb-importer"];
  const saved = await plugin?.loadData();
  const state: ConditionState = saved?.conditions?.[charName] ?? { active: [], exhaustion: 0 };
  conditionCache[charName] = state;
  return state;
}

async function saveConditionState(app: App, charName: string, state: ConditionState) {
  conditionCache[charName] = state;
  const plugin = (app as any).plugins.plugins["ddb-importer"];
  if (!plugin) return;
  const saved = (await plugin.loadData()) ?? {};
  if (!saved.conditions) saved.conditions = {};
  saved.conditions[charName] = state;
  await plugin.saveData(saved);
}

function buildConditionUi(el: HTMLElement, app: App, charName: string, state: ConditionState) {
  el.empty();

  const header = el.createDiv({ text: "Conditions" });
  header.style.cssText = "font-size:0.75em; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.08em; border-bottom:1px solid var(--background-modifier-border); padding:4px 0 2px 0; margin-bottom:6px";

  // Exhaustion level pips (1–6)
  const exRow = el.createDiv();
  exRow.style.cssText = "display:flex; align-items:center; gap:5px; margin-bottom:7px; flex-wrap:wrap";
  exRow.createEl("span", { text: "Exhaustion" }).style.cssText = "font-size:0.8em; color:var(--text-muted); flex-shrink:0; margin-right:2px";

  for (let i = 1; i <= 6; i++) {
    const pip = exRow.createEl("span", { text: String(i) });
    const active = i <= state.exhaustion;
    pip.style.cssText = [
      "width:20px; height:20px; border-radius:50%; cursor:pointer;",
      `border:1.5px solid var(--color-orange);`,
      `background:${active ? "var(--color-orange)" : "transparent"};`,
      `color:${active ? "white" : "var(--color-orange)"};`,
      "display:inline-flex; align-items:center; justify-content:center;",
      "font-size:0.7em; font-weight:700; flex-shrink:0; user-select:none",
    ].join(" ");
    pip.title = active ? `Remove exhaustion ${i}` : `Set exhaustion to ${i}`;
    pip.onclick = () => {
      state.exhaustion = state.exhaustion === i ? i - 1 : i;
      saveConditionState(app, charName, state).then(() =>
        buildConditionUi(el, app, charName, state)
      );
    };
  }

  // Condition chips
  const grid = el.createDiv();
  grid.style.cssText = "display:flex; flex-wrap:wrap; gap:4px";

  for (const condition of CONDITIONS) {
    const active = state.active.includes(condition);
    const chip = grid.createEl("span", { text: condition });
    chip.style.cssText = [
      "padding:2px 8px; border-radius:10px; cursor:pointer;",
      "font-size:0.78em; font-weight:600; user-select:none; transition:all 0.1s;",
      `border:1px solid ${active ? "var(--color-red)" : "var(--background-modifier-border)"};`,
      `background:${active ? "var(--color-red)" : "var(--background-secondary)"};`,
      `color:${active ? "white" : "var(--text-muted)"};`,
    ].join(" ");
    chip.title = active ? `Remove ${condition}` : `Apply ${condition}`;
    chip.onclick = () => {
      if (active) state.active = state.active.filter(c => c !== condition);
      else        state.active = [...state.active, condition];
      saveConditionState(app, charName, state).then(() =>
        buildConditionUi(el, app, charName, state)
      );
    };
  }
}

export function renderConditionTracker(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const app = (window as any).app as App;
  const fm = app.metadataCache.getCache(ctx.sourcePath)?.frontmatter;
  if (!fm) { el.setText("No frontmatter."); return; }

  const charName: string = fm.name ?? "unknown";
  el.style.cssText = "font-family:var(--font-interface); font-size:0.9em";

  loadConditionState(app, charName).then(state =>
    buildConditionUi(el, app, charName, state)
  );
}

export function renderConditionsBlock(container: HTMLElement, app: App, charName: string) {
  container.style.cssText = "font-family:var(--font-interface); font-size:0.9em";
  loadConditionState(app, charName).then(state =>
    buildConditionUi(container, app, charName, state)
  );
}
