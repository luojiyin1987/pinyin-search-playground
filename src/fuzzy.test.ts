// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

const fuzzyModuleUrl = new URL("./fuzzy.ts", import.meta.url).href;
const { generateFuzzyVariants } = await import(fuzzyModuleUrl);

function findVariant(query, target, rules) {
  return generateFuzzyVariants(query, rules).find(
    (variant) => variant.query === target,
  );
}

test("expands retroflex initials", () => {
  assert.equal(findVariant("zongguo", "zhongguo", ["zh-z"])?.distance, 1);
  assert.equal(findVariant("congqing", "chongqing", ["ch-c"])?.distance, 1);
  assert.equal(findVariant("sanghai", "shanghai", ["sh-s"])?.distance, 1);
});

test("expands n and l initials", () => {
  const variant = findVariant("lanning", "nanning", ["n-l"]);
  assert.equal(variant?.distance, 1);
  assert.deepEqual(variant?.rules, ["n-l"]);
});

test("expands nasal finals conservatively", () => {
  assert.equal(findVariant("chanan", "changan", ["an-ang"])?.distance, 1);
  assert.equal(findVariant("shenzheng", "shenzhen", ["en-eng"])?.distance, 1);
  assert.equal(findVariant("beijin", "beijing", ["in-ing"])?.distance, 1);
});

test("keeps the original query as the zero-distance variant", () => {
  const variants = generateFuzzyVariants("ZongGuo", ["zh-z"]);
  assert.deepEqual(variants[0], {
    query: "zongguo",
    rules: [],
    distance: 0,
  });
});

test("respects the variant cap", () => {
  const variants = generateFuzzyVariants(
    "lianlian",
    ["n-l", "an-ang", "in-ing"],
    5,
  );

  assert.ok(variants.length <= 5);
});
