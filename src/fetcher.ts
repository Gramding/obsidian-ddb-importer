import { requestUrl } from "obsidian";

export async function fetchCharacter(
  characterId: string,
  cobaltToken?: string
): Promise<any> {
  const url = `https://character-service.dndbeyond.com/character/v5/character/${characterId}`;

  const headers: Record<string, string> = {
    "Accept": "application/json",
  };

  if (cobaltToken) {
    headers["Cookie"] = `CobaltSession=${cobaltToken}`;
  }

  const response = await requestUrl({ url, headers });

  if (response.status !== 200) {
    throw new Error(`DnD Beyond fetch failed: ${response.status}`);
  }

  return response.json.data;
}
