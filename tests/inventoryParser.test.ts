import { describe, it, expect } from "vitest";
import { parseInventory } from "../src/inventoryParser";

function makeItem(defOverrides: Record<string, any>, equipped = false, quantity = 1): any {
  return {
    equipped,
    quantity,
    isAttuned: false,
    definition: {
      name: "Item",
      filterType: "Gear",
      weight: 0,
      magic: false,
      rarity: "Common",
      canAttune: false,
      description: "",
      grantedModifiers: [],
      ...defOverrides,
    },
  };
}

// ─────────────────────────────────────────────
// Sorting
// ─────────────────────────────────────────────
describe("parseInventory — sorting", () => {
  it("equipped items sort before unequipped", () => {
    const data = {
      inventory: [
        makeItem({ name: "Rope", filterType: "Gear" }, false),
        makeItem({ name: "Plate Armor", filterType: "Armor" }, true),
      ],
    };
    const result = parseInventory(data);
    expect(result[0]?.name).toBe("Plate Armor");
    expect(result[1]?.name).toBe("Rope");
  });

  it("within equipped: sorts by type first, then name", () => {
    const data = {
      inventory: [
        makeItem({ name: "Rapier", filterType: "Weapon" }, true),
        makeItem({ name: "Shield", filterType: "Armor" }, true),
        makeItem({ name: "Plate Armor", filterType: "Armor" }, true),
      ],
    };
    const result = parseInventory(data);
    expect(result[0]?.type).toBe("Armor");   // Armor < Weapon
    expect(result[1]?.type).toBe("Armor");
    expect(result[0]?.name).toBe("Plate Armor");  // P before S
    expect(result[2]?.type).toBe("Weapon");
  });

  it("unequipped: same type/name sort after all equipped", () => {
    const data = {
      inventory: [
        makeItem({ name: "Dagger", filterType: "Weapon" }, false),
        makeItem({ name: "Axe", filterType: "Weapon" }, false),
        makeItem({ name: "Longbow", filterType: "Weapon" }, true),
      ],
    };
    const result = parseInventory(data);
    expect(result[0]?.name).toBe("Longbow");
    expect(result[1]?.name).toBe("Axe");
    expect(result[2]?.name).toBe("Dagger");
  });

  it("empty inventory returns empty array", () => {
    expect(parseInventory({ inventory: [] })).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// Damage Parsing
// ─────────────────────────────────────────────
describe("parseInventory — damage parsing", () => {
  it("returns null when no damage property on definition", () => {
    const data = { inventory: [makeItem({ name: "Rope", damage: null })] };
    expect(parseInventory(data)[0]?.damage).toBeNull();
  });

  it("formats diceCount and diceValue with damageType", () => {
    const data = {
      inventory: [makeItem({ name: "Longsword", damage: { diceCount: 1, diceValue: 8 }, damageType: "slashing" })],
    };
    expect(parseInventory(data)[0]?.damage).toBe("1d8 slashing");
  });

  it("2d6 piercing", () => {
    const data = {
      inventory: [makeItem({ name: "Greatsword", damage: { diceCount: 2, diceValue: 6 }, damageType: "slashing" })],
    };
    expect(parseInventory(data)[0]?.damage).toBe("2d6 slashing");
  });

  it("trims trailing space when damageType is absent", () => {
    const data = {
      inventory: [makeItem({ name: "Fist", damage: { diceCount: 1, diceValue: 4 } })],
    };
    // No damageType → "" → trimmed to just dice
    expect(parseInventory(data)[0]?.damage).toBe("1d4");
  });
});

// ─────────────────────────────────────────────
// Fields and Defaults
// ─────────────────────────────────────────────
describe("parseInventory — field mapping", () => {
  it("rarity defaults to 'Common' when absent", () => {
    const data = { inventory: [makeItem({ name: "Stick", rarity: undefined })] };
    expect(parseInventory(data)[0]?.rarity).toBe("Common");
  });

  it("quantity comes from item (not definition)", () => {
    const item = makeItem({ name: "Arrow" }, false, 20);
    const result = parseInventory({ inventory: [item] });
    expect(result[0]?.quantity).toBe(20);
  });

  it("armorClass field maps to ac property", () => {
    const data = { inventory: [makeItem({ name: "Chain Mail", armorClass: 16 })] };
    expect(parseInventory(data)[0]?.ac).toBe(16);
  });

  it("ac is null when no armorClass", () => {
    const data = { inventory: [makeItem({ name: "Rope" })] };
    expect(parseInventory(data)[0]?.ac).toBeNull();
  });

  it("requiresAttunement maps from canAttune field", () => {
    const data = {
      inventory: [{
        equipped: false,
        quantity: 1,
        isAttuned: false,
        definition: {
          name: "Ring of Protection",
          filterType: "Ring",
          canAttune: true,
          rarity: "Rare",
          magic: true,
          weight: 0,
          description: "",
          grantedModifiers: [],
        },
      }],
    };
    expect(parseInventory(data)[0]?.requiresAttunement).toBe(true);
  });

  it("attuned maps from isAttuned item field", () => {
    const item = makeItem({ name: "Belt" });
    item.isAttuned = true;
    expect(parseInventory({ inventory: [item] })[0]?.attuned).toBe(true);
  });

  it("magic flag passed through", () => {
    const data = { inventory: [makeItem({ name: "Flametongue", magic: true })] };
    expect(parseInventory(data)[0]?.magic).toBe(true);
  });

  it("description passed through htmlToMarkdown conversion", () => {
    const data = {
      inventory: [makeItem({ name: "Cloak", description: "<p><strong>Magic</strong> cloak of shadows.</p>" })],
    };
    expect(parseInventory(data)[0]?.description).toContain("**Magic**");
  });

  it("type falls back to definition.type when filterType absent", () => {
    const data = { inventory: [makeItem({ name: "Gold", filterType: undefined, type: "Currency" })] };
    expect(parseInventory(data)[0]?.type).toBe("Currency");
  });

  it("type defaults to 'Gear' when neither filterType nor type present", () => {
    const data = { inventory: [makeItem({ name: "Widget", filterType: undefined, type: undefined })] };
    expect(parseInventory(data)[0]?.type).toBe("Gear");
  });
});
