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

A self-closing tag (`<tagName />`) invokes the handler with an empty children value (an empty string or empty fragment). When no handler is supplied for a self-closing tag, it MUST render as an empty string.

## Step 3 — RichNode intermediate representation

During compilation, rich-text templates are compiled to a tree of `RichNode` values:

```typescript
type RichNode = string | { readonly tag: string; readonly children: ReadonlyArray<RichNode> };
```

- Adjacent text segments MUST be concatenated into a single string node to minimize tree depth.
- The compiled tree is produced by the `compileRichMessage` function (analogous to `compileMessage` in [04-message-format](04-message-format.md) Step 9) and cached by template string.

## Step 4 — RichNode to JSX rendering

When `tx` renders a compiled rich-text message, it walks the `RichNode` tree and applies the caller-supplied handlers:

1. String nodes are emitted as literal text children.
2. Tag nodes look up the tag name in the supplied `RichMessageParams`. If a `TagHandler` is found, it is called with the recursively rendered children. If no handler is found, the children are rendered directly.

The output of `tx` is a `JSX.Element` (a SolidJS fragment wrapping the rendered nodes). The result MUST be suitable for direct use as JSX children.

## Step 5 — Interaction with plain placeholders

Rich-text templates MAY mix tag syntax and plain `{name}` placeholders in the same template:

```
"Click <link>{label}</link> or press {key}"
```

Plain placeholder parameters and tag handler parameters coexist in the same `RichMessageParams` record. The library MUST distinguish them by value type: a function value is treated as a `TagHandler`; all other value types are treated as plain `MessageParams` values and substituted as described in [04-message-format](04-message-format.md) Step 2.

## Step 6 — Compilation and caching

Rich-text templates are compiled and cached separately from plain-text templates:

- A separate module-level cache (distinct from the plain-text cache) is keyed by template string.
- The first call with a given template string parses and compiles it to a `CompiledRichMessage` function: `(params, locale) => ReadonlyArray<RichNode>`.
- Subsequent calls retrieve the compiled function from cache.
- Templates containing neither `{` nor `<` are returned as a single-element string array directly, without a compiled function entry.

The same error-handling rules from [04-message-format](04-message-format.md) Step 8 apply: parse errors emit a development-only warning and fall back to a passthrough result.
