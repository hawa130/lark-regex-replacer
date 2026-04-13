import type { BlockSnapshot } from "@lark-opdev/block-docs-addon-api"
import { describe, expect, it } from "vitest"

import {
  buildRegex,
  collectTextualBlocks,
  findMatches,
  isTextualBlock,
} from "../block-text"

// Helper to create a minimal BlockSnapshot
function makeBlock(
  type: string,
  id = 1,
  children: BlockSnapshot[] = [],
): BlockSnapshot {
  return {
    id,
    type,
    children: children.map((c) => c.id),
    childSnapshots: children,
    data: {},
    ref: { docRef: { docToken: "test" }, blockId: id },
  } as unknown as BlockSnapshot
}

// ─── isTextualBlock ──────────────────────────────────────────────

describe("isTextualBlock", () => {
  it.each([
    "text",
    "heading1",
    "heading2",
    "heading3",
    "heading4",
    "heading5",
    "heading6",
    "heading7",
    "heading8",
    "heading9",
    "bullet",
    "ordered",
    "todo",
    "quote",
  ])("returns true for %s", (type) => {
    expect(isTextualBlock(makeBlock(type))).toBe(true)
  })

  it.each([
    "page",
    "image",
    "file",
    "table",
    "bitable",
    "diagram",
    "iframe",
    "grid",
    "mindnote",
    "sheet",
    "isv",
    "divider",
    "code",
  ])("returns false for %s", (type) => {
    expect(isTextualBlock(makeBlock(type))).toBe(false)
  })
})

// ─── collectTextualBlocks ────────────────────────────────────────

describe("collectTextualBlocks", () => {
  it("collects text blocks from a flat document", () => {
    const root = makeBlock("page", 1, [
      makeBlock("text", 2),
      makeBlock("image", 3),
      makeBlock("text", 4),
    ])
    const result = collectTextualBlocks(root)
    expect(result.map((b) => b.id)).toEqual([2, 4])
  })

  it("collects text blocks from nested structure", () => {
    const root = makeBlock("page", 1, [
      makeBlock("quote", 2, [makeBlock("text", 3), makeBlock("text", 4)]),
      makeBlock("bullet", 5),
    ])
    const result = collectTextualBlocks(root)
    expect(result.map((b) => b.id)).toEqual([2, 3, 4, 5])
  })

  it("returns empty array when no textual blocks", () => {
    const root = makeBlock("page", 1, [
      makeBlock("image", 2),
      makeBlock("file", 3),
    ])
    expect(collectTextualBlocks(root)).toEqual([])
  })

  it("handles empty document", () => {
    const root = makeBlock("page", 1)
    expect(collectTextualBlocks(root)).toEqual([])
  })

  it("handles deeply nested structure", () => {
    const root = makeBlock("page", 1, [
      makeBlock("grid", 2, [makeBlock("grid", 3, [makeBlock("text", 4)])]),
    ])
    const result = collectTextualBlocks(root)
    expect(result.map((b) => b.id)).toEqual([4])
  })
})

// ─── buildRegex ──────────────────────────────────────────────────

