import test from "node:test";
import assert from "node:assert/strict";
import { classifyDiagnostics } from "./diagnostic-classifier.mjs";

const rule = (diagnosticId, errorTag, responsePath, expectedRuleRef, scope, when) =>
  ({ diagnosticId, errorTag, responsePath, expectedRuleRef, scope, when });
const makeTask = () => ({
  taskId: "D3", contentVersion: "1.0.2-draft",
  evaluation: { mode: "MULTI_PART", parts: [
    { partId: "p1", diagnostics: [rule("D3-01", "FORM_AM", "p1", "D3-R1", "TARGET_HYPOTHESIS", { operator: "equals", value: "I is" })] },
    { partId: "p2", diagnostics: [rule("D3-02", "FORM_IS", "p2", "D3-R2", "TARGET_HYPOTHESIS", { operator: "equals", value: "She are" })] },
    { partId: "p3", diagnostics: [rule("D3-03", "ARTICLE_USAGE", "p3", "D3-R3", "OUTSIDE_TARGET", { operator: "equals", value: "I am teacher" })] },
    { partId: "p4", diagnostics: [rule("D3-04", "INSTRUCTION_FOLLOWING", "p4", "D3-R4", "INSTRUCTION", { operator: "equals", value: "full form" })] },
    { partId: "p5", diagnostics: [rule("D3-05", "DIALOGUE_CONSTRUCTION", "p5", "D3-R5", "COMMUNICATION", { operator: "equals", value: "unrelated reply" })] }
  ]}
});
const evaluation = parts => ({ status: "EVALUATED", parts });
const common = {
  answerEventId: "evt-answer-1",
  diagnosticTaxonomyVersion: "to-be-a1-taxonomy-v1",
  allowedErrorTags: ["FORM_AM","FORM_IS","ARTICLE_USAGE","INSTRUCTION_FOLLOWING","DIALOGUE_CONSTRUCTION"]
};

