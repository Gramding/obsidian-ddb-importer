export interface CharacterEntry {
  id: string;
  cobaltToken: string;
  folder: string;
  downloadPortrait: boolean; // ADD
}

export interface DdbSyncSettings {
  characters: CharacterEntry[];
}

export const DEFAULT_SETTINGS: DdbSyncSettings = {
  characters: [],
};
