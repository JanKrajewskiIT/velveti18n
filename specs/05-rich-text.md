# Spec 05 — Rich Text

## Step 1 — XML-style tag syntax

Rich-text templates extend the message format syntax ([04-message-format](04-message-format.md)) with XML-style tag pairs:

```
<tagName>children</tagName>
```

And self-closing tags:

```
<tagName />
```

Tag names MUST match the pattern `[A-Za-z_][\w-]*`. Tags are case-sensitive. Tags MUST be balanced (every open tag has a matching close tag). A tag whose close tag is missing or mismatched MUST be treated as a literal `<` at the position of the unmatched open tag, and the parser cursor MUST be reset to resume parsing after the `<` character.

Tags MAY be nested:

```
<outer>Some <inner>nested</inner> text</outer>
```

Tag children MAY contain any supported template syntax recursively (simple placeholders, plural, select, and further nested tags).

Rich-text templates MUST be used exclusively with the `tx` translation function. Passing a rich-text template to `t` or `ts` MUST result in the tag markup being emitted as a literal string in the output, since those functions return `string`, not `JSX.Element`.

## Step 2 — TagHandler contract

A tag handler is a function the caller supplies when invoking `tx`:

```typescript
type TagHandler = (children: JSX.Element) => JSX.Element;
```

The `children` argument is the already-rendered subtree of the tag's children (a `JSX.Element` value). The handler MUST return a `JSX.Element` that wraps or transforms those children.

Tag handlers are keyed by tag name. The caller supplies a `RichMessageParams` record where tag-name keys map to `TagHandler` values and all other keys map to plain `MessageParams` values:

```typescript
tx("some.key", {
  link: (children) => <a href="/path">{children}</a>,
  count: 5,
})
```

If a tag appears in the template but no handler is supplied for its name, the library MUST render the tag's children directly, without a wrapper, as if the tag were transparent.

A self-closing tag (`<tagName />`) invokes the handler with empty children. When no handler is supplied for a self-closing tag, it MUST render no content.

## Step 3 — Rich-text output semantics

Implementations may use any internal representation that preserves tag boundaries and text order. Conceptually, the message consists of text segments and nested tag nodes:

```typescript
type RichNode = string | { readonly tag: string; readonly children: ReadonlyArray<RichNode> };
```

This type is an explanatory model only; it is not a required internal or exported type.

- Adjacent text segments MUST render in their original order and MUST NOT introduce visible separators.

## Step 4 — Tag rendering to JSX

When `tx` renders a rich-text message, it preserves text order and tag nesting while applying the caller-supplied handlers:

1. String nodes are emitted as literal text children.
2. Tag nodes look up the tag name in the supplied `RichMessageParams`. If a `TagHandler` is found, it is called with the recursively rendered children. If no handler is found, the children are rendered directly.

The output of `tx` is a `JSX.Element` (a SolidJS fragment wrapping the rendered nodes). The result MUST be suitable for direct use as JSX children.

## Step 5 — Interaction with plain placeholders

Rich-text templates MAY mix tag syntax and plain `{name}` placeholders in the same template:

```
"Click <link>{label}</link> or press {key}"
```

Plain placeholder parameters and tag handler parameters coexist in the same `RichMessageParams` record. The library MUST distinguish them by value type: a function value is treated as a `TagHandler`; all other value types are treated as plain `MessageParams` values and substituted as described in [04-message-format](04-message-format.md) Step 2.

## Step 6 — Parsing and error handling

Rich-text templates are parsed when a translation call requires them. Implementations MAY cache parse results; cache scope, eviction, and compiled-function identity are not public contracts. Templates containing neither `{` nor `<` render as plain text.

The same error-handling rules from [04-message-format](04-message-format.md) Step 8 apply: parse errors MAY emit a development-only warning and MUST fall back to a passthrough result. An unmatched or mismatched opening tag is treated as a literal `<` and parsing resumes immediately after that character; it does not by itself make the whole template a parse error.