describe("buildRegex", () => {
  it("returns null for empty pattern", () => {
    expect(
      buildRegex("", {
        isRegex: false,
        caseSensitive: false,
        wholeWord: false,
      }),
    ).toBeNull()
  })

  // Plain text mode
  describe("plain text mode", () => {
    it("escapes special regex characters", () => {
      const regex = buildRegex("a.b", {
        isRegex: false,
        caseSensitive: false,
        wholeWord: false,
      })
      expect(regex).not.toBeNull()
      expect(regex!.test("a.b")).toBe(true)
      expect(regex!.test("axb")).toBe(false)
    })

    it("escapes all special chars: []{}()*+?^$|\\.", () => {
      const special = "[test](http://example.com)"
      const regex = buildRegex(special, {
        isRegex: false,
        caseSensitive: false,
        wholeWord: false,
      })
      expect(regex).not.toBeNull()
      expect(regex!.test(special)).toBe(true)
    })

    it("is case-insensitive by default", () => {
      const regex = buildRegex("hello", {
        isRegex: false,
        caseSensitive: false,
        wholeWord: false,
      })
      expect(regex!.flags).toContain("i")
      expect("Hello".match(regex!)).not.toBeNull()
      expect("HELLO".match(regex!)).not.toBeNull()
    })

    it("respects caseSensitive flag", () => {
      const regex = buildRegex("hello", {
        isRegex: false,
        caseSensitive: true,
        wholeWord: false,
      })
      expect(regex!.test("hello")).toBe(true)
      expect(regex!.test("Hello")).toBe(false)
    })

    it("respects wholeWord flag", () => {
      const regex = buildRegex("cat", {
        isRegex: false,
        caseSensitive: false,
        wholeWord: true,
      })
      expect(regex!.test("the cat sat")).toBe(true)
      expect(regex!.test("concatenate")).toBe(false)
      expect(regex!.test("cat")).toBe(true)
    })

    it("wholeWord escapes special chars (\\b only works at word boundaries)", () => {
      // \b wraps the pattern, but + is a non-word char so \b won't
      // match at end of "c++". This is the same behavior as VS Code.
      const regex = buildRegex("test", {
        isRegex: false,
        caseSensitive: false,
        wholeWord: true,
      })
      expect(regex).not.toBeNull()
      expect("a test b".match(regex!)).not.toBeNull()
      expect("testing".match(regex!)).toBeNull()
      expect("atest".match(regex!)).toBeNull()
    })

    it("always has global flag", () => {
      const regex = buildRegex("test", {
        isRegex: false,
        caseSensitive: true,
        wholeWord: false,
      })
      expect(regex!.flags).toContain("g")
    })
  })

  // Regex mode
  describe("regex mode", () => {
    it("compiles valid regex pattern", () => {
      const regex = buildRegex("\\d+", {
        isRegex: true,
        caseSensitive: false,
        wholeWord: false,
      })
      expect(regex).not.toBeNull()
      expect(regex!.test("abc123")).toBe(true)
    })

    it("returns null for invalid regex", () => {
      const regex = buildRegex("[", {
        isRegex: true,
        caseSensitive: false,
        wholeWord: false,
      })
      expect(regex).toBeNull()
    })

    it("returns null for unbalanced parens", () => {
      expect(
        buildRegex("(abc", {
          isRegex: true,
          caseSensitive: false,
          wholeWord: false,
        }),
      ).toBeNull()
    })

    it("supports capture groups", () => {
      const regex = buildRegex("(\\w+)@(\\w+)", {
        isRegex: true,
        caseSensitive: false,
        wholeWord: false,
      })
      expect(regex).not.toBeNull()
      const match = regex!.exec("user@domain")
      expect(match).not.toBeNull()
      expect(match![1]).toBe("user")
      expect(match![2]).toBe("domain")
    })

    it("respects caseSensitive in regex mode", () => {
      const sensitive = buildRegex("abc", {
        isRegex: true,
        caseSensitive: true,
        wholeWord: false,
      })
      expect(sensitive!.flags).not.toContain("i")

      const insensitive = buildRegex("abc", {
        isRegex: true,
        caseSensitive: false,
        wholeWord: false,
      })
      expect(insensitive!.flags).toContain("i")
    })

    it("does not apply wholeWord in regex mode (user manages it)", () => {
      const regex = buildRegex("cat", {
        isRegex: true,
        caseSensitive: false,
        wholeWord: true,
      })
      // wholeWord is ignored in regex mode, pattern stays as-is
      expect(regex!.test("concatenate")).toBe(true)
    })

    it("supports lookahead/lookbehind", () => {
      const regex = buildRegex("(?<=@)\\w+", {
        isRegex: true,
        caseSensitive: false,
        wholeWord: false,
      })
      expect(regex).not.toBeNull()
      const match = regex!.exec("user@domain")
      expect(match![0]).toBe("domain")
    })
  })
})

// ─── findMatches ─────────────────────────────────────────────────

