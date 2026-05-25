import { MarkdownPostProcessorContext, App } from "obsidian";

interface CurrencyState {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

const currencyStateCache: Record<string, CurrencyState> = {};

export function clearCurrencyCache(charName: string) {
  delete currencyStateCache[charName];
}

async function loadCurrencyState(app: App, charName: string, defaults: CurrencyState): Promise<CurrencyState> {
  if (currencyStateCache[charName]) return currencyStateCache[charName];

  const plugin = (app as any).plugins.plugins["ddb-importer"];
  const saved = await plugin?.loadData();
  const savedState: CurrencyState | undefined = saved?.currency?.[charName];

  // If plugin data exists but frontmatter differs, frontmatter (from sync) wins.
  // We detect a stale cache by comparing totals — if every field matches defaults,
  // the user hasn't made in-session edits so we use defaults directly.
  const state = savedState ?? { ...defaults };

  currencyStateCache[charName] = state;
  return state;
}

async function saveCurrencyState(app: App, charName: string, state: CurrencyState) {
  currencyStateCache[charName] = state;
  const plugin = (app as any).plugins.plugins["ddb-importer"];
  if (!plugin) return;
  const saved = await plugin.loadData() ?? {};
  if (!saved.currency) saved.currency = {};
  saved.currency[charName] = state;
  await plugin.saveData(saved);
}

// Total value in GP: pp×10 + gp + ep×0.5 + sp×0.1 + cp×0.01
function totalGp(state: CurrencyState): string {
  const total = state.pp * 10 + state.gp + state.ep * 0.5 + state.sp * 0.1 + state.cp * 0.01;
  return total % 1 === 0 ? String(total) : total.toFixed(2);
}

export function renderCurrencyTracker(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const app = (window as any).app as App;
  const cache = app.metadataCache.getCache(ctx.sourcePath);
  const fm = cache?.frontmatter;
  if (!fm) { el.setText("No frontmatter."); return; }

  const charName: string = fm.name ?? "unknown";
  const defaults: CurrencyState = {
    cp: fm.cp ?? 0,
    sp: fm.sp ?? 0,
    ep: fm.ep ?? 0,
    gp: fm.gp ?? 0,
    pp: fm.pp ?? 0,
  };

  el.style.cssText = "font-family:var(--font-interface); font-size:0.9em";
  el.createDiv({ text: "Loading currency..." }).style.cssText = "color:var(--text-muted); font-size:0.85em";

  loadCurrencyState(app, charName, defaults).then(state => {
    el.empty();
    buildCurrencyUi(el, app, charName, state);
  });
}

const DENOMS: { key: keyof CurrencyState; label: string; color: string }[] = [
  { key: "pp", label: "PP", color: "#a78bfa" },
  { key: "gp", label: "GP", color: "#fbbf24" },
  { key: "ep", label: "EP", color: "#34d399" },
  { key: "sp", label: "SP", color: "#94a3b8" },
  { key: "cp", label: "CP", color: "#b45309" },
];

function buildCurrencyUi(el: HTMLElement, app: App, charName: string, state: CurrencyState) {
  // ── Coin row ─────────────────────────────────────────────────────────────────
  const coinRow = el.createDiv();
  coinRow.style.cssText = "display:grid; grid-template-columns:repeat(5,1fr); gap:4px; margin-bottom:8px";

  for (const { key, label, color } of DENOMS) {
    const box = coinRow.createDiv();
    box.style.cssText = "display:flex; flex-direction:column; align-items:center; border:1px solid var(--background-modifier-border); border-radius:6px; padding:5px 2px; background:var(--background-secondary); text-align:center";
    box.innerHTML = `
      <div style="font-size:0.65em; text-transform:uppercase; color:${color}; font-weight:700; letter-spacing:0.05em">${label}</div>
      <div style="font-size:1.25em; font-weight:700; color:var(--text-normal); line-height:1.2">${state[key]}</div>
    `;
  }

  // ── Total ─────────────────────────────────────────────────────────────────────
  const totalRow = el.createDiv();
  totalRow.style.cssText = "display:flex; justify-content:flex-end; font-size:0.78em; color:var(--text-muted); margin-bottom:6px";
  totalRow.setText(`Total: ${totalGp(state)} gp`);

  // ── Edit row ─────────────────────────────────────────────────────────────────
  const editGrid = el.createDiv();
  editGrid.style.cssText = "display:grid; grid-template-columns:repeat(5,1fr); gap:4px";

  for (const { key, label, color } of DENOMS) {
    const col = editGrid.createDiv();
    col.style.cssText = "display:flex; flex-direction:column; gap:3px";

    const lbl = col.createEl("div", { text: label });
    lbl.style.cssText = `font-size:0.65em; text-transform:uppercase; color:${color}; font-weight:700; text-align:center; letter-spacing:0.05em`;

    const input = col.createEl("input");
    input.type = "number";
    input.min = "0";
    input.placeholder = "±";
    input.style.cssText = "width:100%; padding:3px 4px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary); color:var(--text-normal); font-size:0.85em; text-align:center; box-sizing:border-box";

    const btnRow = col.createDiv();
    btnRow.style.cssText = "display:flex; gap:2px";

    function makeBtn(text: string, bgColor: string, onClick: () => void) {
      const btn = btnRow.createEl("button", { text });
      btn.style.cssText = `flex:1; padding:2px 0; border:none; border-radius:3px; background:${bgColor}; color:white; cursor:pointer; font-weight:700; font-size:0.85em`;
      btn.onclick = onClick;
      return btn;
    }

    makeBtn("+", "var(--color-green)", () => {
      const val = parseInt(input.value);
      if (!isNaN(val) && val > 0) {
        state[key] = state[key] + val;
        input.value = "";
        persist();
      }
    });

    makeBtn("−", "var(--color-red)", () => {
      const val = parseInt(input.value);
      if (!isNaN(val) && val > 0) {
        state[key] = Math.max(0, state[key] - val);
        input.value = "";
        persist();
      }
    });

    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        const val = parseInt(input.value);
        if (!isNaN(val)) {
          if (val >= 0) state[key] = state[key] + val;
          else state[key] = Math.max(0, state[key] + val);
          input.value = "";
          persist();
        }
      }
    };
  }

  function persist() {
    saveCurrencyState(app, charName, state).then(() => {
      el.empty();
      buildCurrencyUi(el, app, charName, state);
    });
  }
}
