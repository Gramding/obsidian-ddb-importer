export interface CharacterEntry {
  id: string;
  cobaltToken: string;
}

export interface DdbSyncSettings {
  characters: CharacterEntry[];
}

export const DEFAULT_SETTINGS: DdbSyncSettings = {
  characters: [],
};
