export interface InventoryItem {
  name: string;
  type: string;
  quantity: number;
  weight: number;
  equipped: boolean;
  magic: boolean;
  rarity: string;
  requiresAttunement: boolean;
  attuned: boolean;
  description: string;
  ac: number | null;
  damage: string | null;
}

function stripHtml(html: string): string {
  return (html ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r\n/g, "\n")
    .trim();
}

function parseDamage(def: any): string | null {
  if (!def.damage) return null;
  const d = def.damage;
  const dice = `${d.diceCount}d${d.diceValue}`;
  const type = def.damageType ?? "";
  return `${dice} ${type}`.trim();
}

export function parseInventory(data: any): InventoryItem[] {
  return (data.inventory ?? []).map((item: any) => {
    const def = item.definition;
    return {
      name: def.name,
      type: def.filterType ?? def.type ?? "Gear",
      quantity: item.quantity ?? 1,
      weight: def.weight ?? 0,
      equipped: item.equipped ?? false,
      magic: def.magic ?? false,
      rarity: def.rarity ?? "Common",
      requiresAttunement: def.canAttune ?? false,
      attuned: item.isAttuned ?? false,
      description: stripHtml(def.description ?? ""),
      ac: def.armorClass ?? null,
      damage: parseDamage(def),
    };
  }).sort((a: InventoryItem, b: InventoryItem) => {
    // Equipped first, then by type, then alphabetically
    if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.name.localeCompare(b.name);
  });
}

export interface ItemFile {
  path: string;
  content: string;
}

export function renderItemFiles(charName: string, items: InventoryItem[], basePath: string): ItemFile[] {
  return items.map(i => {
    const safeName = i.name.replace(/[\\/:*?"<>|]/g, "");

    const content = `---
name: "${i.name}"
item_type: "${i.type}"
quantity: ${i.quantity}
weight: ${i.weight}
equipped: ${i.equipped}
magic: ${i.magic}
rarity: "${i.rarity}"
requires_attunement: ${i.requiresAttunement}
attuned: ${i.attuned}
${i.ac != null ? `armor_class: ${i.ac}` : ""}
${i.damage != null ? `damage: "${i.damage}"` : ""}
character: "${charName}"
tags:
  - dnd/item
  - dnd/${charName.toLowerCase().replace(/\s+/g, "-")}
---

# ${i.name}

| | |
|---|---|
| **Type** | ${i.type} |
| **Rarity** | ${i.rarity} |
| **Quantity** | ${i.quantity} |
| **Weight** | ${i.weight} lb |
| **Equipped** | ${i.equipped ? "✓" : "—"} |
| **Magic** | ${i.magic ? "✨" : "—"} |
${i.attuned ? "| **Attuned** | 🔗 Yes |\n" : ""}${i.ac != null ? `| **AC** | ${i.ac} |\n` : ""}${i.damage != null ? `| **Damage** | ${i.damage} |\n` : ""}

${i.description || ""}
`;

    return {
      path: `${basePath}/Items/${safeName}.md`,
      content,
    };
  });
}

export function renderInventoryBase(charName: string, basePath: string): string {
  const folder = `${basePath}/Items`;
  return `filters:
  and:
    - file.inFolder("${folder}")
properties:
  item_type:
    displayName: Type
  quantity:
    displayName: Qty
  weight:
    displayName: Weight
  rarity:
    displayName: Rarity
  equipped:
    displayName: Equipped
  magic:
    displayName: Magic
  armor_class:
    displayName: AC
  damage:
    displayName: Damage
views:
  - type: table
    name: All Items
    order:
      - file.name
      - item_type
      - quantity
      - weight
      - rarity
      - equipped
      - magic
    sort:
      - property: equipped
        direction: DESC
      - property: item_type
        direction: ASC
      - property: file.name
        direction: ASC
  - type: table
    name: Equipped
    filters:
      and:
        - equipped == true
    order:
      - file.name
      - item_type
      - rarity
      - armor_class
      - damage
  - type: table
    name: Magic Items
    filters:
      and:
        - magic == true
    order:
      - file.name
      - item_type
      - rarity
      - attuned
`;
}
