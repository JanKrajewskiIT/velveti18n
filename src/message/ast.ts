export type NumberStyle = 'percent' | 'currency' | 'integer';

export type DateTimeStyle = 'short' | 'medium' | 'long' | 'full';

export type MessageNodes = readonly MessageNode[];

export interface TextNode {
  readonly kind: 'text';
  readonly value: string;
}

export interface ArgumentNode {
  readonly kind: 'argument';
  readonly name: string;
}

export interface NumberNode {
  readonly kind: 'number';
  readonly name: string;
  readonly style: NumberStyle | undefined;
}

export interface DateTimeNode {
  readonly kind: 'date' | 'time';
  readonly name: string;
  readonly style: DateTimeStyle | undefined;
}

export interface PluralNode {
  readonly kind: 'plural';
  readonly name: string;
  readonly exactBranches: ReadonlyMap<string, MessageNodes>;
  readonly categoryBranches: ReadonlyMap<string, MessageNodes>;
  readonly otherBranch: MessageNodes;
}

export interface SelectNode {
  readonly kind: 'select';
  readonly name: string;
  readonly branches: ReadonlyMap<string, MessageNodes>;
  readonly otherBranch: MessageNodes;
}

export interface PoundNode {
  readonly kind: 'pound';
}

export interface TagNode {
  readonly kind: 'tag';
  readonly name: string;
  readonly children: MessageNodes;
}

export type MessageNode =
  TextNode | ArgumentNode | NumberNode | DateTimeNode | PluralNode | SelectNode | PoundNode | TagNode;
