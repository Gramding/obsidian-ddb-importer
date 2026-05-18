export function htmlToMarkdown(html: string): string {
  if (!html) return "";

  let md = html;

  // Tables — convert before stripping other tags
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows: string[][] = [];

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1] ?? "")) !== null) {
        const cellText = (cellMatch[1] ?? "")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&rsquo;/g, "'")
          .replace(/&ldquo;/g, '"')
          .replace(/&rdquo;/g, '"')
          .replace(/&mdash;/g, "—")
          .replace(/\r\n|\n/g, " ")
          .trim();
        cells.push(cellText);
      }
      if (cells.length > 0) rows.push(cells);
    }

    if (rows.length === 0) return "";

    const header = rows[0] ?? [];
    const separator = header.map(() => "---");
    const body = rows.slice(1);

    const headerRow = `| ${header.join(" | ")} |`;
    const separatorRow = `| ${separator.join(" | ")} |`;
    const bodyRows = body.map(r => `| ${r.join(" | ")} |`).join("\n");

    return `\n\n${headerRow}\n${separatorRow}\n${bodyRows}\n\n`;
  });

  // Headers
  md = md.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, (_, text) =>
    `\n\n### ${text.replace(/<[^>]+>/g, "").trim()}\n\n`
  );

  // Bold
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");

  // Italic
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");

  // Unordered lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
    const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) ?? [];
    return "\n" + items.map((li: string) =>
      `- ${li.replace(/<[^>]+>/g, "").trim()}`
    ).join("\n") + "\n";
  });

  // Ordered lists
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
    const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) ?? [];
    return "\n" + items.map((li: string, i: number) =>
      `${i + 1}. ${li.replace(/<[^>]+>/g, "").trim()}`
    ).join("\n") + "\n";
  });

  // Paragraphs and line breaks
  md = md.replace(/<\/p>/gi, "\n\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<p[^>]*>/gi, "");

  // Strip remaining tags
  md = md.replace(/<[^>]+>/g, "");

  // Decode remaining entities
  md = md
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#\d+;/g, "");

  // Clean up excessive blank lines
  md = md.replace(/\n{3,}/g, "\n\n").trim();

  return md;
}