test("emits separate records only for authored conditions that match, linked to one answer event", () => {
  const task = makeTask();
  const response = { p1: "I is", p2: "She are", p3: "I am teacher", p4: "full form", p5: "unrelated reply" };
  const result = classifyDiagnostics({
    ...common, task, rawResponse: response,
    evaluation: evaluation(["p1","p2","p3","p4","p5"].map(partId => ({ partId, outcome: "INCORRECT" })))
  });
  assert.equal(result.status, "CLASSIFIED");
  assert.equal(result.records.length, 5);
  assert.deepEqual(result.records.map(r => r.errorTag), ["FORM_AM","FORM_IS","ARTICLE_USAGE","INSTRUCTION_FOLLOWING","DIALOGUE_CONSTRUCTION"]);
  assert.ok(result.records.every(r => r.answerEventId === common.answerEventId));
  assert.ok(result.records.every(r => r.contentVersion === "1.0.2-draft"));
  assert.deepEqual(result.records.map(r => r.evidence.observedValue), Object.values(response));
});
test("does not diagnose correct parts", () => {
  const task = makeTask();
  const result = classifyDiagnostics({ ...common, task, rawResponse: {}, evaluation: evaluation([{ partId: "p1", outcome: "CORRECT" }]) });
  assert.equal(result.status, "NO_DIAGNOSTIC");
  assert.equal(result.records.length, 0);
});
test("returns NO_DIAGNOSTIC when incorrect response matches no authored condition", () => {
  const task = makeTask();
  const result = classifyDiagnostics({ ...common, task, rawResponse: { p1: "I am" }, evaluation: evaluation([{ partId: "p1", outcome: "INCORRECT" }]) });
  assert.equal(result.status, "NO_DIAGNOSTIC");
});
test("supports explicit oneOf conditions and multiple independent records", () => {
  const task = { taskId: "X", contentVersion: "v1", evaluation: { parts: [{ partId: "p", diagnostics: [
    rule("x-1", "FORM_AM", "p", "r1", "TARGET_HYPOTHESIS", { operator: "oneOf", values: ["I is", "I are"] }),
    rule("x-2", "SUBJECT_MAPPING", "p", "r2", "TARGET_HYPOTHESIS", { operator: "equals", value: "I are" })
  ] }] } };
  const result = classifyDiagnostics({ ...common, task, rawResponse: { p: "I are" }, evaluation: evaluation([{ partId: "p", outcome: "INCORRECT" }]), allowedErrorTags: ["FORM_AM","SUBJECT_MAPPING"] });
  assert.equal(result.status, "CLASSIFIED");
  assert.equal(result.records.length, 2);
});
test("requires persisted answer reference, valid evaluation and taxonomy version", () => {
  const task = makeTask();
  assert.equal(classifyDiagnostics({ task, evaluation: evaluation([]), diagnosticTaxonomyVersion: "v1", allowedErrorTags: ["FORM_AM"] }).reason, "ANSWER_EVENT_ID_REQUIRED");
  assert.equal(classifyDiagnostics({ task, evaluation: { status: "REVIEW_REQUIRED", parts: [] }, answerEventId: "evt", diagnosticTaxonomyVersion: "v1", allowedErrorTags: ["FORM_AM"] }).reason, "VALID_EVALUATION_REQUIRED");
  assert.equal(classifyDiagnostics({ task, evaluation: evaluation([]), answerEventId: "evt" }).reason, "TAXONOMY_VERSION_AND_ALLOWED_TAGS_REQUIRED");
});
test("rejects reserved aggregate/skill tags as concrete error tags", () => {
  const task = { taskId: "X", contentVersion: "v1", evaluation: { parts: [{ partId: "p", diagnostics: [rule("x-1", "GRAMMAR_ACCURACY", "p", "r", "TARGET_HYPOTHESIS", { operator: "equals", value: "x" })] }] } };
  const result = classifyDiagnostics({ ...common, task, rawResponse: { p: "x" }, evaluation: evaluation([{ partId: "p", outcome: "INCORRECT" }]) });
  assert.equal(result.status, "REVIEW_REQUIRED");
  assert.equal(result.reason, "NON_DIAGNOSTIC_TAG_USED_AS_ERROR");
});
test("duplicate diagnostic ids fail closed", () => {
  const task = { taskId: "X", contentVersion: "v1", evaluation: { parts: [{ partId: "p", diagnostics: [
    rule("same", "FORM_AM", "p", "r1", "TARGET_HYPOTHESIS", { operator: "equals", value: "x" }),
    rule("same", "FORM_IS", "p", "r2", "TARGET_HYPOTHESIS", { operator: "equals", value: "x" })
  ] }] } };
  const result = classifyDiagnostics({ ...common, task, rawResponse: { p: "x" }, evaluation: evaluation([{ partId: "p", outcome: "INCORRECT" }]) });
  assert.equal(result.status, "REVIEW_REQUIRED");
  assert.equal(result.reason, "DUPLICATE_DIAGNOSTIC_ID");
});
test("missing condition, evidence, or path fails closed", () => {
  const base = rule("x", "FORM_AM", "p", "r", "TARGET_HYPOTHESIS", { operator: "equals", value: "x" });
  const task = { taskId: "X", contentVersion: "v1", evaluation: { parts: [{ partId: "p", diagnostics: [{ ...base, when: undefined }] }] } };
  assert.equal(classifyDiagnostics({ ...common, task, rawResponse: { p: "x" }, evaluation: evaluation([{ partId: "p", outcome: "INCORRECT" }]) }).reason, "AUTHORED_DIAGNOSTIC_RULE_INVALID");
  const task2 = { ...task, evaluation: { parts: [{ partId: "p", diagnostics: [base] }] } };
  assert.equal(classifyDiagnostics({ ...common, task: task2, rawResponse: {}, evaluation: evaluation([{ partId: "p", outcome: "INCORRECT" }]) }).reason, "DIAGNOSTIC_EVIDENCE_MISSING");
});
test("does not mutate raw response", () => {
  const task = makeTask();
  const response = { p1: "I is" };
  const before = JSON.stringify(response);
  classifyDiagnostics({ ...common, task, rawResponse: response, evaluation: evaluation([{ partId: "p1", outcome: "INCORRECT" }]) });
  assert.equal(JSON.stringify(response), before);
});
test("is deterministic for the same inputs", () => {
  const task = makeTask();
  const args = { ...common, task, rawResponse: { p1: "I is" }, evaluation: evaluation([{ partId: "p1", outcome: "INCORRECT" }]) };
  assert.deepEqual(classifyDiagnostics(args), classifyDiagnostics(args));
});