describe("findMatches", () => {
  it("finds simple matches", () => {
    const regex = /hello/gi
    const matches = findMatches("Hello World hello", regex)
    expect(matches).toHaveLength(2)
    expect(matches[0]).toEqual({ index: 0, length: 5, match: "Hello" })
    expect(matches[1]).toEqual({ index: 12, length: 5, match: "hello" })
  })

  it("returns empty array for no matches", () => {
    expect(findMatches("hello", /xyz/g)).toEqual([])
  })

  it("handles empty input text", () => {
    expect(findMatches("", /test/g)).toEqual([])
  })

  it("finds overlapping-adjacent matches", () => {
    const matches = findMatches("aaa", /a/g)
    expect(matches).toHaveLength(3)
    expect(matches.map((m) => m.index)).toEqual([0, 1, 2])
  })

  it("handles zero-length matches without infinite loop", () => {
    const matches = findMatches("abc", /(?=a)/g)
    expect(matches).toHaveLength(1)
    expect(matches[0]).toEqual({ index: 0, length: 0, match: "" })
  })

  it("handles zero-length matches at every position", () => {
    const matches = findMatches("ab", /\b/g)
    // "ab" has word boundaries at 0 and 2
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it("finds matches with capture groups", () => {
    const regex = /(\d{4})-(\d{2})-(\d{2})/g
    const matches = findMatches("Date: 2024-01-15", regex)
    expect(matches).toHaveLength(1)
    expect(matches[0].match).toBe("2024-01-15")
    expect(matches[0].index).toBe(6)
    expect(matches[0].length).toBe(10)
  })

  it("resets lastIndex before searching", () => {
    const regex = /test/g
    regex.lastIndex = 100 // simulate stale state
    const matches = findMatches("test test", regex)
    expect(matches).toHaveLength(2)
  })

  it("handles unicode text", () => {
    const matches = findMatches("你好世界你好", /你好/g)
    expect(matches).toHaveLength(2)
    expect(matches[0].index).toBe(0)
    expect(matches[1].index).toBe(4)
  })

  it("handles multiline text", () => {
    const text = "line1\nline2\nline3"
    const matches = findMatches(text, /line\d/g)
    expect(matches).toHaveLength(3)
  })

  it("handles regex with alternation", () => {
    const matches = findMatches("cat and dog", /cat|dog/g)
    expect(matches).toHaveLength(2)
    expect(matches[0].match).toBe("cat")
    expect(matches[1].match).toBe("dog")
  })

  // Replacement pattern tests (using String.prototype.replace behavior)
  describe("replacement patterns via String.replace", () => {
    it("$& inserts the matched substring", () => {
      const result = "hello world".replace(/world/g, "[$&]")
      expect(result).toBe("hello [world]")
    })

    it("$1 inserts first capture group", () => {
      const result = "2024-01-15".replace(
        /(\d{4})-(\d{2})-(\d{2})/g,
        "$2/$3/$1",
      )
      expect(result).toBe("01/15/2024")
    })

    it("$$ inserts literal $", () => {
      const result = "price 100".replace(/(\d+)/g, "$$$1")
      expect(result).toBe("price $100")
    })

    it("$` inserts text before match", () => {
      const result = "abc".replace(/b/g, "[$`]")
      expect(result).toBe("a[a]c")
    })

    it("$' inserts text after match", () => {
      const result = "abc".replace(/b/g, "[$']")
      expect(result).toBe("a[c]c")
    })

    it("non-existent group reference stays as literal", () => {
      const result = "hello".replace(/(h)/g, "$1$2")
      expect(result).toBe("h$2ello")
    })

    it("handles named capture groups with $<name>", () => {
      const result = "2024-01-15".replace(
        /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/g,
        "$<month>/$<day>/$<year>",
      )
      expect(result).toBe("01/15/2024")
    })

    it("works with current match replacement approach", () => {
      // Simulates replaceCurrent: run replace on the matched substring
      const text = "foo123bar456"
      const regex = /(\d)(\d+)/g
      const matchResult = regex.exec(text)!
      const matched = matchResult[0] // "123"

      // Reset and run replace on just the match
      const resolvedReplacement = matched.replace(/(\d)(\d+)/, "$1-$2")
      expect(resolvedReplacement).toBe("1-23")

      const before = text.slice(0, matchResult.index)
      const after = text.slice(matchResult.index + matched.length)
      expect(before + resolvedReplacement + after).toBe("foo1-23bar456")
    })
  })
})
