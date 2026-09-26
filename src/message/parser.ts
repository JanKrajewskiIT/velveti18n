import type { MessageNode, ParsedMessage } from './ast.js';

class MessageSyntaxError extends Error {}

interface SequenceResult {
  readonly nodes: MessageNode[];
  readonly closingTag?: {
    readonly name: string;
    readonly end: number;
    readonly literal: string;
  };
  readonly stoppedAtBrace: boolean;
}

const tagNamePattern = /^[A-Za-z_][\w-]*$/u;
const pluralSelectors = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
const dateStyles = new Set(['short', 'medium', 'long', 'full']);
const specialEscapes = new Set(['{', '}', '<', '>', '#']);

class MessageParser {
  private position = 0;
  private readonly source: string;
  private readonly rich: boolean;

  constructor(source: string, rich: boolean) {
    this.source = source;
    this.rich = rich;
  }

  parse(): ParsedMessage {
    const result = this.parseSequence({ pluralDepth: 0 });
    if (this.position !== this.source.length || result.closingTag) {
      throw new MessageSyntaxError('Unexpected closing syntax');
    }

    return { nodes: result.nodes };
  }

  private parseSequence(options: {
    readonly stopAtBrace?: boolean;
    readonly stopAtTagClose?: boolean;
    readonly pluralDepth: number;
  }): SequenceResult {
    const nodes: MessageNode[] = [];
    let text = '';

    const flushText = (): void => {
      if (text) {
        nodes.push({ type: 'text', value: text });
        text = '';
      }
    };

    while (this.position < this.source.length) {
      const character = this.source[this.position];

      if (character === "'") {
        const next = this.source[this.position + 1];
        if (next === "'") {
          text += "'";
          this.position += 2;
          continue;
        }

        if (next && specialEscapes.has(next)) {
          const closingQuote = this.source.indexOf("'", this.position + 2);
          if (closingQuote < 0) {
            throw new MessageSyntaxError('Unclosed escape span');
          }

          text += this.source.slice(this.position + 1, closingQuote);
          this.position = closingQuote + 1;
          continue;
        }

        text += character;
        this.position += 1;
        continue;
      }

      if (character === '}' && options.stopAtBrace) {
        flushText();
        return { nodes, stoppedAtBrace: true };
      }

      if (character === '}') {
        throw new MessageSyntaxError('Unexpected closing brace');
      }

      if (this.rich && character === '<') {
        const closingTag = this.readClosingTag();
        if (closingTag) {
          if (options.stopAtTagClose) {
            flushText();
            this.position = closingTag.end;
            return { nodes, closingTag, stoppedAtBrace: false };
          }

          text += closingTag.literal;
          this.position = closingTag.end;
          continue;
        }

        const openingTag = this.readOpeningTag();
        if (openingTag) {
          flushText();
          const openingPosition = this.position;
          this.position = openingTag.end;

          if (openingTag.selfClosing) {
            nodes.push({ type: 'tag', name: openingTag.name, children: [] });
            continue;
          }

          const children = this.parseSequence({
            pluralDepth: options.pluralDepth,
            stopAtTagClose: true,
          });

          if (children.closingTag?.name === openingTag.name) {
            nodes.push({
              type: 'tag',
              name: openingTag.name,
              children: children.nodes,
            });
            continue;
          }

          this.position = openingPosition + 1;
          text += '<';
          continue;
        }
      }

      if (character === '{') {
        flushText();
        nodes.push(this.parseArgument(options.pluralDepth));
        continue;
      }

      if (character === '#' && options.pluralDepth > 0) {
        flushText();
        nodes.push({ type: 'pound' });
        this.position += 1;
        continue;
      }

      text += character ?? '';
      this.position += 1;
    }

    flushText();
    if (options.stopAtBrace) {
      throw new MessageSyntaxError('Unclosed argument branch');
    }

    return { nodes, stoppedAtBrace: false };
  }

