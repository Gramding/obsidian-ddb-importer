import { MarkdownPostProcessorContext, Plugin, App, Notice } from "obsidian";
import { resetSlotsForLongRest, setConcentration } from "./SpellSlotTracker";
import { resetConsumablesOnRest } from "./ConsumableTracker";

interface HpState {
  current: number;
  temp: number;
  maxOverride: number | null;
  hitDiceRemaining: Record<string, number>;
  deathSaves: { successes: number; failures: number };
  inspiration: boolean;
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
    hitDiceRemaining: {},
    deathSaves: { successes: 0, failures: 0 },
    inspiration: false,
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

  const charName: string   = fm.name ?? "unknown";
  const hpMax: number      = fm.hp_max ?? 0;
  const hitDiceInfo: { die: string; total: number; className: string }[] = fm.hit_dice ?? [];
  const consumables: { label: string; stateKey: string; uses: number; resetOn: string | null }[] = fm.consumables ?? [];

  el.style.cssText = "font-family:var(--font-interface); font-size:0.9em";
  el.createDiv({ text: "Loading HP..." }).style.cssText = "color:var(--text-muted); font-size:0.85em";

  loadHpState(app, charName, hpMax).then(state => {
    // Seed hitDiceRemaining for any class not yet tracked
    for (const hd of hitDiceInfo) {
      if (!(hd.className in state.hitDiceRemaining)) {
        state.hitDiceRemaining[hd.className] = hd.total;
      }
    }
    if (!state.deathSaves) state.deathSaves = { successes: 0, failures: 0 };
    if (state.inspiration === undefined) state.inspiration = false;
    el.empty();
    buildHpUi(el, app, charName, hpMax, hitDiceInfo, consumables, state);
  });
}

