import type { MessageNode } from './ast';

export class ParseError extends Error {}

const SPECIAL_CHARS = new Set(['{', '}', '<', '>', '#']);
const WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const TAG_NAME = /^[A-Za-z_][\w-]*/u;

class MessageParser {
  private pos = 0;
  private readonly source: string;
  private readonly rich: boolean;

  constructor(source: string, rich: boolean) {
    this.source = source;
    this.rich = rich;
  }

  parse(): MessageNode[] {
    return this.parseNodes({ stopAtBrace: false, stopAtTagClose: false, inPlural: false });
  }

  private parseNodes(opts: { stopAtBrace: boolean; stopAtTagClose: boolean; inPlural: boolean }): MessageNode[] {
    const nodes: MessageNode[] = [];
    let text = '';
    const flush = (): void => {
      if (text) {
        nodes.push({ type: 'text', value: text });
        text = '';
      }
    };

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      if (char === '}') {
        if (opts.stopAtBrace) break;
        throw new ParseError("Unexpected '}'");
      }

      if (char === "'") {
        text += this.readQuote();
        continue;
      }

      if (char === '{') {
        flush();
        nodes.push(this.parseArgument(opts.inPlural));
        continue;
      }

      if (char === '#' && opts.inPlural) {
        flush();
        nodes.push({ type: 'pound' });
        this.pos++;
        continue;
      }

      if (char === '<' && this.rich) {
        if (this.source[this.pos + 1] === '/') {
          if (opts.stopAtTagClose) break;
          text += '<';
          this.pos++;
          continue;
        }
        const start = this.pos;
        flush();
        const tag = this.parseTag(opts.inPlural);
        if (tag) {
          nodes.push(tag);
          continue;
        }
        this.pos = start + 1;
        text += '<';
        continue;
      }

      text += char ?? '';
      this.pos++;
    }

