## Overview

A Lark (Feishu) cloud document add-on that provides regex find-and-replace within document text blocks. Runs as a floating topbar widget.

## Tech Stack

- React 19 + TypeScript, Vite 8
- Tailwind CSS v4 + shadcn/ui (base-ui)
- Lucide icons
- Lark SDK: `@lark-opdev/block-docs-addon-api`
- Formatter: oxfmt (double quotes, no semicolons)
- Package manager: bun

## Project Structure

```
app.json              # Lark widget config (topbar type)
plugins/              # Vite plugin for opdev dev/build integration
src/
  lib/                # Pure utilities (block traversal, regex)
  hooks/              # React hooks (Lark SDK, search/replace logic)
  components/         # UI components
  components/ui/      # shadcn/ui base components
```

## Design Principles

- Keep components fine-grained: each component should have a single responsibility and render only its own UI. Container components orchestrate state; leaf components render markup.

## Check Scripts

Run before committing:

```bash
bun run fmt        # format (oxfmt)
bun run lint       # eslint
bun run test       # unit tests (vitest)
bun run build      # type check + build
```

## Commit Convention

Commits follow [Conventional Commits](https://www.conventionalcommits.org/), single line, no body.

```
<type>: <short description>
```

Types: `feat`, `fix`, `test`, `refactor`, `style`, `chore`, `docs`
