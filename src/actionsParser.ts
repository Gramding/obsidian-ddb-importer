export interface Action {
  name: string;
  type: string;        // "Attack", "Action", "Bonus Action", "Reaction", "Other"
  activation: string;
  range: string;
  hit: string | null;
  damage: string | null;
  saveDc: string | null;
  notes: string;
  source: string;
}

export interface ActionFile {
  path: string;
  content: string;
}

const ACTIVATION_TYPE_MAP: Record<number, string> = {
  1: "Action",
  2: "Bonus Action",
  3: "Reaction",
  4: "1 Minute",
  5: "10 Minutes",
  6: "1 Hour",
  7: "Special",
  8: "No Action",
  9: "Hours",
};

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function parseWeaponActions(
  inventory: any[],
  profBonus: number,
  strMod: number,
  dexMod: number,
  proficientWeapons: Set<string>
): Action[] {
  const actions: Action[] = [];

  for (const item of inventory) {
    if (!item.equipped) continue;
    const def = item.definition;
    if (def.filterType !== "Weapon") continue;

    const isFinesse = (def.properties ?? []).some((p: any) => p.name === "Finesse");
    const isRanged = def.attackType === 2;
    const isThrown = (def.properties ?? []).some((p: any) => p.name === "Thrown");

    // Determine ability mod to use
    let abilityMod = isRanged ? dexMod : strMod;
    if (isFinesse) abilityMod = Math.max(strMod, dexMod);

    // Proficiency
    const isProficient = proficientWeapons.has("simple-weapons") ||
      proficientWeapons.has("martial-weapons") ||
      proficientWeapons.has(def.name.toLowerCase().replace(/\s+/g, "-"));
    const prof = isProficient ? profBonus : 0;

    const attackBonus = abilityMod + prof;
    const dmg = def.damage;
    const damageStr = dmg ? `${dmg.diceString}${signed(abilityMod)}` : "—";

    const props = (def.properties ?? []).map((p: any) => p.name).join(", ");
    const range = def.range
      ? def.longRange
        ? `${def.range}/${def.longRange} ft`
        : `${def.range} ft`
      : "5 ft";

    actions.push({
      name: def.name,
      type: "Attack",
      activation: "Action",
      range,
      hit: signed(attackBonus),
      damage: `${damageStr} ${def.damageType ?? ""}`.trim(),
      saveDc: null,
      notes: props,
      source: "Weapon",
    });
  }

  return actions;
}

function parseSpellActions(spells: any[]): Action[] {
  return spells
    .filter(s => s.attackBonus !== null || s.saveDc !== null)
    .map(s => ({
      name: s.name,
      type: s.attackBonus ? "Attack" : "Save",
      activation: s.castingTime,
      range: s.range,
      hit: s.attackBonus ?? null,
      damage: s.damage ?? s.healing ?? null,
      saveDc: s.saveDc ?? null,
      notes: `${s.school} ${s.level === 0 ? "Cantrip" : `L${s.level}`}${s.concentration ? " · C" : ""}`,
      source: "Spell",
    }));
}

function parseClassActions(actions: Record<string, any[]>, profBonus: number): Action[] {
  const result: Action[] = [];

  for (const [source, lst] of Object.entries(actions)) {
    for (const a of lst ?? []) {
      const activation = ACTIVATION_TYPE_MAP[a.activation?.activationType ?? 0] ?? "Action";
      const dice = a.dice ? a.dice.diceString : null;

      result.push({
        name: a.name,
        type: a.displayAsAttack ? "Attack" : "Action",
        activation,
        range: "—",
        hit: a.displayAsAttack ? `+${profBonus}` : null,
        damage: dice ?? null,
        saveDc: null,
        notes: a.limitedUse
          ? `${a.limitedUse.useProficiencyBonus ? profBonus : a.limitedUse.maxUses ?? "?"} uses`
          : "",
        source: source.charAt(0).toUpperCase() + source.slice(1),
      });
    }
  }

  return result;
}

export function parseActions(
  data: any,
  profBonus: number,
  strMod: number,
  dexMod: number,
  spells: any[]
): Action[] {
  // Collect weapon proficiencies
  const proficientWeapons = new Set<string>();
  for (const modGroup of Object.values(data.modifiers ?? {}) as any[][]) {
    for (const mod of modGroup ?? []) {
      if (mod.type === "proficiency") proficientWeapons.add(mod.subType ?? "");
    }
  }

  const weapons = parseWeaponActions(data.inventory ?? [], profBonus, strMod, dexMod, proficientWeapons);
  const spellActions = parseSpellActions(spells);
  const classActions = parseClassActions(data.actions ?? {}, profBonus);

  return [...weapons, ...spellActions, ...classActions];
}

export function renderActionsNote(charName: string, actions: Action[]): string {
  const byType: Record<string, Action[]> = {};
  for (const a of actions) {
    if (!byType[a.type]) byType[a.type] = [];
    byType[a.type]!.push(a);
  }

  const order = ["Attack", "Save", "Action", "Bonus Action", "Reaction", "Other"];

  const sections = order
    .filter(t => byType[t]?.length)
    .map(t => {
      const rows = (byType[t] ?? []).map(a =>
        `| [[${a.name}]] | ${a.activation} | ${a.range} | ${a.hit ?? "—"} | ${a.damage ?? "—"} | ${a.saveDc ?? "—"} | ${a.notes} | ${a.source} |`
      ).join("\n");

      return `## ${t}s

| Name | Activation | Range | Hit | Damage | Save DC | Notes | Source |
|------|-----------|-------|-----|--------|---------|-------|--------|
${rows}`;
    }).join("\n\n");

  return `# ${charName} — Actions

${sections}

> Auto-generated by DnD Beyond Sync · ${new Date().toLocaleString()}
`;
}
