// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

const datasetModuleUrl = new URL("./dataset.ts", import.meta.url).href;
const { parseDataset, serializeDataset } = await import(datasetModuleUrl);

test("parses one term per line and ignores blank lines", () => {
  assert.deepEqual(parseDataset("中国银行\n\n 重庆银行 \r\n上海银行"), [
    "中国银行",
    "重庆银行",
    "上海银行",
  ]);
});

test("removes duplicate terms while preserving first-seen order", () => {
  assert.deepEqual(parseDataset("上海\n北京\n上海\n深圳\n北京"), [
    "上海",
    "北京",
    "深圳",
  ]);
});

test("serializes terms as newline-separated text", () => {
  assert.equal(serializeDataset(["中国银行", "招商银行"]), "中国银行\n招商银行");
});
