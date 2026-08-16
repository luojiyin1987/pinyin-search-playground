// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

const rankingModuleUrl = new URL("./ranking.ts", import.meta.url).href;
const { calculateScore, calculateScoreDiagnostics, rankResults } = await import(
  rankingModuleUrl
);

test("prefers stricter match modes", () => {
  assert.ok(
    calculateScore("中国", [0, 1], "every") >
      calculateScore("中国", [0, 1], "first"),
  );
  assert.ok(
    calculateScore("中国", [0, 1], "first") >
      calculateScore("中国", [0, 1], "start"),
  );
  assert.ok(
    calculateScore("中国", [0, 1], "start") >
      calculateScore("中国", [0, 1], "any"),
  );
});

test("penalizes fuzzy substitutions", () => {
  assert.ok(
    calculateScore("中国", [0, 1], "every", 0) >
      calculateScore("中国", [0, 1], "every", 1),
  );
});

test("an exact first-letter match outranks a one-step fuzzy exact match", () => {
  assert.ok(
    calculateScore("中国", [0, 1], "first", 0) >
      calculateScore("中国", [0, 1], "every", 1),
  );
});

test("prefers matches at the start of the text", () => {
  assert.ok(calculateScore("中国", [0, 1]) > calculateScore("我爱中国", [2, 3]));
});

test("prefers continuous matches", () => {
  assert.ok(
    calculateScore("甲乙丙丁戊", [0, 1, 2]) >
      calculateScore("甲乙丙丁戊", [0, 2, 4]),
  );
});

test("prefers a shorter span when other signals are equal", () => {
  assert.ok(
    calculateScore("甲乙丙丁戊", [0, 2, 3]) >
      calculateScore("甲乙丙丁戊", [0, 2, 4]),
  );
});

test("prefers shorter text as a tie-break signal", () => {
  assert.ok(
    calculateScore("中国", [0, 1]) > calculateScore("中国银行", [0, 1]),
  );
});

test("exposes the existing score as an explainable breakdown", () => {
  const diagnostics = calculateScoreDiagnostics("中国", [0, 1], "every", 0);

  assert.deepEqual(diagnostics.breakdown, {
    mode: 400,
    fuzzy: 0,
    start: 100,
    continuous: 50,
    coverage: 20,
    span: 28,
    length: -2,
  });
  assert.equal(diagnostics.total, 596);
  assert.equal(diagnostics.total, calculateScore("中国", [0, 1], "every", 0));
});

test("diagnostics expose the fuzzy penalty without changing its weight", () => {
  const diagnostics = calculateScoreDiagnostics("中国", [0, 1], "every", 2);
  assert.equal(diagnostics.breakdown.fuzzy, -240);
  assert.equal(diagnostics.total, calculateScore("中国", [0, 1], "every", 2));
});

test("sorts results by descending relevance score", () => {
  const ranked = rankResults([
    { text: "我爱中国", indexes: [2, 3] },
    { text: "中间有国", indexes: [0, 3] },
    { text: "中国", indexes: [0, 1] },
  ]);

  assert.deepEqual(
    ranked.map(({ text }) => text),
    ["中国", "中间有国", "我爱中国"],
  );
});

test("ranked results carry diagnostics matching their score", () => {
  const [ranked] = rankResults([
    { text: "中国", indexes: [0, 1], matchMode: "every" },
  ]);

  assert.equal(ranked.score, ranked.diagnostics.total);
  assert.equal(ranked.diagnostics.breakdown.mode, 400);
});

test("match mode outranks positional signals in automatic search", () => {
  const ranked = rankResults([
    { text: "甲中国", indexes: [1, 2], matchMode: "every" },
    { text: "中国", indexes: [0, 1], matchMode: "any" },
  ]);

  assert.equal(ranked[0].matchMode, "every");
});
