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

      if (char === "'") {
        if (this.source[this.cursor + 1] === "'") {
          buffer += "'";
          this.cursor += 2;
          continue;
        }
        const next = this.source[this.cursor + 1];
        if (next === '{' || next === '}' || next === '<' || next === '#') {
          this.cursor += 1;
          while (this.cursor < this.source.length) {
            const current = this.source[this.cursor] ?? '';
            if (current === "'") {
              if (this.source[this.cursor + 1] === "'") {
                buffer += "'";
                this.cursor += 2;
                continue;
              }
              this.cursor += 1;
              break;
            }
            buffer += current;
            this.cursor += 1;
          }
          continue;
        }
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
        if (endTag !== undefined && this.source.startsWith(`</${endTag}>`, this.cursor)) {
          break;
        }
        const opened = this.tryParseOpenTag();
        if (opened) {
          flushLiteral();
          nodes.push(opened);
          continue;
        }
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

  private tryParseOpenTag(): TagNode | null {
    const rest = this.source.slice(this.cursor);
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
    const format = this.readIdentifier();
    this.skipWhitespace();

    if (format === 'plural' || format === 'select') {
      this.expect(',');
      this.skipWhitespace();
      const branches = this.parseBranches();
      this.skipWhitespace();
      this.expect('}');
      return { type: format, name, branches };
    }

    if (format === 'number') {
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

    if (format === 'date' || format === 'time') {
      let style: string | undefined;
      if (this.peek() === ',') {
        this.cursor += 1;
        this.skipWhitespace();
        style = this.readUntil(/[},]/u).trim();
      }
      this.skipWhitespace();
      this.expect('}');
      return { type: format, name, style };
    }

    throw new SyntaxError(`Unknown placeholder format "${format}" in "${this.source}"`);
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

export function parseMessage(template: string): ReadonlyArray<MessageNode> {
  return new Parser(template).parse();
}