function buildHpUi(
  el: HTMLElement,
  app: App,
  charName: string,
  hpMax: number,
  hitDiceInfo: { die: string; total: number; className: string }[],
  consumables: { label: string; stateKey: string; uses: number; resetOn: string | null }[],
  state: HpState,
) {
  const effectiveMax = state.maxOverride ?? hpMax;

  // ── Inspiration ───────────────────────────────────────────────────────────
  const inspRow = el.createDiv();
  inspRow.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:3px 0; margin-bottom:6px; border-bottom:1px solid var(--background-modifier-border-hover)";
  inspRow.createEl("span", { text: "Inspiration" }).style.cssText = "font-size:0.82em; color:var(--text-muted)";
  const inspBtn = inspRow.createEl("span", { text: state.inspiration ? "★" : "☆" });
  inspBtn.style.cssText = `font-size:1.3em; cursor:pointer; color:${state.inspiration ? "var(--color-yellow)" : "var(--text-faint)"}; user-select:none; line-height:1`;
  inspBtn.title = state.inspiration ? "Lose inspiration" : "Gain inspiration";
  inspBtn.onclick = () => { state.inspiration = !state.inspiration; persist(); };

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
      const wasDown = state.current === 0;
      state.current = Math.min(effectiveMax, state.current + val);
      if (wasDown && state.current > 0) {
        state.deathSaves = { successes: 0, failures: 0 };
      }
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

  // ── Hit Dice ─────────────────────────────────────────────────────────────
  if (hitDiceInfo.length > 0) {
    const hdHeader = el.createDiv();
    hdHeader.style.cssText = "font-size:0.8em; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); border-bottom:1px solid var(--background-modifier-border); padding-bottom:2px; margin:8px 0 4px 0";
    hdHeader.textContent = "Hit Dice";

    for (const hd of hitDiceInfo) {
      const remaining = state.hitDiceRemaining[hd.className] ?? hd.total;
      const row = el.createDiv();
      row.style.cssText = "display:grid; grid-template-columns:1fr auto auto; gap:5px; align-items:center; padding:3px 0; border-bottom:1px solid var(--background-modifier-border-hover)";

      row.createDiv({ text: `${hd.className} (${hd.die}): ${remaining} / ${hd.total}` }).style.cssText = "font-size:0.88em";

      const useBtn = row.createEl("button", { text: "Use" });
      useBtn.style.cssText = "padding:2px 7px; border:none; border-radius:3px; background:var(--color-red); color:white; cursor:pointer; font-size:0.8em; font-weight:700";
      useBtn.onclick = () => {
        state.hitDiceRemaining[hd.className] = Math.max(0, remaining - 1);
        persist();
      };

      const restBtn = row.createEl("button", { text: "↺ Rest" });
      restBtn.style.cssText = "padding:2px 7px; border:none; border-radius:3px; background:var(--color-blue); color:white; cursor:pointer; font-size:0.8em; font-weight:700";
      restBtn.title = `Recover ${Math.floor(hd.total / 2)} hit dice (short rest)`;
      restBtn.onclick = () => {
        state.hitDiceRemaining[hd.className] = Math.min(hd.total, remaining + Math.floor(hd.total / 2));
        persist();
      };
    }
  }

  // ── Death Saves ───────────────────────────────────────────────────────────
  if (state.current === 0) {
    const dsHeader = el.createDiv();
    dsHeader.style.cssText = "font-size:0.8em; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--color-red); border-bottom:1px solid var(--background-modifier-border); padding-bottom:2px; margin:8px 0 4px 0";
    dsHeader.textContent = "Death Saving Throws";

    const { successes, failures } = state.deathSaves;

    if (successes >= 3) {
      const msg = el.createDiv({ text: "✓ Stable" });
      msg.style.cssText = "color:var(--color-green); font-weight:700; font-size:0.9em; padding:4px 0";
    } else if (failures >= 3) {
      const msg = el.createDiv({ text: "✕ Dead" });
      msg.style.cssText = "color:var(--color-red); font-weight:700; font-size:0.9em; padding:4px 0";
    } else {
      function saveDots(count: number, filled: number, color: string, onToggle: (n: number) => void): HTMLElement {
        const row = document.createElement("div");
        row.style.cssText = "display:flex; gap:5px; align-items:center";
        for (let i = 0; i < count; i++) {
          const dot = row.createEl("span");
          const active = i < filled;
          dot.style.cssText = `width:16px; height:16px; border-radius:50%; cursor:pointer; border:2px solid ${color}; background:${active ? color : "transparent"}; display:inline-block; flex-shrink:0`;
          dot.title = active ? "Click to unmark" : "Click to mark";
          dot.onclick = () => { onToggle(active ? i : i + 1); };
        }
        return row;
      }

      const succRow = el.createDiv();
      succRow.style.cssText = "display:flex; align-items:center; gap:8px; padding:3px 0";
      succRow.createEl("span", { text: "Success" }).style.cssText = "font-size:0.8em; color:var(--text-muted); min-width:54px";
      succRow.appendChild(saveDots(3, successes, "var(--color-green)", (n) => {
        state.deathSaves.successes = n;
        persist();
      }));

      const failRow = el.createDiv();
      failRow.style.cssText = "display:flex; align-items:center; gap:8px; padding:3px 0";
      failRow.createEl("span", { text: "Failure" }).style.cssText = "font-size:0.8em; color:var(--text-muted); min-width:54px";
      failRow.appendChild(saveDots(3, failures, "var(--color-red)", (n) => {
        state.deathSaves.failures = n;
        persist();
      }));
    }
  }

  // ── Rest Buttons ──────────────────────────────────────────────────────────
  const restSection = el.createDiv();
  restSection.style.cssText = "display:flex; gap:6px; margin-top:10px";

  const shortBtn = restSection.createEl("button", { text: "Short Rest" });
  shortBtn.style.cssText = "flex:1; padding:5px 4px; border:1px solid var(--background-modifier-border); border-radius:5px; background:var(--background-secondary); color:var(--text-muted); cursor:pointer; font-size:0.78em; font-weight:600";
  shortBtn.title = "Spend hit dice above to heal";
  shortBtn.onclick = async () => {
    state.deathSaves = { successes: 0, failures: 0 };
    await resetConsumablesOnRest(app, charName, consumables, "short");
    new Notice("Short rest taken — spend hit dice to heal.");
    persist();
  };

  const longBtn = restSection.createEl("button", { text: "Long Rest" });
  longBtn.style.cssText = "flex:1; padding:5px 4px; border:none; border-radius:5px; background:var(--interactive-accent); color:white; cursor:pointer; font-size:0.78em; font-weight:700";
  longBtn.title = "Restore HP, all spell slots, resources, and hit dice";
  longBtn.onclick = async () => {
    state.current = effectiveMax;
    state.temp = 0;
    state.deathSaves = { successes: 0, failures: 0 };
    for (const hd of hitDiceInfo) state.hitDiceRemaining[hd.className] = hd.total;
    await resetSlotsForLongRest(app, charName);
    await resetConsumablesOnRest(app, charName, consumables, "long");
    await setConcentration(app, charName, null);
    persist();
  };

  // ── Persist & re-render ──────────────────────────────────────────────────
  function persist() {
    saveHpState(app, charName, state).then(() => {
      el.empty();
      buildHpUi(el, app, charName, hpMax, hitDiceInfo, consumables, state);
    });
  }
}