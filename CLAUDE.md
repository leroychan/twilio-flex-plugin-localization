# CLAUDE.md

Guidance for AI agents working in this repository.

## What this project is

A **Twilio Flex plugin** (TypeScript) that adds custom UI localization for **Flex UI 2.17.1**. It ships all **1,610** Flex UI strings translated into **12 languages** and registers them in the Flex language selector.

The actual plugin lives in the **`plugin-localization/`** subdirectory — not the repo root. Run all `npm`/`twilio`/`tsc` commands from inside `plugin-localization/`.

- Git remote: `github.com/leroychan/twilio-flex-plugin-localization`
- Active Twilio CLI profile: `leroy-flex` (required for build/deploy; set with `twilio profiles:use leroy-flex`).

## Layout

```
plugin-localization/
  src/
    index.ts               # FlexPlugin.loadPlugin(LocalizationPlugin)
    LocalizationPlugin.tsx  # init() — registers locales + merges strings + sets RTL
    strings.ts              # locale registry (imports, LOCALE_STRINGS, customAvailableLocales, RTL_LOCALES, helpers)
    locales/<tag>.json      # 12 files, each { name, tag, strings } with 1,610 keys
```

## Key commands (run inside `plugin-localization/`)

| Task            | Command                                                |
| --------------- | ------------------------------------------------------ |
| Install         | `npm install`                                          |
| Typecheck       | `npx tsc --noEmit -p tsconfig.json`                    |
| Run dev server  | `twilio flex:plugins:start` (serves http://localhost:3000) |
| Production build| `twilio flex:plugins:build`                            |
| Deploy          | `twilio flex:plugins:deploy --changelog "…"`           |

After editing localization code, verify with **both** `tsc --noEmit` and `twilio flex:plugins:build`. Typecheck alone does not catch bundler/runtime problems (see the chunk gotcha below). Delete the `build/` directory after verifying — it is git-ignored and regenerated.

## Non-obvious rules — READ BEFORE EDITING

These were discovered the hard way. Violating them produces bugs that typecheck fine but break at runtime.

### 1. Locale JSON MUST be imported statically, never with dynamic `import()`
Flex serves a plugin as a **single JS bundle** and cannot serve extra webpack chunks. A dynamic `import('./locales/x.json')` code-splits into `2.plugin-localization.js`, which Flex 404s at runtime → the HTML fallback is returned → `Uncaught SyntaxError: Unexpected token '<'` / `Loading chunk 2 failed`.
→ Always use top-of-file `import xLocale from './locales/x.json';`. Confirm a build produces exactly **one** `plugin-localization.js` with no numbered chunks.

### 2. Register locales by MUTATING `availableLocales` in place — do not reassign
`manager.localization` is a getter that returns a **new object every call**; its `availableLocales` is a reference to Flex's internal shared array. `localization.availableLocales = [...]` writes to a throwaway object and is silently lost — the selector will still show only the account/default locales.
→ Use `manager.localization.availableLocales.push(...)` (de-dupe by tag). See `LocalizationPlugin.setupLocalization()`.

### 3. `manager.strings` assignment needs a cast
`manager.strings = { ...manager.strings, ...custom }` widens Flex's dynamic `tr_activity_*` index signature to `string | undefined`. Assert `as Flex.Strings`. Setting `manager.strings` **adds/updates** — it does not replace the whole dictionary.

### 4. `@types/node` is pinned to `^20`
TypeScript 4.9 (this project's version) **cannot parse** `@types/node` 26's syntax; a transitive install of v26 causes hundreds of spurious `tsc` errors in `ffi.d.ts`. Keep `@types/node` at `^20`. If you see parse errors in `node_modules/@types/node`, check its version first — it is not your code.

### 5. `Config.language` in appConfig does nothing
The Flex `Config.language` field is annotated "not used". Do not rely on it to set a default locale. Locale resolves as: user preference → account default → browser → `en-US`.

### 6. `twilio flex:plugins:start` needs a real TTY
It renders an interactive Ink UI. When launched backgrounded / without a pseudo-TTY it renders once and exits. Ask the user to run it in a real terminal (e.g. `! twilio flex:plugins:start` in this session) rather than trying to background it.

## Working with locale files

- **Never change keys**, only values. All 12 files must have the identical 1,610-key set as the source `en-US`.
- Every translated value must preserve, byte-for-byte:
  - **Handlebars placeholders** including conditionals: `{{name}}`, `{{count}}`, `{{#if isPlural}}s{{/if}}`, `{{#if isSingleMetric}}is{{else}}are{{/if}}`.
  - **HTML tags/attributes**: `<span class='typer-name'>…</span>`, `<b>`, `<br/>`, `<a href="…">`.
  - Leading/trailing whitespace, ellipses (`…`), brand names, URLs, emails.
- **Pluralization gotcha:** languages without English-style number inflection (zh, ja, ko, th, vi, yue, hi) naturally drop `{{#if isPlural}}s{{/if}}`. That breaks placeholder-set equality. Fix by keeping the block as an empty no-op — `{{#if isPlural}}{{/if}}` — so the token multiset still matches the source while rendering to nothing.

### Validation snippet
A locale file is valid iff, for every key, its placeholder multiset **and** HTML-tag multiset equal the English source's, with no missing/extra keys:

```python
import json, re
from collections import Counter
en = json.load(open("Twilio Flex 2.17.0 en-US.json"))["strings"]
ph, tag = re.compile(r"{{.*?}}"), re.compile(r"</?[a-zA-Z][^>]*>")
def check(path):
    s = json.load(open(path))["strings"]
    assert set(s) == set(en), "key set differs"
    for k in en:
        assert Counter(ph.findall(en[k]))  == Counter(ph.findall(s[k])),  f"placeholder mismatch: {k}"
        assert Counter(tag.findall(en[k])) == Counter(tag.findall(s[k])), f"tag mismatch: {k}"
```

### Bulk-translating (how the 12 locales were produced)
For large translation jobs, fan out subagents (one per language×chunk of ~322 keys). **Critical:** instruct each subagent to write output as multiple small part-files (≤40 keys each), NOT to echo JSON in its final message — otherwise it hits the 8192-token output cap and dies. Merge part-files, then run the validation snippet, then repair any placeholder/tag mismatches before wiring the file into `strings.ts`.

## Adding a language (checklist)

1. Add `src/locales/<tag>.json` (1,610 keys, passes validation above).
2. In `src/strings.ts`: static import + entry in `LOCALE_STRINGS` + entry in `customAvailableLocales` (+ `RTL_LOCALES` if right-to-left).
3. `npx tsc --noEmit` then `twilio flex:plugins:build`; confirm a single bundle.

## Scaling caveat

The single-bundle constraint means bundle size grows ~1,610 strings per language (already ~2.2 MB at 12 locales). For many more languages, the Flex-native alternative is hosting locale JSONs externally and setting Flex's `localesUrl` — not bundling. Flag this to the user rather than silently shipping an ever-larger bundle.