    flush();
    return nodes;
  }

  private readQuote(): string {
    this.pos++;
    const next = this.source[this.pos];
    if (next === "'") {
      this.pos++;
      return "'";
    }
    if (next !== undefined && SPECIAL_CHARS.has(next)) {
      let out = '';
      let closed = false;
      while (this.pos < this.source.length) {
        const char = this.source[this.pos];
        if (char === "'") {
          if (this.source[this.pos + 1] === "'") {
            out += "'";
            this.pos += 2;
            continue;
          }
          this.pos++;
          closed = true;
          break;
        }
        out += char ?? '';
        this.pos++;
      }
      if (!closed) throw new ParseError('Unterminated quote escape');
      return out;
    }
    return "'";
  }

  private parseArgument(inPlural: boolean): MessageNode {
    this.pos++;
    this.skipWhitespace();
    const name = this.readToken();
    if (!name) throw new ParseError('Missing argument name');
    this.skipWhitespace();

    const char = this.source[this.pos];
    if (char === '}') {
      this.pos++;
      return { type: 'arg', name };
    }
    if (char !== ',') throw new ParseError('Expected , or } in argument');
    this.pos++;
    this.skipWhitespace();
    const argType = this.readToken();
    this.skipWhitespace();

    switch (argType) {
      case 'number':
        return this.finishSimpleStyle((style) => ({ type: 'number', name, style }));
      case 'date':
        return this.finishSimpleStyle((style) => ({ type: 'date', name, kind: 'date', style }));
      case 'time':
        return this.finishSimpleStyle((style) => ({ type: 'date', name, kind: 'time', style }));
      case 'plural':
        return this.parsePlural(name, inPlural);
      case 'select':
        return this.parseSelect(name, inPlural);
      default:
        throw new ParseError(`Unsupported argument type: ${argType}`);
    }
  }

  private finishSimpleStyle(build: (style: string | undefined) => MessageNode): MessageNode {
    const char = this.source[this.pos];
    if (char === '}') {
      this.pos++;
      return build(undefined);
    }
    if (char !== ',') throw new ParseError('Expected , or } after argument type');
    this.pos++;
    this.skipWhitespace();
    let style = '';
    while (this.pos < this.source.length && this.source.charAt(this.pos) !== '}') {
      style += this.source.charAt(this.pos);
      this.pos++;
    }
    if (this.source[this.pos] !== '}') throw new ParseError('Unterminated argument');
    this.pos++;
    return build(style.trim() || undefined);
  }

  private parsePlural(name: string, inPlural: boolean): MessageNode {
    const exact = new Map<string, readonly MessageNode[]>();
    const categories = new Map<string, readonly MessageNode[]>();
    void inPlural;
    while (true) {
      this.skipWhitespace();
      const char = this.source[this.pos];
      if (char === '}') {
        this.pos++;
        break;
      }
      if (char === undefined) throw new ParseError('Unterminated plural');
      const selector = this.readSelector();
      const nodes = this.readBranchBody(true);
      if (selector.startsWith('=')) exact.set(selector.slice(1), nodes);
      else categories.set(selector, nodes);
    }
    if (!categories.has('other')) throw new ParseError('Plural missing other branch');
    return { type: 'plural', name, exact, categories };
  }

  private parseSelect(name: string, inPlural: boolean): MessageNode {
    const branches = new Map<string, readonly MessageNode[]>();
    while (true) {
      this.skipWhitespace();
      const char = this.source[this.pos];
      if (char === '}') {
        this.pos++;
        break;
      }
      if (char === undefined) throw new ParseError('Unterminated select');
      const selector = this.readSelector();
      const nodes = this.readBranchBody(inPlural);
      branches.set(selector, nodes);
    }
    if (!branches.has('other')) throw new ParseError('Select missing other branch');
    return { type: 'select', name, branches };
  }

  private readBranchBody(inPlural: boolean): readonly MessageNode[] {
    this.skipWhitespace();
    if (this.source[this.pos] !== '{') throw new ParseError('Expected { for branch body');
    this.pos++;
    const nodes = this.parseNodes({ stopAtBrace: true, stopAtTagClose: false, inPlural });
    if (this.source[this.pos] !== '}') throw new ParseError('Unterminated branch body');
    this.pos++;
    return nodes;
  }

  private parseTag(inPlural: boolean): MessageNode | null {
    this.pos++;
    const name = this.readTagName();
    if (!name) return null;
    this.skipWhitespace();

    if (this.source[this.pos] === '/') {
      if (this.source[this.pos + 1] === '>') {
        this.pos += 2;
        return { type: 'tag', name, children: [] };
      }
      return null;
    }

    if (this.source[this.pos] !== '>') return null;
    this.pos++;

    const children = this.parseNodes({ stopAtBrace: false, stopAtTagClose: true, inPlural });

    if (this.source[this.pos] !== '<' || this.source[this.pos + 1] !== '/') return null;
    this.pos += 2;
    this.skipWhitespace();
    const closeName = this.readTagName();
    this.skipWhitespace();
    if (closeName !== name || this.source[this.pos] !== '>') return null;
    this.pos++;
    return { type: 'tag', name, children };
  }

  private readSelector(): string {
    let out = '';
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (char === undefined || WHITESPACE.has(char) || char === '{') break;
      out += char;
      this.pos++;
    }
    if (!out) throw new ParseError('Missing branch selector');
    return out;
  }

  private readToken(): string {
    let out = '';
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (char === undefined || WHITESPACE.has(char) || char === ',' || char === '{' || char === '}') break;
      out += char;
      this.pos++;
    }
    return out;
  }

  private readTagName(): string {
    const match = TAG_NAME.exec(this.source.slice(this.pos));
    if (!match) return '';
    this.pos += match[0].length;
    return match[0];
  }

  private skipWhitespace(): void {
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      if (char === undefined || !WHITESPACE.has(char)) break;
      this.pos++;
    }
  }
}

export const parseMessage = (template: string, rich: boolean): MessageNode[] =>
  new MessageParser(template, rich).parse();
