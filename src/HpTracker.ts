import { MarkdownPostProcessorContext, Plugin, App } from "obsidian";

interface HpState {
  current: number;
  temp: number;
  maxOverride: number | null;
}

const hpStateCache: Record<string, HpState> = {};

async function loadHpState(app: App, charName: string, defaultMax: number): Promise<HpState> {
  if (hpStateCache[charName]) return hpStateCache[charName];

  const plugin = (app as any).plugins.plugins["ddb-importer"];
  const saved = await plugin?.loadData();
  const state = saved?.hp?.[charName] ?? {
    current: defaultMax,
    temp: 0,
    maxOverride: null,
  };

  hpStateCache[charName] = state;
  return state;
}

async function saveHpState(app: App, charName: string, state: HpState) {
  hpStateCache[charName] = state;
  const plugin = (app as any).plugins.plugins["ddb-importer"];
  if (!plugin) return;
  const saved = await plugin.loadData() ?? {};
  if (!saved.hp) saved.hp = {};
  saved.hp[charName] = state;
  await plugin.saveData(saved);
}

export function renderHpTracker(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const app = (window as any).app as App;
  const cache = app.metadataCache.getCache(ctx.sourcePath);
  const fm = cache?.frontmatter;
  if (!fm) { el.setText("No frontmatter."); return; }

  const charName: string = fm.name ?? "unknown";
  const hpMax: number    = fm.hp_max ?? 0;

  el.style.cssText = "font-family:var(--font-interface); font-size:0.9em";

  // Render placeholder while loading
  el.createDiv({ text: "Loading HP..." }).style.cssText = "color:var(--text-muted); font-size:0.85em";

  loadHpState(app, charName, hpMax).then(state => {
    el.empty();
    buildHpUi(el, app, charName, hpMax, state);
  });
}

