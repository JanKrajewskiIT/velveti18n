import type {
  ArgumentNode,
  DateTimeNode,
  DateTimeStyle,
  MessageNode,
  MessageNodes,
  NumberNode,
  NumberStyle,
  PluralNode,
  PoundNode,
  SelectNode,
} from './ast';
import { MessageNodeBuilder } from './nodeBuilder';

export class MessageSyntaxError extends Error {
  readonly position: number;

  constructor(message: string, position: number) {
    super(message);
    this.name = 'MessageSyntaxError';
    this.position = position;
  }
}

interface ParseOptions {
  readonly richText: boolean;
}

interface SequenceContext {
  readonly inPlural: boolean;
  readonly insideBranch: boolean;
}

type PluralSelector =
  | { readonly kind: 'exact'; readonly value: string }
  | { readonly kind: 'category'; readonly category: Intl.LDMLPluralRule };

interface Branch<Selector> {
  readonly selector: Selector;
  readonly body: MessageNodes;
}

interface TagToken {
  readonly type: 'open' | 'close' | 'selfClosing';
  readonly name: string;
  readonly source: string;
}

const NUMBER_STYLES: readonly NumberStyle[] = ['percent', 'currency', 'integer'];
const DATE_TIME_STYLES: readonly DateTimeStyle[] = ['short', 'medium', 'long', 'full'];
const PLURAL_CATEGORIES: readonly Intl.LDMLPluralRule[] = ['zero', 'one', 'two', 'few', 'many', 'other'];

