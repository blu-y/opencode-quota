/**
 * JSONC (JSON with Comments) parsing utilities.
 *
 * Provides comment stripping for JSON files that contain single-line
 * and multi-line comment syntax.
 */

/**
 * Strip JSONC comments from a string.
 *
 * Handles:
 * - Single-line comments (starting with //)
 * - Multi-line comments (enclosed in slash-star pairs)
 * - Preserves comment-like sequences inside strings
 */
export function stripJsonComments(content: string): string {
  let result = "";
  let i = 0;
  let inString = false;
  let stringChar = "";

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    // Handle string boundaries
    if ((char === '"' || char === "'") && (i === 0 || content[i - 1] !== "\\")) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      result += char;
      i++;
      continue;
    }

    // Skip comments only when not in a string
    if (!inString) {
      // Single-line comment
      if (char === "/" && nextChar === "/") {
        // Skip until end of line
        while (i < content.length && content[i] !== "\n") {
          i++;
        }
        continue;
      }

      // Multi-line comment
      if (char === "/" && nextChar === "*") {
        i += 2;
        while (i < content.length - 1 && !(content[i] === "*" && content[i + 1] === "/")) {
          i++;
        }
        i += 2; // Skip closing delimiter
        continue;
      }
    }

    result += char;
    i++;
  }

  return result;
}

/**
 * Parse JSON or JSONC content.
 *
 * @param content - The file content to parse
 * @param isJsonc - If true, strip comments before parsing
 * @returns Parsed JSON value
 * @throws SyntaxError if the content is not valid JSON
 */
export function parseJsonOrJsonc(content: string, isJsonc: boolean): unknown {
  const toParse = isJsonc ? stripJsonComments(content) : content;
  return JSON.parse(toParse);
}
