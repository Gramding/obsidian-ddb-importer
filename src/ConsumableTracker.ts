import { App } from "obsidian";

interface ConsumableState {
  used: Record<string, number>;
}

const consumableCache: Record<string, ConsumableState> = {};

async function loadConsumableState(app: App, charName: string): Promise<ConsumableState> {
  if (consumableCache[charName]) return consumableCache[charName];
  const plugin = (app as any).plugins.plugins["ddb-importer"];
  const saved = await plugin?.loadData();
  const state: ConsumableState = saved?.consumables?.[charName] ?? { used: {} };
  consumableCache[charName] = state;
  return state;
}

async function saveConsumableState(app: App, charName: string, state: ConsumableState) {
  consumableCache[charName] = state;
  const plugin = (app as any).plugins.plugins["ddb-importer"];
  if (!plugin) return;
  const saved = (await plugin.loadData()) ?? {};
  if (!saved.consumables) saved.consumables = {};
  saved.consumables[charName] = state;
  await plugin.saveData(saved);
}

export async function resetConsumablesOnRest(
  app: App,
  charName: string,
  consumables: { stateKey: string; resetOn: string | null }[],
  restType: "short" | "long"
): Promise<void> {
  const state = await loadConsumableState(app, charName);
  for (const c of consumables) {
    if (restType === "long") {
      state.used[c.stateKey] = 0;
    } else if (restType === "short" && (c.resetOn === "short-rest" || c.resetOn === "long-rest")) {
      state.used[c.stateKey] = 0;
    }
  }
  await saveConsumableState(app, charName, state);
}

export function renderConsumablesBlock(
  el: HTMLElement,
  app: App,
  charName: string,
  consumables: { label: string; stateKey: string; uses: number; resetOn: string | null }[]
): void {
  if (!consumables.length) return;
  loadConsumableState(app, charName).then(state =>
    buildConsumableUi(el, app, charName, consumables, state)
  );
}

function buildConsumableUi(
  el: HTMLElement,
  app: App,
  charName: string,
  consumables: { label: string; stateKey: string; uses: number; resetOn: string | null }[],
  state: ConsumableState
) {
  el.empty();

  for (const c of consumables) {
    const used      = state.used[c.stateKey] ?? 0;
    const remaining = c.uses - used;

    const row = el.createDiv();
    row.style.cssText = "display:flex; align-items:center; padding:3px 0; border-bottom:1px solid var(--background-modifier-border-hover); gap:6px";

    row.createDiv({ text: c.label }).style.cssText = "flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:0.88em";

    const dots = row.createDiv();
    dots.style.cssText = "display:flex; gap:3px; flex-shrink:0; flex-wrap:wrap";

    for (let i = 0; i < c.uses; i++) {
      const filled = i < remaining;
      const dot    = dots.createEl("span");
      dot.style.cssText = [
        "width:10px; height:10px; border-radius:50%; cursor:pointer; flex-shrink:0; display:inline-block; transition:background 0.1s;",
        `border:1.5px solid var(--interactive-accent);`,
        `background:${filled ? "var(--interactive-accent)" : "transparent"};`,
      ].join(" ");
      dot.title = filled ? "Use" : "Restore";
      dot.onclick = () => {
        if (filled) state.used[c.stateKey] = (state.used[c.stateKey] ?? 0) + 1;
        else        state.used[c.stateKey] = Math.max(0, (state.used[c.stateKey] ?? 0) - 1);
        saveConsumableState(app, charName, state).then(() =>
          buildConsumableUi(el, app, charName, consumables, state)
        );
      };
    }

    row.createEl("span", { text: `${remaining}/${c.uses}` }).style.cssText =
      "font-size:0.75em; color:var(--text-muted); min-width:28px; text-align:right; flex-shrink:0";

    if (c.resetOn) {
      const tag = row.createEl("span", { text: c.resetOn === "short-rest" ? "SR" : "LR" });
      tag.style.cssText = "font-size:0.65em; color:var(--text-faint); flex-shrink:0; font-weight:600";
      tag.title = c.resetOn === "short-rest" ? "Resets on short rest" : "Resets on long rest";
    }
  }
}
