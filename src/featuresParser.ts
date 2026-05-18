import { htmlToMarkdown } from "./utils";
export interface Feature {
  name: string;
  source: string;
  description: string;
}

export interface FeatureFile {
  path: string;
  content: string;
}

// Features to skip — purely mechanical, no useful description to show
const SKIP_FEATURES = new Set([
  "Hit Points", "Proficiencies", "Ability Score Increases",
  "Languages", "Size", "Speed", "Alchemist Spells",
  "Artificer Infusions",
]);

export function parseFeatures(data: any): Feature[] {
  const features: Feature[] = [];
  const seen = new Set<string>();

  const add = (name: string, source: string, description: string) => {
  if (!name || seen.has(name) || SKIP_FEATURES.has(name)) return;
  seen.add(name);
  features.push({ name, source, description: htmlToMarkdown(description) });
};

  // Class features
  for (const cls of data.classes ?? []) {
    const clsName: string = cls.definition?.name ?? "Unknown";
    const clsLevel: number = cls.level ?? 0;

    for (const f of cls.definition?.classFeatures ?? []) {
      if ((f.requiredLevel ?? 99) > clsLevel) continue;
      add(f.name, clsName, f.description ?? "");
    }

    // Subclass features
    const subDef = cls.subclassDefinition;
    if (subDef) {
      const subName = `${clsName} (${subDef.name})`;
      for (const f of subDef.classFeatures ?? []) {
        if ((f.requiredLevel ?? 99) > clsLevel) continue;
        add(f.name, subName, f.description ?? "");
      }
    }
  }

  // Racial traits
  for (const trait of data.race?.racialTraits ?? []) {
    const defn = trait.definition ?? {};
    add(defn.name, data.race?.fullName ?? data.race?.baseName ?? "Race", defn.description ?? "");
  }

  // Feats
  for (const feat of data.feats ?? []) {
    const defn = feat.definition ?? {};
    add(defn.name, "Feat", defn.description ?? "");
  }

  // Background feature
  const bgDef = data.background?.definition;
  if (bgDef?.name) {
    add(bgDef.name, "Background", bgDef.featureSnippet ?? bgDef.description ?? "");
  }

  return features.sort((a, b) => a.source.localeCompare(b.source) || a.name.localeCompare(b.name));
}

export function renderFeatureFiles(charName: string, features: Feature[], basePath: string): FeatureFile[] {
  return features.map(f => {
    const safeName = f.name.replace(/[\\/:*?"<>|]/g, "");
    const content = `---
name: "${f.name}"
source: "${f.source}"
character: "${charName}"
tags:
  - dnd/feature
  - dnd/${charName.toLowerCase().replace(/\s+/g, "-")}
---

# ${f.name}

**Source**: ${f.source}

${f.description}
`;
    return {
      path: `${basePath}/Features/${safeName}.md`,
      content,
    };
  });
}

export function renderFeaturesBase(charName: string, basePath: string): string {
  const folder = `${basePath}/Features`;
  return `filters:
  and:
    - file.inFolder("${folder}")
properties:
  source:
    displayName: Source
views:
  - type: table
    name: All Features
    order:
      - file.name
      - source
    sort:
      - property: source
        direction: ASC
      - property: file.name
        direction: ASC
  - type: table
    name: Class
    filters:
      and:
        - source != "Feat"
        - source != "Race"
        - source != "Background"
    order:
      - file.name
      - source
    sort:
      - property: source
        direction: ASC
  - type: table
    name: Racial
    filters:
      and:
        - source == "${charName}"
    order:
      - file.name
  - type: table
    name: Feats
    filters:
      and:
        - source == "Feat"
    order:
      - file.name
`;
}