const NAME_PATTERN = /[^\s{},'<>#=]+/uy;
const TYPE_PATTERN = /[A-Za-z]+/uy;
const WHITESPACE_PATTERN = /\s*/uy;
const STYLE_PATTERN = /[^{}]*/uy;
const EXACT_SELECTOR_PATTERN = /=-?\d+(?:\.\d+)?/uy;
const TAG_PATTERN = /<(\/)?([A-Za-z_][\w-]*)\s*(\/)?>/uy;

const POUND_NODE: PoundNode = { kind: 'pound' };
const PLAIN_TEXT_STOPPERS = new Set(['{', '}', "'", '<', '#']);

const isQuotableCharacter = (character: string, inPlural: boolean): boolean =>
  character === '{' || character === '}' || character === '<' || character === '>' || (inPlural && character === '#');

class TemplateParser {
  readonly #source: string;
  readonly #richText: boolean;
  #position = 0;

  constructor(source: string, { richText }: ParseOptions) {
    this.#source = source;
    this.#richText = richText;
  }

  parse(): MessageNodes {
    return this.#parseSequence({ inPlural: false, insideBranch: false });
  }

  #parseSequence(context: SequenceContext): MessageNodes {
    const builder = new MessageNodeBuilder();

    while (this.#position < this.#source.length) {
      const character = this.#source.charAt(this.#position);
      if (character === '}') {
        if (context.insideBranch) {
          return builder.finish();
        }
        throw this.#error('Unexpected "}"');
      }
      this.#parseSegment(character, context, builder);
    }

    if (context.insideBranch) {
      throw this.#error('Unterminated branch: expected "}"');
    }
    return builder.finish();
  }

  #parseSegment(character: string, context: SequenceContext, builder: MessageNodeBuilder): void {
    switch (character) {
      case '{':
        builder.push(this.#parseArgument(context.inPlural));
        return;
      case "'":
        builder.pushText(this.#parseQuote(context.inPlural));
        return;
      case '<':
        this.#parseAngleBracket(builder);
        return;
      case '#':
        this.#position += 1;
        if (context.inPlural) {
          builder.push(POUND_NODE);
        } else {
          builder.pushText('#');
        }
        return;
      default:
        builder.pushText(this.#readPlainText());
    }
  }

  #readPlainText(): string {
    const start = this.#position;
    while (this.#position < this.#source.length && !PLAIN_TEXT_STOPPERS.has(this.#source.charAt(this.#position))) {
      this.#position += 1;
    }
    return this.#source.slice(start, this.#position);
  }

  #parseQuote(inPlural: boolean): string {
    const next = this.#source.charAt(this.#position + 1);
    if (next === "'") {
      this.#position += 2;
      return "'";
    }
    if (!isQuotableCharacter(next, inPlural)) {
      this.#position += 1;
      return "'";
    }

    this.#position += 1;
    let quoted = '';
    while (this.#position < this.#source.length) {
      const character = this.#source.charAt(this.#position);
      if (character !== "'") {
        quoted += character;
        this.#position += 1;
      } else if (this.#source.charAt(this.#position + 1) === "'") {
        quoted += "'";
        this.#position += 2;
      } else {
        this.#position += 1;
        return quoted;
      }
    }
    throw this.#error('Unterminated quoted text');
  }

  #parseAngleBracket(builder: MessageNodeBuilder): void {
    const tag = this.#richText ? this.#readTag() : undefined;
    if (tag === undefined) {
      this.#position += 1;
      builder.pushText('<');
      return;
    }

    switch (tag.type) {
      case 'open':
        builder.openTag(tag.name, tag.source);
        return;
      case 'close':
        builder.closeTag(tag.name, tag.source);
        return;
      case 'selfClosing':
        builder.selfClosingTag(tag.name);
    }
  }

  #readTag(): TagToken | undefined {
    TAG_PATTERN.lastIndex = this.#position;
    const match = TAG_PATTERN.exec(this.#source);
    const source = match?.[0];
    const name = match?.[2];
    if (source === undefined || name === undefined) {
      return undefined;
    }

    const closing = match?.[1] !== undefined;
    const selfClosing = match?.[3] !== undefined;
    if (closing && selfClosing) {
      return undefined;
    }

    this.#position += source.length;
    if (closing) {
      return { type: 'close', name, source };
    }
    return { type: selfClosing ? 'selfClosing' : 'open', name, source };
  }

  #parseArgument(inPlural: boolean): MessageNode {
    this.#position += 1;
    this.#skipWhitespace();
    const name = this.#match(NAME_PATTERN);
    if (name === undefined) {
      throw this.#error('Expected an argument name');
    }

    this.#skipWhitespace();
    if (this.#consume('}')) {
      return { kind: 'argument', name } satisfies ArgumentNode;
    }
    this.#expect(',');
    this.#skipWhitespace();

    const type = this.#match(TYPE_PATTERN);
    this.#skipWhitespace();
    switch (type) {
      case 'number':
        return { kind: 'number', name, style: this.#parseStyle(NUMBER_STYLES) } satisfies NumberNode;
      case 'date':
      case 'time':
        return { kind: type, name, style: this.#parseStyle(DATE_TIME_STYLES) } satisfies DateTimeNode;
      case 'plural':
        return this.#parsePlural(name);
      case 'select':
        return this.#parseSelect(name, inPlural);
      default:
        throw this.#error(`Unsupported argument type ${JSON.stringify(type)}`);
    }
  }

  #parseStyle<Style extends string>(allowedStyles: readonly Style[]): Style | undefined {
    if (this.#consume('}')) {
      return undefined;
    }

    this.#expect(',');
    const requested = (this.#match(STYLE_PATTERN) ?? '').trim();
    this.#expect('}');
    const style = allowedStyles.find((allowed) => allowed === requested);
    if (style === undefined) {
      throw this.#error(`Unsupported style ${JSON.stringify(requested)}`);
    }
    return style;
  }

  #parsePlural(name: string): PluralNode {
    this.#expect(',');
    const exactBranches = new Map<string, MessageNodes>();
    const categoryBranches = new Map<string, MessageNodes>();

    for (const { selector, body } of this.#parseBranches(() => this.#parsePluralSelector(), true)) {
      if (selector.kind === 'exact') {
        this.#addBranch(exactBranches, selector.value, body);
      } else {
        this.#addBranch(categoryBranches, selector.category, body);
      }
    }

    const otherBranch = this.#takeOtherBranch(categoryBranches, 'plural');
    return { kind: 'plural', name, exactBranches, categoryBranches, otherBranch };
  }

  #parseSelect(name: string, inPlural: boolean): SelectNode {
    this.#expect(',');
    const branches = new Map<string, MessageNodes>();

    for (const { selector, body } of this.#parseBranches(() => this.#parseSelectSelector(), inPlural)) {
      this.#addBranch(branches, selector, body);
    }

    const otherBranch = this.#takeOtherBranch(branches, 'select');
    return { kind: 'select', name, branches, otherBranch };
  }

  #parseBranches<Selector>(parseSelector: () => Selector, inPlural: boolean): Branch<Selector>[] {
    const branches: Branch<Selector>[] = [];

    for (;;) {
      this.#skipWhitespace();
      if (this.#consume('}')) {
        return branches;
      }

      const selector = parseSelector();
      this.#skipWhitespace();
      this.#expect('{');
      const body = this.#parseSequence({ inPlural, insideBranch: true });
      this.#expect('}');
      branches.push({ selector, body });
    }
  }

  #parsePluralSelector(): PluralSelector {
    const exact = this.#match(EXACT_SELECTOR_PATTERN);
    if (exact !== undefined) {
      return { kind: 'exact', value: exact.slice(1) };
    }

    const word = this.#match(NAME_PATTERN);
    const category = PLURAL_CATEGORIES.find((candidate) => candidate === word);
    if (category === undefined) {
      throw this.#error(`Unsupported plural selector ${JSON.stringify(word)}`);
    }
    return { kind: 'category', category };
  }

  #parseSelectSelector(): string {
    const selector = this.#match(NAME_PATTERN);
    if (selector === undefined) {
      throw this.#error('Expected a select branch selector');
    }
    return selector;
  }

  #addBranch<Key>(branches: Map<Key, MessageNodes>, key: Key, body: MessageNodes): void {
    if (branches.has(key)) {
      throw this.#error(`Duplicate branch ${JSON.stringify(key)}`);
    }
    branches.set(key, body);
  }

  #takeOtherBranch(branches: Map<string, MessageNodes>, argumentType: string): MessageNodes {
    const otherBranch = branches.get('other');
    if (otherBranch === undefined) {
      throw this.#error(`A ${argumentType} argument requires an "other" branch`);
    }
    branches.delete('other');
    return otherBranch;
  }

  #match(pattern: RegExp): string | undefined {
    pattern.lastIndex = this.#position;
    const matched = pattern.exec(this.#source)?.[0];
    if (matched !== undefined) {
      this.#position += matched.length;
    }
    return matched;
  }

  #skipWhitespace(): void {
    this.#match(WHITESPACE_PATTERN);
  }

  #consume(character: string): boolean {
    if (this.#source.charAt(this.#position) !== character) {
      return false;
    }
    this.#position += 1;
    return true;
  }

  #expect(character: string): void {
    if (!this.#consume(character)) {
      throw this.#error(`Expected ${JSON.stringify(character)}`);
    }
  }

  #error(message: string): MessageSyntaxError {
    return new MessageSyntaxError(message, this.#position);
  }
}

export const parseMessage = (source: string, options: ParseOptions): MessageNodes =>
  new TemplateParser(source, options).parse();
