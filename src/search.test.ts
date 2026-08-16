// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

const searchModuleUrl = new URL("./search.ts", import.meta.url).href;
const { findMatch } = await import(searchModuleUrl);

test("auto prefers complete pinyin matches", () => {
  const result = findMatch("中国", "zhongguo", "auto");
  assert.equal(result?.matchMode, "every");
});

test("auto classifies initials as first-letter matches", () => {
  const result = findMatch("中国银行", "zgyh", "auto");
  assert.equal(result?.matchMode, "first");
});

test("auto falls back to prefix matching for partial syllables", () => {
  const result = findMatch("中国", "zhonggu", "auto");
  assert.equal(result?.matchMode, "start");
});

test("auto falls back to any matching when stricter modes fail", () => {
  const result = findMatch("中国", "ongg", "auto");
  assert.equal(result?.matchMode, "any");
});

test("manual mode only uses the selected precision", () => {
  assert.equal(findMatch("中文拼音", "zhwpy", "first"), null);
  assert.ok(findMatch("中文拼音", "zhwpy", "start"));
});

test("fuzzy rules can promote a pronunciation variant to a strict match", () => {
  const result = findMatch("中国", "zongguo", "auto", {
    fuzzyRules: ["zh-z"],
  });

  assert.equal(result?.matchMode, "every");
  assert.equal(result?.matchedQuery, "zhongguo");
  assert.deepEqual(result?.fuzzyRules, ["zh-z"]);
  assert.equal(result?.fuzzyDistance, 1);
});

test("manual strict matching can opt into fuzzy rules", () => {
  const result = findMatch("银行", "yinghang", "every", {
    fuzzyRules: ["in-ing"],
  });

  assert.equal(result?.matchedQuery, "yinhang");
  assert.equal(result?.fuzzyDistance, 1);
});

test("any mode does not expand fuzzy variants", () => {
  const withoutFuzzy = findMatch("中国", "zongguo", "any");
  const withFuzzy = findMatch("中国", "zongguo", "any", {
    fuzzyRules: ["zh-z"],
  });

  assert.deepEqual(withFuzzy, withoutFuzzy);
});
