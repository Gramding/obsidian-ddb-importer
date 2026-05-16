export interface DdbSyncSettings {
  characterId: string;
  targetNotePath: string;   // e.g. "DnD/My Character.md"
  cobaltToken: string;      // optional: DnDB auth token for private chars
}

export const DEFAULT_SETTINGS: DdbSyncSettings = {
  characterId: "160003787",
  targetNotePath: "DnD/Character Sheet.md",
  cobaltToken: "eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..vbVD_jU6MrS93Hsf2gJYAg.RY6WRGYkf_qVc5HWj5kgLd6cIqObyf74tgURgfTVgg2DiSD02LFVybSYlNYH8Mem.TTwq5heUcUAqblYMTfeKEQ",
};
