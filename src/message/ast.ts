export type MessageNode =
  | { readonly type: 'text'; readonly value: string }
  | { readonly type: 'pound' }
  | {
      readonly type: 'argument';
      readonly name: string;
      readonly format: 'simple' | 'number' | 'date' | 'time';
      readonly style?: string;
    }
  | {
      readonly type: 'choice';
      readonly name: string;
      readonly mode: 'plural' | 'select';
      readonly branches: Readonly<Record<string, readonly MessageNode[]>>;
    }
  | {
      readonly type: 'tag';
      readonly name: string;
      readonly children: readonly MessageNode[];
    };

export interface ParsedMessage {
  readonly nodes: readonly MessageNode[];
}
