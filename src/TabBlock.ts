import { MarkdownPostProcessorContext, App, TFile, TFolder, MarkdownRenderer } from "obsidian";

async function getFilesInFolder(app: App, folderPath: string): Promise<TFile[]> {
  const folder = app.vault.getAbstractFileByPath(folderPath);
  if (!folder || !(folder instanceof TFolder)) return [];
  return folder.children.filter(f => f instanceof TFile) as TFile[];
}

async function readFrontmatter(app: App, file: TFile): Promise<Record<string, any>> {
  const cache = app.metadataCache.getFileCache(file);
  return cache?.frontmatter ?? {};
}

// ─── Spells Tab ──────────────────────────────────────────────────────────────

async function renderSpellsTab(container: HTMLElement, app: App, basePath: string, sourcePath: string) {
  const files = await getFilesInFolder(app, `${basePath}/Spells`);
  if (!files.length) {
    container.createDiv({ text: "No spells found." }).style.cssText = "color:var(--text-muted); padding:8px";
    return;
  }

  const spells = await Promise.all(files.map(f => readFrontmatter(app, f)));
  spells.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || (a.name ?? "").localeCompare(b.name ?? ""));

  const byLevel: Record<number, any[]> = {};
  for (const s of spells) {
    const lvl = s.level ?? 0;
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(s);
  }

  for (const [lvl, list] of Object.entries(byLevel).sort(([a], [b]) => Number(a) - Number(b))) {
    const lvlHeader = container.createDiv();
    lvlHeader.style.cssText = "font-size:0.75em; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.08em; border-bottom:1px solid var(--background-modifier-border); padding:4px 0 2px 0; margin:8px 0 4px 0";
    lvlHeader.setText(Number(lvl) === 0 ? "Cantrips" : `Level ${lvl}`);

    const table = container.createEl("table");
    table.style.cssText = "width:100%; border-collapse:collapse; font-size:0.88em; margin-bottom:4px";

    const thead = table.createEl("thead");
    const hrow  = thead.createEl("tr");
    for (const h of ["Name", "School", "Cast Time", "Range", "Duration", "Attack", "Save DC", "Damage"]) {
      const th = hrow.createEl("th", { text: h });
      th.style.cssText = "text-align:left; padding:3px 6px; color:var(--text-muted); font-weight:600; font-size:0.9em; border-bottom:1px solid var(--background-modifier-border); white-space:nowrap";
    }

    const tbody = table.createEl("tbody");
    for (const s of list) {
      const tr = tbody.createEl("tr");
      tr.style.cssText = "border-bottom:1px solid var(--background-modifier-border-hover)";
      tr.onmouseenter = () => tr.style.background = "var(--background-modifier-hover)";
      tr.onmouseleave = () => tr.style.background = "";

      const vals = [
        s.name ?? "—",
        s.school ?? "—",
        s.casting_time ?? "—",
        s.range ?? "—",
        s.duration ?? "—",
        s.attack_bonus ?? "—",
        s.save_dc ?? "—",
        s.damage ?? s.healing ?? "—",
      ];

      vals.forEach((val, idx) => {
        const td = tr.createEl("td");
        td.style.cssText = "padding:3px 6px; white-space:nowrap";

        if (idx === 0) {
          // Name as wikilink
          const spellName = s.name ?? "Unknown";
          const safeName  = spellName.replace(/[\\/:*?"<>|]/g, "");
          const linkPath  = `${basePath}/Spells/${safeName}`;

          const a = td.createEl("a");
          a.className = "internal-link";
          a.setAttribute("data-href", linkPath);
          a.href = linkPath;
          a.textContent = spellName;
          a.onclick = (e) => {
            e.preventDefault();
            (app as any).workspace.openLinkText(linkPath, sourcePath);
          };

          if (s.concentration) {
            td.createEl("span", { text: " C" }).style.cssText = "color:var(--text-faint); font-size:0.8em";
          }
          if (s.ritual) {
            td.createEl("span", { text: " R" }).style.cssText = "color:var(--text-faint); font-size:0.8em";
          }
        } else {
          td.textContent = String(val);
        }
      });
    }
  }
}

// ─── Inventory Tab ───────────────────────────────────────────────────────────

async function renderInventoryTab(container: HTMLElement, app: App, basePath: string, sourcePath: string) {
  const files = await getFilesInFolder(app, `${basePath}/Items`);
  if (!files.length) {
    container.createDiv({ text: "No items found." }).style.cssText = "color:var(--text-muted); padding:8px";
    return;
  }

  const items = await Promise.all(files.map(f => readFrontmatter(app, f)));
  items.sort((a, b) => {
    if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  const equipped   = items.filter(i => i.equipped);
  const unequipped = items.filter(i => !i.equipped);

  for (const [groupName, group] of [["Equipped", equipped], ["Carried", unequipped]] as [string, any[]][]) {
    if (!group.length) continue;

    const groupHeader = container.createDiv({ text: groupName });
    groupHeader.style.cssText = "font-size:0.75em; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.08em; border-bottom:1px solid var(--background-modifier-border); padding:4px 0 2px 0; margin:8px 0 4px 0";

    const table = container.createEl("table");
    table.style.cssText = "width:100%; border-collapse:collapse; font-size:0.88em; margin-bottom:4px";

    const thead = table.createEl("thead");
    const hrow  = thead.createEl("tr");
    for (const h of ["Name", "Type", "Qty", "Weight", "Rarity", "AC", "Damage", "Flags"]) {
      const th = hrow.createEl("th", { text: h });
      th.style.cssText = "text-align:left; padding:3px 6px; color:var(--text-muted); font-weight:600; font-size:0.9em; border-bottom:1px solid var(--background-modifier-border); white-space:nowrap";
    }

    const tbody = table.createEl("tbody");
    for (const i of group) {
      const tr = tbody.createEl("tr");
      tr.style.cssText = "border-bottom:1px solid var(--background-modifier-border-hover)";
      tr.onmouseenter = () => tr.style.background = "var(--background-modifier-hover)";
      tr.onmouseleave = () => tr.style.background = "";

      const flags = [
        i.magic ? "✨" : null,
        i.attuned ? "🔗" : null,
        i.requires_attunement && !i.attuned ? "⚠" : null,
      ].filter(Boolean).join(" ");

      const vals = [
        i.name ?? "—",
        i.item_type ?? "—",
        String(i.quantity ?? 1),
        i.weight ? `${i.weight} lb` : "—",
        i.rarity ?? "—",
        i.armor_class ? `AC ${i.armor_class}` : "—",
        i.damage ?? "—",
        flags || "—",
      ];

      vals.forEach((val, idx) => {
        const td = tr.createEl("td");
        td.style.cssText = "padding:3px 6px; white-space:nowrap";

        if (idx === 0) {
          const safeName = String(val).replace(/[\\/:*?"<>|]/g, "");
          const linkPath = `${basePath}/Items/${safeName}`;
          const a = td.createEl("a");
          a.className = "internal-link";
          a.setAttribute("data-href", linkPath);
          a.href = linkPath;
          a.textContent = String(val);
          a.onclick = (e) => {
            e.preventDefault();
            (app as any).workspace.openLinkText(linkPath, sourcePath);
          };
        } else {
          td.textContent = String(val);
        }
      });
    }
  }

  const total = items.reduce((sum, i) => sum + ((i.weight ?? 0) * (i.quantity ?? 1)), 0);
  const footer = container.createDiv();
  footer.style.cssText = "text-align:right; font-size:0.8em; color:var(--text-muted); margin-top:6px";
  footer.setText(`Total weight: ${total.toFixed(1)} lb`);
}

// ─── Features Tab ────────────────────────────────────────────────────────────

async function renderFeaturesTab(container: HTMLElement, app: App, basePath: string, sourcePath: string) {
  const files = await getFilesInFolder(app, `${basePath}/Features`);
  if (!files.length) {
    container.createDiv({ text: "No features found." }).style.cssText = "color:var(--text-muted); padding:8px";
    return;
  }

  const features: any[] = await Promise.all(files.map(async f => ({
    ...await readFrontmatter(app, f),
    _content: await app.vault.cachedRead(f),
    _path: f.path,
  })));

  features.sort((a, b) =>
    (a.source ?? "").localeCompare(b.source ?? "") ||
    (a.name ?? "").localeCompare(b.name ?? "")
  );

  const bySource: Record<string, any[]> = {};
  for (const f of features) {
    const src = f.source ?? "Unknown";
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(f);
  }

  for (const [source, list] of Object.entries(bySource)) {
    const srcHeader = container.createDiv({ text: source });
    srcHeader.style.cssText = "font-size:0.75em; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.08em; border-bottom:1px solid var(--background-modifier-border); padding:4px 0 2px 0; margin:8px 0 4px 0";

    for (const f of list) {
      const item = container.createDiv();
      item.style.cssText = "border-bottom:1px solid var(--background-modifier-border-hover); padding:4px 0";

      const nameRow = item.createDiv();
      nameRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; cursor:pointer; padding:2px 0";

      // Name as wikilink
      const nameLink = nameRow.createEl("a");
      nameLink.className = "internal-link";
      nameLink.setAttribute("data-href", f._path);
      nameLink.href = f._path;
      nameLink.textContent = f.name ?? "Unknown";
      nameLink.style.cssText = "font-weight:600";
      nameLink.onclick = (e) => e.stopPropagation();

      const chevron = nameRow.createEl("span", { text: "▼" });
      chevron.style.cssText = "color:var(--text-faint); font-size:0.8em; margin-left:8px; flex-shrink:0";

      const desc = item.createDiv();
      desc.style.cssText = "font-size:0.88em; padding:6px 0 2px 0; display:none; line-height:1.6";

      // Strip frontmatter, heading, and info table from content
      const content = f._content
        .replace(/^---[\s\S]*?---\n/, "")
        .replace(/^#[^\n]*\n/, "")
        .replace(/^\|[^\n]*\n(\|[^\n]*\n)+/, "")
        .trim();

      let open = false;
      let rendered = false;

      nameRow.onclick = async () => {
        open = !open;
        desc.style.display = open ? "block" : "none";
        chevron.textContent = open ? "▲" : "▼";

        if (open && !rendered) {
          rendered = true;
          await MarkdownRenderer.render(
            app,
            content,
            desc,
            sourcePath,
            null as any
          );
        }
      };
    }
  }
}

// ─── Actions Tab ─────────────────────────────────────────────────────────────

async function renderActionsTab(container: HTMLElement, app: App, charName: string, charFolder: string, sourcePath: string) {
  const actionsPath = `${charFolder}/${charName} - Actions.md`;
  const file = app.vault.getAbstractFileByPath(actionsPath);

  if (!file || !(file instanceof TFile)) {
    container.createDiv({ text: "No actions file found. Try syncing first." }).style.cssText = "color:var(--text-muted); padding:8px";
    return;
  }

  const content = await app.vault.cachedRead(file);
  const lines   = content.split("\n");

  let currentTable: HTMLTableElement | null = null;
  let tbody: HTMLTableSectionElement | null  = null;
  let headerParsed = false;

  for (const line of lines) {
    // Skip frontmatter and title
    if (line.startsWith("---") || line.startsWith("# ")) continue;

    // Section header
    if (line.startsWith("## ")) {
      currentTable  = null;
      tbody         = null;
      headerParsed  = false;

      const h = container.createDiv();
      h.textContent = line.replace(/^##\s+/, "");
      h.style.cssText = "font-size:0.75em; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.08em; border-bottom:1px solid var(--background-modifier-border); padding:4px 0 2px 0; margin:8px 0 4px 0";
      continue;
    }

    // Separator row — skip
    if (line.match(/^\|[-:\s|]+\|$/)) continue;

    // Table row
    if (line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map(c => c.trim());

      if (!headerParsed) {
        currentTable = container.createEl("table");
        currentTable.style.cssText = "width:100%; border-collapse:collapse; font-size:0.88em; margin-bottom:8px";

        const thead = currentTable.createEl("thead");
        const hrow  = thead.createEl("tr");
        for (const h of cells) {
          const th = hrow.createEl("th", { text: h });
          th.style.cssText = "text-align:left; padding:3px 6px; color:var(--text-muted); font-weight:600; font-size:0.9em; border-bottom:1px solid var(--background-modifier-border); white-space:nowrap";
        }
        tbody = currentTable.createEl("tbody");
        headerParsed = true;
        continue;
      }

      if (!tbody) continue;

      const tr = tbody.createEl("tr");
      tr.style.cssText = "border-bottom:1px solid var(--background-modifier-border-hover)";
      tr.onmouseenter = () => tr.style.background = "var(--background-modifier-hover)";
      tr.onmouseleave = () => tr.style.background = "";

      for (const cell of cells) {
        const td = tr.createEl("td");
        td.style.cssText = "padding:3px 6px; white-space:nowrap";

        // Render wikilinks as clickable internal links
        const wikiRegex = /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g;
        let last = 0;
        let match;
        const fragment = document.createDocumentFragment();

        while ((match = wikiRegex.exec(cell)) !== null) {
          if (match.index > last) {
            fragment.appendChild(document.createTextNode(cell.slice(last, match.index)));
          }
          const linkTarget = match[1] ?? "";
          const linkText   = match[3] ?? match[1] ?? "";
          const a = document.createElement("a");
          a.className = "internal-link";
          a.setAttribute("data-href", linkTarget);
          a.href = linkTarget;
          a.textContent = linkText;
          a.onclick = (e) => {
            e.preventDefault();
            (app as any).workspace.openLinkText(linkTarget, sourcePath);
          };
          fragment.appendChild(a);
          last = match.index + match[0].length;
        }

        if (last < cell.length) {
          fragment.appendChild(document.createTextNode(cell.slice(last)));
        }

        td.appendChild(fragment);
      }
      continue;
    }

    // Non-table, non-empty line resets table state
    if (line.trim() !== "") {
      currentTable  = null;
      tbody         = null;
      headerParsed  = false;
    }
  }
}

// ─── Main Tab Block ──────────────────────────────────────────────────────────

export function renderTabBlock(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  const app        = (window as any).app as App;
  const cache      = app.metadataCache.getCache(ctx.sourcePath);
  const fm         = cache?.frontmatter;
  if (!fm) { el.setText("No frontmatter found."); return; }

  const charName:   string = fm.name ?? "Character";
  const sourcePath: string = ctx.sourcePath;
  const charFolder: string = sourcePath.substring(0, sourcePath.lastIndexOf("/"));
  const basePath:   string = `${charFolder}/Components`;

  el.style.cssText = "font-family:var(--font-interface); font-size:1em";

  // ── Tab bar ────────────────────────────────────────────────────────────
  const TABS = ["Spells", "Inventory", "Features", "Actions"] as const;
  type Tab = typeof TABS[number];

  let activeTab: Tab = "Spells";

  const tabBar = el.createDiv();
  tabBar.style.cssText = "display:flex; gap:0; border-bottom:2px solid var(--background-modifier-border); margin-bottom:8px";

  const contentArea = el.createDiv();
  contentArea.style.cssText = "min-height:100px; overflow-x:auto";

  const tabButtons: Partial<Record<Tab, HTMLElement>> = {};

  function setTabStyle(tab: Tab, active: boolean) {
    const btn = tabButtons[tab];
    if (!btn) return;
    if (active) {
      btn.style.cssText = "padding:6px 16px; cursor:pointer; border:none; background:none; font-size:0.9em; font-weight:700; color:var(--text-normal); border-bottom:2px solid var(--interactive-accent); margin-bottom:-2px; transition:all 0.1s";
    } else {
      btn.style.cssText = "padding:6px 16px; cursor:pointer; border:none; background:none; font-size:0.9em; color:var(--text-muted); border-bottom:2px solid transparent; margin-bottom:-2px; transition:all 0.1s";
    }
  }

  function activateTab(tab: Tab) {
    activeTab = tab;
    contentArea.empty();

    for (const t of TABS) setTabStyle(t, t === tab);

    const loading = contentArea.createDiv({ text: `Loading ${tab}…` });
    loading.style.cssText = "color:var(--text-muted); font-size:0.85em; padding:12px";

    const render = async () => {
      contentArea.empty();
      if (tab === "Spells")    await renderSpellsTab(contentArea, app, basePath, sourcePath);
      if (tab === "Inventory") await renderInventoryTab(contentArea, app, basePath, sourcePath);
      if (tab === "Features")  await renderFeaturesTab(contentArea, app, basePath, sourcePath);
      if (tab === "Actions")   await renderActionsTab(contentArea, app, charName, charFolder, sourcePath);
    };

    render();
  }

  for (const tab of TABS) {
    const btn = tabBar.createEl("button", { text: tab });
    btn.style.cssText = "padding:6px 16px; cursor:pointer; border:none; background:none; font-size:0.9em; color:var(--text-muted); border-bottom:2px solid transparent; margin-bottom:-2px";
    btn.onclick = () => activateTab(tab);
    tabButtons[tab] = btn;
  }

  activateTab("Spells");
}