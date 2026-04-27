/**
 * MessageFormat AST.
 *
 * Supported placeholder forms (a strict subset of ICU MessageFormat,
 * extended with XML-style tag pairs for rich-text translation):
 *
 *   {name}                                          – simple interpolation
 *   {value, number}                                 – locale-default number
 *   {value, number, currency|percent|integer}       – preset number style
 *   {value, date|time, short|medium|long|full}      – preset date/time
 *   {n, plural, one {# row} other {# rows}}         – cardinal plural
 *   {n, plural, =0 {none} other {#}}                – exact-match branches
 *   {g, select, male {he} female {she} other {they}}
 *   <tag>...</tag>                                  – rich-text tag pair
 *   <tag/>                                          – rich-text empty tag (placeholder)
 *
 * `#` inside a plural body resolves to the formatted plural number.
 * Branch and tag bodies are themselves messages, so all forms nest arbitrarily.
 *
 * To emit a literal `<` or `{`, escape with single-quotes (ICU convention):
 *   "It''s here", "'<not a tag>'", "5 '{' 6 '}'"
 * `''` is always a literal apostrophe.
 */

export interface LiteralNode {
  readonly type: 'literal';
  readonly value: string;
}

export interface ArgumentNode {
  readonly type: 'argument';
  readonly name: string;
}

export interface PoundNode {
  readonly type: 'pound';
}

export interface NumberFormatNode {
  readonly type: 'number';
  readonly name: string;
  readonly style?: string;
}

export interface DateFormatNode {
  readonly type: 'date' | 'time';
  readonly name: string;
  readonly style?: string;
}

export interface PluralNode {
  readonly type: 'plural';
  readonly name: string;
  readonly branches: ReadonlyArray<{ readonly key: string; readonly nodes: ReadonlyArray<MessageNode> }>;
}

export interface SelectNode {
  readonly type: 'select';
  readonly name: string;
  readonly branches: ReadonlyArray<{ readonly key: string; readonly nodes: ReadonlyArray<MessageNode> }>;
}

export interface TagNode {
  readonly type: 'tag';
  readonly name: string;
  readonly children: ReadonlyArray<MessageNode>;
}

export type MessageNode =
  | LiteralNode
  | ArgumentNode
  | PoundNode
  | NumberFormatNode
  | DateFormatNode
  | PluralNode
  | SelectNode
  | TagNode;

class Parser {
  private cursor = 0;
  private readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  parse(): ReadonlyArray<MessageNode> {
    return this.parseMessage(undefined);
  }

  /**
   * Parse a sequence of message nodes.
   *
   * `endTag`: when set, parsing stops at the matching `</endTag>`. When
   * undefined and `insideBranch` is false, parsing runs to end of source
   * and a stray `}` is treated as literal. When `insideBranch` is true
   * (i.e. inside a plural/select body delimited by `{...}`) parsing
   * stops at the next `}`.
   */
  private parseMessage(endTag: string | undefined, insideBranch = false): ReadonlyArray<MessageNode> {
    const nodes: MessageNode[] = [];
    let buffer = '';

    const flushLiteral = () => {
      if (buffer.length > 0) {
        nodes.push({ type: 'literal', value: buffer });
        buffer = '';
      }
    };

    while (this.cursor < this.source.length) {
      const char = this.source[this.cursor] ?? '';

      // ICU single-quote escape: `''` -> literal `'`; `'X'` -> literal X
      // where X is any run of chars until the next `'` (used to escape `{`, `}`, `<`).
      if (char === "'") {
        if (this.source[this.cursor + 1] === "'") {
          buffer += "'";
          this.cursor += 2;
          continue;
        }
        // Only quote when next char is a syntax char; otherwise treat as literal apostrophe.
        const next = this.source[this.cursor + 1];
        if (next === '{' || next === '}' || next === '<' || next === '#') {
          this.cursor += 1; // skip opening '
          while (this.cursor < this.source.length) {
            const c = this.source[this.cursor] ?? '';
            if (c === "'") {
              if (this.source[this.cursor + 1] === "'") {
                buffer += "'";
                this.cursor += 2;
                continue;
              }
              this.cursor += 1; // skip closing '
              break;
            }
            buffer += c;
            this.cursor += 1;
          }
          continue;
        }
        // Lone apostrophe.
        buffer += "'";
        this.cursor += 1;
        continue;
      }

      if (char === '}' && insideBranch) {
        break;
      }

      if (char === '#' && insideBranch) {
        flushLiteral();
        nodes.push({ type: 'pound' });
        this.cursor += 1;
        continue;
      }

      if (char === '{') {
        flushLiteral();
        nodes.push(this.parsePlaceholder());
        continue;
      }

      if (char === '<') {
        // Closing tag for the currently open tag context?
        if (endTag !== undefined && this.source.startsWith(`</${endTag}>`, this.cursor)) {
          break;
        }
        // Opening or other closing tag?
        const opened = this.tryParseOpenTag();
        if (opened) {
          flushLiteral();
          nodes.push(opened);
          continue;
        }
        // Treat as literal.
        buffer += char;
        this.cursor += 1;
        continue;
      }

      buffer += char;
      this.cursor += 1;
    }

    flushLiteral();
    return nodes;
  }

