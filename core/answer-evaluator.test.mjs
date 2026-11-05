import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAnswer } from "./answer-evaluator.mjs";

const task = (evaluation, overrides = {}) => ({ taskId: "A1", contentVersion: "1.0.2-draft", evaluation, ...overrides });
const part = (partId, accepted, extra = {}) => ({ partId, accepted, responsePath: partId, ...extra });

test("accepts the expected answer deterministically", () => {
  const t = task({ mode: "BLANKS", ruleVersion: "r1", parts: [part("p1", [{ value: "am" }])] });
  const a = evaluateAnswer({ task: t, response: { p1: "am" } });
  assert.equal(a.status, "EVALUATED");
  assert.equal(a.outcome, "CORRECT");
  assert.equal(a.taskCorrect, true);
});
test("accepts only explicitly authored alternatives", () => {
  const t = task({ mode: "TRANSFORM", parts: [part("p1", [{ value: "are not" }, { value: "aren't", alternativeId: "ALT-1" }], { normalization: { trim: true, caseInsensitive: true } })] });
  assert.equal(evaluateAnswer({ task: t, response: { p1: "AREN'T " } }).taskCorrect, true);
  assert.equal(evaluateAnswer({ task: t, response: { p1: "are not at" } }).taskCorrect, false);
});
test("case and whitespace normalization apply only when explicitly enabled", () => {
  const t = task({ mode: "BLANKS", parts: [part("p1", [{ value: "is" }], { normalization: { trim: true, caseInsensitive: true } })] });
  assert.equal(evaluateAnswer({ task: t, response: { p1: " IS " } }).taskCorrect, true);
  const strict = task({ mode: "BLANKS", parts: [part("p1", [{ value: "is" }])] });
  assert.equal(evaluateAnswer({ task: strict, response: { p1: " IS " } }).taskCorrect, false);
});
test("multi-part exercise remains one exercise with separate part outcomes", () => {
  const t = task({ mode: "MULTI_PART", parts: [part("one", [{ value: "B" }]), part("two", [{ value: "are not" }, { value: "aren't" }])] });
  const a = evaluateAnswer({ task: t, response: { one: "B", two: "are" } });
  assert.equal(a.outcome, "PARTIALLY_CORRECT");
  assert.equal(a.taskCorrect, false);
  assert.deepEqual(a.parts.map(p => p.outcome), ["CORRECT", "INCORRECT"]);
});
test("matching relations compare object keys deterministically and honor authored unordered arrays", () => {
  const t = task({ mode: "MATCHING", parts: [part("pairs", [
    { value: [{ left: "Emma", right: "She" }, { left: "Daniel", right: "He" }] }
  ], { normalization: { unorderedArray: true } })] });
  const response = { pairs: [{ right: "He", left: "Daniel" }, { right: "She", left: "Emma" }] };
  assert.equal(evaluateAnswer({ task: t, response }).taskCorrect, true);
});
test("matching array order remains significant unless authored as unordered", () => {
  const t = task({ mode: "MATCHING", parts: [part("pairs", [
    { value: [{ left: "Emma", right: "She" }, { left: "Daniel", right: "He" }] }
  ])] });
  const response = { pairs: [{ left: "Daniel", right: "He" }, { left: "Emma", right: "She" }] };
  assert.equal(evaluateAnswer({ task: t, response }).taskCorrect, false);
});
test("missing part and unsupported open response fail closed", () => {
  const t = task({ mode: "BLANKS", parts: [part("p1", [{ value: "am" }])] });
  assert.equal(evaluateAnswer({ task: t, response: {} }).status, "REVIEW_REQUIRED");
  assert.equal(evaluateAnswer({ task: task({ mode: "OPEN_RESPONSE" }), response: "I am..." }).status, "REVIEW_REQUIRED");
});
test("invalid descriptors are not guessed", () => {
  assert.equal(evaluateAnswer({ task: task({ mode: "BLANKS", parts: [] }), response: {} }).status, "REVIEW_REQUIRED");
  assert.equal(evaluateAnswer({ task: task({ mode: "NOPE" }), response: {} }).status, "REJECTED");
});
test("same task, response and versions produce deterministic output", () => {
  const t = task({ mode: "CHOICE", ruleVersion: "r2", parts: [part("selected", [{ value: "B" }])] });
  assert.deepEqual(evaluateAnswer({ task: t, response: { selected: "B" } }), evaluateAnswer({ task: t, response: { selected: "B" } }));
});
test("evaluation does not mutate the original learner response", () => {
  const response = { p1: "AM", nested: { keep: true } };
  const before = JSON.stringify(response);
  const t = task({ mode: "BLANKS", parts: [part("p1", [{ value: "am" }], { normalization: { caseInsensitive: true } })] });
  evaluateAnswer({ task: t, response });
  assert.equal(JSON.stringify(response), before);
});
