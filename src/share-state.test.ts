// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

const shareStateModuleUrl = new URL("./share-state.ts", import.meta.url).href;
const {
  buildShareableSearchUrl,
  defaultShareableSearchState,
  parseShareableSearchState,
  serializeShareableSearchState,
} = await import(shareStateModuleUrl);

test("parses shareable search state from URL parameters", () => {
  const state = parseShareableSearchState(
    "?q=sanghai&mode=every&continuous=1&v=0&fuzzy=1&rules=sh-s,n-l",
  );

  assert.deepEqual(state, {
    query: "sanghai",
    searchMode: "every",
    continuous: true,
    useV: false,
    fuzzyEnabled: true,
    fuzzyRules: ["sh-s", "n-l"],
  });
});

test("ignores invalid modes and fuzzy rules", () => {
  const state = parseShareableSearchState(
    "?mode=unknown&rules=sh-s,invalid,n-l",
  );

  assert.equal(state.searchMode, defaultShareableSearchState.searchMode);
  assert.deepEqual(state.fuzzyRules, ["sh-s", "n-l"]);
});

test("serializes only non-default settings besides the query", () => {
  const search = serializeShareableSearchState({
    ...defaultShareableSearchState,
    query: "sanghai",
    fuzzyEnabled: true,
    fuzzyRules: ["sh-s"],
  });

  assert.equal(search, "q=sanghai&fuzzy=1&rules=sh-s");
});

test("preserves an explicitly empty fuzzy rule selection", () => {
  const search = serializeShareableSearchState({
    ...defaultShareableSearchState,
    fuzzyRules: [],
  });
  assert.equal(search, "q=zgyh&rules=");
  assert.deepEqual(parseShareableSearchState(`?${search}`).fuzzyRules, []);
});

test("round-trips shareable state", () => {
  const state = {
    query: "beijin",
    searchMode: "start",
    continuous: true,
    useV: false,
    fuzzyEnabled: true,
    fuzzyRules: ["n-l", "in-ing"],
  };

  const serialized = serializeShareableSearchState(state);
  assert.deepEqual(parseShareableSearchState(`?${serialized}`), state);
});

test("builds a share URL without carrying unrelated query parameters", () => {
  const url = buildShareableSearchUrl(
    "https://example.com/play?old=1#results",
    {
      ...defaultShareableSearchState,
      query: "zongguo",
      fuzzyEnabled: true,
      fuzzyRules: ["zh-z"],
    },
  );

  assert.equal(
    url,
    "https://example.com/play?q=zongguo&fuzzy=1&rules=zh-z#results",
  );
});