  /**
   * Try to parse `<tag>children</tag>` or self-closing `<tag/>` starting at
   * the current cursor. Returns null if it doesn't look like a tag (cursor
   * unchanged) — the caller falls back to literal `<`.
   */
  private tryParseOpenTag(): TagNode | null {
    const rest = this.source.slice(this.cursor);
    // Self-closing form first (greedier, so try it before the open form).
    const selfClose = /^<([A-Za-z_][\w-]*)\s*\/>/u.exec(rest);
    if (selfClose) {
      const name = selfClose[1] ?? '';
      this.cursor += selfClose[0].length;
      return { type: 'tag', name, children: [] };
    }
    const match = /^<([A-Za-z_][\w-]*)>/u.exec(rest);
    if (!match) return null;
    const name = match[1] ?? '';
    const startCursor = this.cursor;
    this.cursor += match[0].length;
    const children = this.parseMessage(name, false);
    if (!this.source.startsWith(`</${name}>`, this.cursor)) {
      // Unbalanced: rewind and treat opening `<tag>` as literal.
      this.cursor = startCursor;
      return null;
    }
    this.cursor += `</${name}>`.length;
    return { type: 'tag', name, children };
  }

  private parsePlaceholder(): MessageNode {
    this.expect('{');
    this.skipWhitespace();
    const name = this.readIdentifier();
    if (name.length === 0) {
      throw new SyntaxError(`Expected argument name at ${this.cursor} in "${this.source}"`);
    }
    this.skipWhitespace();

    if (this.peek() === '}') {
      this.cursor += 1;
      return { type: 'argument', name };
    }

    this.expect(',');
    this.skipWhitespace();
    const fmt = this.readIdentifier();
    this.skipWhitespace();

    if (fmt === 'plural' || fmt === 'select') {
      this.expect(',');
      this.skipWhitespace();
      const branches = this.parseBranches();
      this.skipWhitespace();
      this.expect('}');
      return { type: fmt, name, branches };
    }

    if (fmt === 'number') {
      let style: string | undefined;
      if (this.peek() === ',') {
        this.cursor += 1;
        this.skipWhitespace();
        style = this.readUntil(/[},]/u).trim();
      }
      this.skipWhitespace();
      this.expect('}');
      return { type: 'number', name, style };
    }

    if (fmt === 'date' || fmt === 'time') {
      let style: string | undefined;
      if (this.peek() === ',') {
        this.cursor += 1;
        this.skipWhitespace();
        style = this.readUntil(/[},]/u).trim();
      }
      this.skipWhitespace();
      this.expect('}');
      return { type: fmt, name, style };
    }

    throw new SyntaxError(`Unknown placeholder format "${fmt}" in "${this.source}"`);
  }

  private parseBranches(): ReadonlyArray<{ key: string; nodes: ReadonlyArray<MessageNode> }> {
    const branches: Array<{ key: string; nodes: ReadonlyArray<MessageNode> }> = [];
    while (this.peek() !== '}' && this.cursor < this.source.length) {
      this.skipWhitespace();
      const key = this.readBranchKey();
      this.skipWhitespace();
      this.expect('{');
      const nodes = this.parseMessage(undefined, true);
      this.expect('}');
      branches.push({ key, nodes });
      this.skipWhitespace();
    }
    return branches;
  }

  private readBranchKey(): string {
    const match = /^(=-?\d+|[A-Za-z_][\w-]*)/u.exec(this.source.slice(this.cursor));
    if (!match) throw new SyntaxError(`Expected branch key at ${this.cursor} in "${this.source}"`);
    this.cursor += match[0].length;
    return match[0];
  }

  private readIdentifier(): string {
    const match = /^[A-Za-z_][\w-]*/u.exec(this.source.slice(this.cursor));
    if (!match) return '';
    this.cursor += match[0].length;
    return match[0];
  }

  private readUntil(stop: RegExp): string {
    const start = this.cursor;
    while (this.cursor < this.source.length && !stop.test(this.source[this.cursor] ?? '')) {
      this.cursor += 1;
    }
    return this.source.slice(start, this.cursor);
  }

  private skipWhitespace(): void {
    while (this.cursor < this.source.length && /\s/u.test(this.source[this.cursor] ?? '')) {
      this.cursor += 1;
    }
  }

  private peek(): string | undefined {
    return this.source[this.cursor];
  }

  private expect(char: string): void {
    if (this.source[this.cursor] !== char) {
      throw new SyntaxError(`Expected "${char}" at ${this.cursor} in "${this.source}"`);
    }
    this.cursor += 1;
  }
}

/**
 * Parse a MessageFormat template into an immutable AST.
 *
 * Throws `SyntaxError` on malformed input. Plain strings without
 * placeholders are valid messages and produce a single literal node.
 */
export function parseMessage(template: string): ReadonlyArray<MessageNode> {
  return new Parser(template).parse();
}