function buildHpUi(el: HTMLElement, app: App, charName: string, hpMax: number, state: HpState) {
  const effectiveMax = state.maxOverride ?? hpMax;

  // ── Bar ──────────────────────────────────────────────────────────────────
  const barWrap = el.createDiv();
  barWrap.style.cssText = "margin-bottom:8px";

  const barLabels = barWrap.createDiv();
  barLabels.style.cssText = "display:flex; justify-content:space-between; font-size:0.8em; color:var(--text-muted); margin-bottom:2px";
  barLabels.innerHTML = `<span>HP</span><span>${state.current} / ${effectiveMax}${state.temp > 0 ? ` <span style="color:var(--color-blue)">+${state.temp} temp</span>` : ""}</span>`;

  const track = barWrap.createDiv();
  track.style.cssText = "height:10px; background:var(--background-modifier-border); border-radius:5px; overflow:visible; position:relative";

  const pct     = Math.max(0, Math.min(100, effectiveMax > 0 ? (state.current / effectiveMax) * 100 : 0));
  const tempPct = Math.min(100 - pct, effectiveMax > 0 ? (state.temp / effectiveMax) * 100 : 0);
  const color   = pct > 50 ? "var(--color-green)" : pct > 25 ? "var(--color-yellow)" : "var(--color-red)";

  track.innerHTML = `
    <div style="position:absolute; left:0; top:0; height:100%; width:${pct}%; background:${color}; border-radius:5px; transition:width 0.2s"></div>
    <div style="position:absolute; left:${pct}%; top:0; height:100%; width:${tempPct}%; background:var(--color-blue); opacity:0.6; border-radius:0 5px 5px 0; transition:width 0.2s"></div>
  `;

  // ── Stats row ────────────────────────────────────────────────────────────
  const statsRow = el.createDiv();
  statsRow.style.cssText = "display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:8px";

  function statBox(label: string, value: number, color?: string): HTMLElement {
    const box = document.createElement("div");
    box.style.cssText = "display:flex; flex-direction:column; align-items:center; border:1px solid var(--background-modifier-border); border-radius:6px; padding:4px; background:var(--background-secondary)";
    box.innerHTML = `
      <div style="font-size:0.65em; text-transform:uppercase; color:var(--text-muted)">${label}</div>
      <div style="font-size:1.3em; font-weight:700; color:${color ?? "var(--text-normal)"}; line-height:1.2">${value}</div>
    `;
    return box;
  }

  statsRow.appendChild(statBox("Current", state.current, pct <= 25 ? "var(--color-red)" : "var(--text-normal)"));
  statsRow.appendChild(statBox("Max",     effectiveMax));
  statsRow.appendChild(statBox("Temp",    state.temp, state.temp > 0 ? "var(--color-blue)" : "var(--text-muted)"));

  // ── Input row ────────────────────────────────────────────────────────────
  const inputSection = el.createDiv();
  inputSection.style.cssText = "display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px";

  function inputGroup(label: string, placeholder: string, btnLabel: string, btnColor: string, onApply: (val: number) => void): HTMLElement {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex; flex-direction:column; gap:3px";

    const lbl = wrap.createEl("div", { text: label });
    lbl.style.cssText = "font-size:0.7em; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.05em";

    const row = wrap.createDiv();
    row.style.cssText = "display:flex; gap:4px";

    const input = row.createEl("input");
    input.type        = "number";
    input.min         = "0";
    input.placeholder = placeholder;
    input.style.cssText = "flex:1; min-width:0; padding:4px 6px; border:1px solid var(--background-modifier-border); border-radius:4px; background:var(--background-primary); color:var(--text-normal); font-size:0.9em; width:100%";

    const btn = row.createEl("button", { text: btnLabel });
    btn.style.cssText = `padding:4px 8px; border:none; border-radius:4px; background:${btnColor}; color:white; cursor:pointer; font-weight:700; font-size:0.9em; flex-shrink:0`;
    btn.onclick = () => {
      const val = parseInt(input.value);
      if (!isNaN(val) && val > 0) {
        onApply(val);
        input.value = "";
      }
    };

    // Also trigger on Enter
    input.onkeydown = (e) => { if (e.key === "Enter") btn.click(); };

    return wrap;
  }

  inputSection.appendChild(inputGroup(
    "Healing", "Amount", "+", "var(--color-green)",
    (val) => {
      state.current = Math.min(effectiveMax, state.current + val);
      persist();
    }
  ));

  inputSection.appendChild(inputGroup(
    "Damage", "Amount", "−", "var(--color-red)",
    (val) => {
      // Damage hits temp HP first
      if (state.temp > 0) {
        const absorbed = Math.min(state.temp, val);
        state.temp    -= absorbed;
        val           -= absorbed;
      }
      state.current = Math.max(0, state.current - val);
      persist();
    }
  ));

  // ── Secondary row ────────────────────────────────────────────────────────
  const secondRow = el.createDiv();
  secondRow.style.cssText = "display:grid; grid-template-columns:1fr 1fr; gap:6px";

  secondRow.appendChild(inputGroup(
    "Add Temp HP", "Amount", "Set", "var(--color-blue)",
    (val) => {
      // Temp HP doesn't stack — take the higher value
      state.temp = Math.max(state.temp, val);
      persist();
    }
  ));

  secondRow.appendChild(inputGroup(
    "Max Override", "Override", "Set", "var(--text-muted)",
    (val) => {
      state.maxOverride = val;
      persist();
    }
  ));

  // Reset max override button
  const resetWrap = el.createDiv();
  resetWrap.style.cssText = "margin-top:4px; text-align:right";
  const resetBtn = resetWrap.createEl("button", { text: "Reset max override" });
  resetBtn.style.cssText = "font-size:0.72em; color:var(--text-muted); background:none; border:none; cursor:pointer; text-decoration:underline; padding:0";
  resetBtn.onclick = () => {
    state.maxOverride = null;
    persist();
  };

  // ── Persist & re-render ──────────────────────────────────────────────────
  function persist() {
    saveHpState(app, charName, state).then(() => {
      el.empty();
      buildHpUi(el, app, charName, hpMax, state);
    });
  }
}