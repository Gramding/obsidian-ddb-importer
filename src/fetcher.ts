export async function fetchCharacter(
  characterId: string,
  cobaltToken?: string
): Promise<any> {
  const url = `https://character-service.dndbeyond.com/character/v5/character/${characterId}`;

  const headers: Record<string, string> = {
    "Accept": "application/json",
  };

  // If the character is private, include the auth cookie
  if (cobaltToken) {
    headers["Cookie"] = `CobaltSession=${cobaltToken}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`DnD Beyond fetch failed: ${response.status}`);
  }

  const json = await response.json();
  return json.data; // the actual character object is nested under .data
}
