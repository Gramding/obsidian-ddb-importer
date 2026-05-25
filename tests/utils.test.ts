import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "../src/utils";

describe("htmlToMarkdown", () => {
  it("returns empty string for empty input", () => {
    expect(htmlToMarkdown("")).toBe("");
  });

  it("converts <strong> and <b> to **text**", () => {
    expect(htmlToMarkdown("<strong>bold</strong>")).toBe("**bold**");
    expect(htmlToMarkdown("<b>also bold</b>")).toBe("**also bold**");
  });

  it("converts <em> and <i> to *text*", () => {
    expect(htmlToMarkdown("<em>italic</em>")).toBe("*italic*");
    expect(htmlToMarkdown("<i>slant</i>")).toBe("*slant*");
  });

  it("converts all heading levels to ###", () => {
    expect(htmlToMarkdown("<h1>Title</h1>")).toContain("### Title");
    expect(htmlToMarkdown("<h2>Sub</h2>")).toContain("### Sub");
    expect(htmlToMarkdown("<h6>Small</h6>")).toContain("### Small");
  });

  it("converts <ul> items to - bullets", () => {
    const result = htmlToMarkdown("<ul><li>Apple</li><li>Banana</li></ul>");
    expect(result).toContain("- Apple");
    expect(result).toContain("- Banana");
  });

  it("converts <ol> items to numbered list", () => {
    const result = htmlToMarkdown("<ol><li>First</li><li>Second</li></ol>");
    expect(result).toContain("1. First");
    expect(result).toContain("2. Second");
  });

  it("converts </p> to double newline and separates paragraphs", () => {
    const result = htmlToMarkdown("<p>A</p><p>B</p>");
    expect(result).toContain("A");
    expect(result).toContain("B");
    expect(result.indexOf("A")).toBeLessThan(result.indexOf("B"));
  });

  it("converts <br> to newline", () => {
    const result = htmlToMarkdown("Line1<br>Line2");
    expect(result).toContain("Line1\nLine2");
  });

  it("decodes named HTML entities", () => {
    expect(htmlToMarkdown("&amp;")).toBe("&");
    expect(htmlToMarkdown("&lt;")).toBe("<");
    expect(htmlToMarkdown("&gt;")).toBe(">");
    expect(htmlToMarkdown("a&nbsp;b")).toBe("a b");  // trimmed as standalone; test in context
    expect(htmlToMarkdown("&mdash;")).toBe("—");
    expect(htmlToMarkdown("&ndash;")).toBe("–");
    expect(htmlToMarkdown("&rsquo;")).toBe("'");
    expect(htmlToMarkdown("&lsquo;")).toBe("'");
    expect(htmlToMarkdown("&ldquo;")).toBe('"');
    expect(htmlToMarkdown("&rdquo;")).toBe('"');
  });

  it("strips numeric HTML entities (&#NNN;)", () => {
    expect(htmlToMarkdown("&#65;text")).toBe("text");
    expect(htmlToMarkdown("hello&#8203;world")).toBe("helloworld");
  });

  it("strips unknown HTML tags, keeping inner text", () => {
    expect(htmlToMarkdown("<span class='x'>text</span>")).toBe("text");
    expect(htmlToMarkdown("<div>content</div>")).toBe("content");
  });

  it("handles nested bold inside paragraph", () => {
    const result = htmlToMarkdown("<p>You gain <strong>advantage</strong> on rolls.</p>");
    expect(result).toContain("**advantage**");
    expect(result).toContain("You gain");
  });

  it("converts table to markdown format with header, separator, body", () => {
    const html = `<table>
      <tr><th>Level</th><th>Slots</th></tr>
      <tr><td>1st</td><td>2</td></tr>
      <tr><td>2nd</td><td>3</td></tr>
    </table>`;
    const result = htmlToMarkdown(html);
    expect(result).toContain("| Level | Slots |");
    expect(result).toContain("| --- | --- |");
    expect(result).toContain("| 1st | 2 |");
    expect(result).toContain("| 2nd | 3 |");
  });

  it("empty table returns empty string", () => {
    expect(htmlToMarkdown("<table></table>").trim()).toBe("");
  });

  it("table header-only (no body rows) still produces header and separator", () => {
    const html = "<table><tr><th>Name</th><th>Val</th></tr></table>";
    const result = htmlToMarkdown(html);
    expect(result).toContain("| Name | Val |");
    expect(result).toContain("| --- | --- |");
  });

  it("normalizes excessive blank lines to at most two newlines", () => {
    const result = htmlToMarkdown("<p>A</p><p>B</p><p>C</p>");
    expect(result).not.toMatch(/\n{3,}/);
  });
});