  private parseArgument(pluralDepth: number): MessageNode {
    this.position += 1;
    const name = this.readUntil([',', '}']).trim();
    if (!name) {
      throw new MessageSyntaxError('Argument name is empty');
    }

    if (this.source[this.position] === '}') {
      this.position += 1;
      return { type: 'argument', name, format: 'simple' };
    }

    this.position += 1;
    const format = this.readUntil([',', '}']).trim();
    if (format === 'plural' || format === 'select') {
      if (this.source[this.position] !== ',') {
        throw new MessageSyntaxError('Choice argument has no branches');
      }

      return this.parseChoice(name, format, pluralDepth);
    }

    if (format !== 'number' && format !== 'date' && format !== 'time') {
      throw new MessageSyntaxError(`Unsupported argument format: ${format}`);
    }

    let style: string | undefined;
    if (this.source[this.position] === ',') {
      this.position += 1;
      style = this.readUntil(['}']).trim();
      if (!style) {
        throw new MessageSyntaxError('Argument style is empty');
      }
    }

    if (this.source[this.position] !== '}') {
      throw new MessageSyntaxError('Unclosed argument');
    }
    this.position += 1;

    if (format === 'number' && style && !['percent', 'currency', 'integer'].includes(style)) {
      throw new MessageSyntaxError(`Unsupported number style: ${style}`);
    }
    if ((format === 'date' || format === 'time') && style && !dateStyles.has(style)) {
      throw new MessageSyntaxError(`Unsupported date/time style: ${style}`);
    }

    return { type: 'argument', name, format, style };
  }

  private parseChoice(name: string, mode: 'plural' | 'select', pluralDepth: number): MessageNode {
    this.position += 1;
    const branches = Object.create(null) as Record<string, readonly MessageNode[]>;

    while (this.position < this.source.length) {
      this.skipWhitespace();
      if (this.source[this.position] === '}') {
        this.position += 1;
        if (!Object.hasOwn(branches, 'other')) {
          throw new MessageSyntaxError('Choice argument requires an other branch');
        }
        return { type: 'choice', name, mode, branches };
      }

      const selector = this.readUntilWhitespaceOrBrace();
      if (!selector || this.source[this.position] !== '{') {
        throw new MessageSyntaxError('Malformed choice branch');
      }
      if (mode === 'plural' && !selector.startsWith('=') && !pluralSelectors.has(selector)) {
        throw new MessageSyntaxError(`Unsupported plural selector: ${selector}`);
      }
      if (mode === 'plural' && selector.startsWith('=') && !Number.isFinite(Number(selector.slice(1)))) {
        throw new MessageSyntaxError(`Malformed exact plural selector: ${selector}`);
      }

      this.position += 1;
      const branch = this.parseSequence({
        pluralDepth: mode === 'plural' ? pluralDepth + 1 : pluralDepth,
        stopAtBrace: true,
      });
      if (!branch.stoppedAtBrace) {
        throw new MessageSyntaxError('Unclosed choice branch');
      }
      this.position += 1;
      branches[selector] = branch.nodes;
    }

    throw new MessageSyntaxError('Unclosed choice argument');
  }

  private readUntil(delimiters: readonly string[]): string {
    const start = this.position;
    while (this.position < this.source.length && !delimiters.includes(this.source[this.position] ?? '')) {
      this.position += 1;
    }
    return this.source.slice(start, this.position);
  }

  private readUntilWhitespaceOrBrace(): string {
    const start = this.position;
    while (this.position < this.source.length && !/[\s{}]/u.test(this.source[this.position] ?? '')) {
      this.position += 1;
    }
    return this.source.slice(start, this.position);
  }

  private skipWhitespace(): void {
    while (/\s/u.test(this.source[this.position] ?? '')) {
      this.position += 1;
    }
  }

  private readOpeningTag(): { readonly name: string; readonly end: number; readonly selfClosing: boolean } | undefined {
    const match = /^<([A-Za-z_][\w-]*)(\s*\/?>)/u.exec(this.source.slice(this.position));
    const name = match?.[1];
    if (!match || !name || !tagNamePattern.test(name)) {
      return undefined;
    }

    return {
      name,
      end: this.position + match[0].length,
      selfClosing: (match[2] ?? '').includes('/'),
    };
  }

  private readClosingTag(): { readonly name: string; readonly end: number; readonly literal: string } | undefined {
    const match = /^<\/([A-Za-z_][\w-]*)\s*>/u.exec(this.source.slice(this.position));
    const name = match?.[1];
    if (!match || !name || !tagNamePattern.test(name)) {
      return undefined;
    }

    return {
      name,
      end: this.position + match[0].length,
      literal: match[0],
    };
  }
}

export const parseMessage = (template: string, rich = false): ParsedMessage =>
  new MessageParser(template, rich).parse();
