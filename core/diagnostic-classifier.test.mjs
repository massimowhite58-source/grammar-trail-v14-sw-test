import test from "node:test";
import assert from "node:assert/strict";
import { classifyDiagnostics } from "./diagnostic-classifier.mjs";

const makeTask = () => ({
  taskId: "D3", contentVersion: "1.0.2-draft",
  evaluation: { mode: "MULTI_PART", parts: [
    { partId: "p1", diagnostics: [{ errorTag: "FORM_AM", responsePath: "p1", expectedRuleRef: "D3-R1", scope: "TARGET_HYPOTHESIS" }] },
    { partId: "p2", diagnostics: [{ errorTag: "FORM_IS", responsePath: "p2", expectedRuleRef: "D3-R2", scope: "TARGET_HYPOTHESIS" }] },
    { partId: "p3", diagnostics: [{ errorTag: "ARTICLE_USAGE", responsePath: "p3", expectedRuleRef: "D3-R3", scope: "OUTSIDE_TARGET" }] },
    { partId: "p4", diagnostics: [{ errorTag: "INSTRUCTION_FOLLOWING", responsePath: "p4", expectedRuleRef: "D3-R4", scope: "INSTRUCTION" }] },
    { partId: "p5", diagnostics: [{ errorTag: "DIALOGUE_CONSTRUCTION", responsePath: "p5", expectedRuleRef: "D3-R5", scope: "COMMUNICATION" }] }
  ]}
});
const evaluation = parts => ({ status: "EVALUATED", parts });

test("emits separate records for independent errors linked to one answer event", () => {
  const task = makeTask();
  const response = { p1: "I is", p2: "She are", p3: "I am teacher", p4: "full form", p5: "unrelated reply" };
  const result = classifyDiagnostics({
    task, rawResponse: response,
    evaluation: evaluation(["p1","p2","p3","p4","p5"].map(partId => ({ partId, outcome: "INCORRECT" }))),
    answerEventId: "evt-answer-1", diagnosticTaxonomyVersion: "to-be-a1-taxonomy-v1", allowedErrorTags: ["FORM_AM","FORM_IS","ARTICLE_USAGE","INSTRUCTION_FOLLOWING","DIALOGUE_CONSTRUCTION"]
  });
  assert.equal(result.status, "CLASSIFIED");
  assert.equal(result.records.length, 5);
  assert.deepEqual(result.records.map(r => r.errorTag), ["FORM_AM","FORM_IS","ARTICLE_USAGE","INSTRUCTION_FOLLOWING","DIALOGUE_CONSTRUCTION"]);
  assert.ok(result.records.every(r => r.answerEventId === "evt-answer-1"));
  assert.ok(result.records.every(r => r.contentVersion === "1.0.2-draft"));
  assert.deepEqual(result.records.map(r => r.evidence.observedValue), Object.values(response));
});
test("does not diagnose correct parts and returns NO_DIAGNOSTIC when none are incorrect", () => {
  const task = makeTask();
  const result = classifyDiagnostics({
    task, rawResponse: {}, evaluation: evaluation([{ partId: "p1", outcome: "CORRECT" }]),
    answerEventId: "evt-1", diagnosticTaxonomyVersion: "tax-v1", allowedErrorTags: ["FORM_AM","FORM_IS","ARTICLE_USAGE","INSTRUCTION_FOLLOWING","DIALOGUE_CONSTRUCTION"]
  });
  assert.equal(result.status, "NO_DIAGNOSTIC");
  assert.equal(result.records.length, 0);
});
test("requires persisted answer reference, valid evaluation and taxonomy version", () => {
  const task = makeTask();
  assert.equal(classifyDiagnostics({ task, evaluation: evaluation([]), diagnosticTaxonomyVersion: "v1", allowedErrorTags: ["FORM_AM","FORM_IS","ARTICLE_USAGE","INSTRUCTION_FOLLOWING","DIALOGUE_CONSTRUCTION"] }).reason, "ANSWER_EVENT_ID_REQUIRED");
  assert.equal(classifyDiagnostics({ task, evaluation: { status: "REVIEW_REQUIRED", parts: [] }, answerEventId: "evt", diagnosticTaxonomyVersion: "v1", allowedErrorTags: ["FORM_AM","FORM_IS","ARTICLE_USAGE","INSTRUCTION_FOLLOWING","DIALOGUE_CONSTRUCTION"] }).reason, "VALID_EVALUATION_REQUIRED");
  assert.equal(classifyDiagnostics({ task, evaluation: evaluation([]), answerEventId: "evt" }).reason, "TAXONOMY_VERSION_AND_ALLOWED_TAGS_REQUIRED");
});
test("rejects reserved aggregate/skill tags as concrete error tags", () => {
  const task = { taskId: "X", contentVersion: "v1", evaluation: { mode: "BLANKS", parts: [{ partId: "p", diagnostics: [{ errorTag: "GRAMMAR_ACCURACY", responsePath: "p", expectedRuleRef: "r", scope: "TARGET_HYPOTHESIS" }] }] } };
  const result = classifyDiagnostics({ task, rawResponse: { p: "x" }, evaluation: evaluation([{ partId: "p", outcome: "INCORRECT" }]), answerEventId: "evt", diagnosticTaxonomyVersion: "v1", allowedErrorTags: ["FORM_AM","FORM_IS","ARTICLE_USAGE","INSTRUCTION_FOLLOWING","DIALOGUE_CONSTRUCTION"] });
  assert.equal(result.status, "REVIEW_REQUIRED");
  assert.equal(result.reason, "NON_DIAGNOSTIC_TAG_USED_AS_ERROR");
});
test("duplicate diagnostic ids fail closed", () => {
  const task = { taskId: "X", contentVersion: "v1", evaluation: { mode: "BLANKS", parts: [{ partId: "p", diagnostics: [
    { diagnosticId: "same", errorTag: "FORM_AM", responsePath: "p", expectedRuleRef: "r1", scope: "TARGET_HYPOTHESIS" },
    { diagnosticId: "same", errorTag: "FORM_IS", responsePath: "p", expectedRuleRef: "r2", scope: "TARGET_HYPOTHESIS" }
  ] }] } };
  const result = classifyDiagnostics({ task, rawResponse: { p: "x" }, evaluation: evaluation([{ partId: "p", outcome: "INCORRECT" }]), answerEventId: "evt", diagnosticTaxonomyVersion: "v1", allowedErrorTags: ["FORM_AM","FORM_IS","ARTICLE_USAGE","INSTRUCTION_FOLLOWING","DIALOGUE_CONSTRUCTION"] });
  assert.equal(result.status, "REVIEW_REQUIRED");
  assert.equal(result.reason, "DUPLICATE_DIAGNOSTIC_ID");
});
