# Regex Replacer for Lark Docs

> A regex-powered find-and-replace tool for Lark (Feishu) cloud documents.

Lark's built-in find-and-replace doesn't support regular expressions. **Regex Replacer** is a lightweight floating widget that brings code-editor-grade search to your documents.

## Features

- **Regex search** — full JavaScript regex syntax, with plain text fallback
- **Live highlighting** — matches highlighted in-document, current match in red, others in yellow
- **Replace one or all** — step through matches or batch replace
- **Capture groups** — `$1`, `$&` and other substitution patterns
- **Case / whole word** — flexible search options
- **Live sync** — results refresh automatically on document changes

## Permissions

| Scope                    | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `docx:document:readonly` | Read document content (search, highlight) |
| `docx:document`          | Edit document content (replace)           |

## Development

```bash
bun install          # install dependencies
bun dev              # start dev server
bun run build        # build
opdev upload ./dist  # upload to Lark
```
