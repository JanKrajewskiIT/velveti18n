export interface TextNode {
  readonly type: 'text';
  readonly value: string;
}

export interface ArgNode {
  readonly type: 'arg';
  readonly name: string;
}

export interface NumberNode {
  readonly type: 'number';
  readonly name: string;
  readonly style?: string;
}

export interface DateNode {
  readonly type: 'date';
  readonly name: string;
  readonly kind: 'date' | 'time';
  readonly style?: string;
}

export interface PluralNode {
  readonly type: 'plural';
  readonly name: string;
  readonly exact: ReadonlyMap<string, readonly MessageNode[]>;
  readonly categories: ReadonlyMap<string, readonly MessageNode[]>;
}

export interface SelectNode {
  readonly type: 'select';
  readonly name: string;
  readonly branches: ReadonlyMap<string, readonly MessageNode[]>;
}

export interface PoundNode {
  readonly type: 'pound';
}

export interface TagNode {
  readonly type: 'tag';
  readonly name: string;
  readonly children: readonly MessageNode[];
}

export type MessageNode = TextNode | ArgNode | NumberNode | DateNode | PluralNode | SelectNode | PoundNode | TagNode;

export type RichNode = string | { readonly tag: string; readonly children: readonly RichNode[] };
