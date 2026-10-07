import type { MessageNode, MessageNodes } from './ast';

interface RootFrame {
  readonly children: MessageNode[];
}

interface TagFrame extends RootFrame {
  readonly name: string;
  readonly source: string;
  readonly parent: Frame;
}

type Frame = RootFrame | TagFrame;

const isTagFrame = (frame: Frame): frame is TagFrame => 'name' in frame;

export class MessageNodeBuilder {
  readonly #root: RootFrame = { children: [] };
  #current: Frame = this.#root;

  push(node: MessageNode): void {
    this.#current.children.push(node);
  }

  pushText(value: string): void {
    this.push({ kind: 'text', value });
  }

  openTag(name: string, source: string): void {
    this.#current = { children: [], name, source, parent: this.#current };
  }

  selfClosingTag(name: string): void {
    this.push({ kind: 'tag', name, children: [] });
  }

  closeTag(name: string, source: string): void {
    const frame = this.#findOpenTag(name);
    if (frame === undefined) {
      this.pushText(source);
      return;
    }

    while (this.#current !== frame) {
      this.#dissolveCurrent();
    }
    frame.parent.children.push({ kind: 'tag', name, children: frame.children });
    this.#current = frame.parent;
  }

  finish(): MessageNodes {
    while (isTagFrame(this.#current)) {
      this.#dissolveCurrent();
    }
    return this.#root.children;
  }

  #findOpenTag(name: string): TagFrame | undefined {
    let frame: Frame = this.#current;
    while (isTagFrame(frame)) {
      if (frame.name === name) {
        return frame;
      }
      frame = frame.parent;
    }
    return undefined;
  }

  #dissolveCurrent(): void {
    const frame = this.#current;
    if (isTagFrame(frame)) {
      frame.parent.children.push({ kind: 'text', value: frame.source }, ...frame.children);
      this.#current = frame.parent;
    }
  }
}
